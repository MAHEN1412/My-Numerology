const express = require('express');
const ActorProfile = require('../models/ActorProfile');
const calc = require('../utils/calculationEngine');
const { requireAdmin } = require('../utils/adminAuth');

const router = express.Router();

// GET /api/actors?category=Tollywood&gender=Actress&search=priya&trendingOnly=true&limit=20
// GET /api/actors/categories -- distinct categories actually in use, so
// the frontend's filter chips and Add form reflect reality instead of a
// hardcoded list that can't grow.
router.get('/categories', async (req, res) => {
  try {
    const inUse = await ActorProfile.distinct('category');
    const defaults = ['Bollywood', 'Tollywood', 'Tamil', 'Malayalam', 'Kannada'];
    const all = Array.from(new Set([...defaults, ...inUse])).sort();
    res.json({ categories: all });
  } catch (err) {
    res.status(500).json({ error: 'Could not load categories.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category, gender, search, trendingOnly, limit } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (gender) filter.gender = gender;
    if (trendingOnly === 'true') filter.trending = true;
    if (search) filter.name = { $regex: search.trim(), $options: 'i' };

    const cap = Math.min(Math.max(Number(limit) || 24, 1), 200);
    const actors = await ActorProfile.find(filter).sort({ name: 1 }).limit(cap);

    const withNumerology = actors.map((a) => {
      const driver = calc.calculateDriverNumber(a.day);
      const conductor = calc.calculateConductorNumber(a.day, a.month, a.year);
      return {
        _id: a._id, name: a.name, day: a.day, month: a.month, year: a.year,
        category: a.category, gender: a.gender, trending: a.trending,
        driverNumber: driver.value, conductorNumber: conductor.value,
      };
    });

    res.json({ actors: withNumerology });
  } catch (err) {
    console.error('Actors list failed:', err.message);
    res.status(500).json({ error: 'Could not load actors right now.' });
  }
});

// GET /api/actors/:id/loshu -- full Lo Shu grid for one actor, computed live
// GET /api/actors/match?day=X&month=Y&year=Z
// Finds public figures who share either the EXACT same date of birth, or
// the same Lo Shu grid pattern (identical digit counts across all 9
// positions -- many different birth dates can share one pattern, since
// Lo Shu depends on which digits appear and how often, not the date
// itself). Both are real, computed comparisons -- never a fuzzy or
// invented "similarity" score.
// GET /api/actors/todays-birthdays
// Anyone in the actors database whose day+month matches today's calendar
// date (any birth year) -- your own curated list, likely far better
// Indian-celebrity coverage than a general-purpose external feed.
router.get('/todays-birthdays', async (req, res) => {
  try {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;

    const matches = await ActorProfile.find({ day, month });
    const withNumerology = matches.map((a) => {
      const driver = calc.calculateDriverNumber(a.day);
      const conductor = calc.calculateConductorNumber(a.day, a.month, a.year);
      return {
        _id: a._id, name: a.name, day: a.day, month: a.month, year: a.year,
        category: a.category, gender: a.gender,
        driverNumber: driver.value, conductorNumber: conductor.value,
      };
    });

    res.json({ day, month, people: withNumerology });
  } catch (err) {
    console.error('Actors todays-birthdays failed:', err.message);
    res.status(500).json({ error: 'Could not check today\'s birthdays right now.' });
  }
});

router.get('/match', async (req, res) => {
  try {
    const day = Number(req.query.day);
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!day || !month || !year) return res.status(400).json({ error: 'day, month, and year are required.' });

    const clientGrid = calc.generateLoShuGrid(day, month, year, {});
    const clientPattern = Array.from({ length: 9 }, (_, i) => clientGrid[i + 1] || 0).join(',');

    const allActors = await ActorProfile.find({});

    const exactDobMatches = [];
    const loShuPatternMatches = [];

    for (const a of allActors) {
      const isExactDob = a.day === day && a.month === month && a.year === year;
      const actorGrid = calc.generateLoShuGrid(a.day, a.month, a.year, {});
      const actorPattern = Array.from({ length: 9 }, (_, i) => actorGrid[i + 1] || 0).join(',');
      const isPatternMatch = actorPattern === clientPattern;

      const summary = { _id: a._id, name: a.name, category: a.category, gender: a.gender, day: a.day, month: a.month, year: a.year };
      if (isExactDob) exactDobMatches.push(summary);
      else if (isPatternMatch) loShuPatternMatches.push(summary); // don't double-list an exact match in both
    }

    res.json({ exactDobMatches, loShuPatternMatches });
  } catch (err) {
    console.error('Actor match failed:', err.message);
    res.status(500).json({ error: 'Could not check for matches right now.' });
  }
});

router.get('/:id/loshu', async (req, res) => {
  try {
    const a = await ActorProfile.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Actor not found.' });
    const counts = calc.generateLoShuGrid(a.day, a.month, a.year, {});
    res.json({
      name: a.name, day: a.day, month: a.month, year: a.year,
      loShuGrid: {
        layout: calc.LOSHU_LAYOUT, counts,
        present: calc.getPresentNumbers(counts), missing: calc.getMissingNumbers(counts), repeated: calc.getRepeatedNumbers(counts),
      },
    });
  } catch (err) {
    res.status(400).json({ error: 'Could not calculate this Lo Shu grid.' });
  }
});

// POST /api/actors/bulk-import
// body: { actors: [{ name, day, month, year, category, gender, trending? }, ...] }
// Skips duplicates (same name + DOB already on file) rather than erroring the whole batch.
//
// Batched deliberately: the original version did one findOne + one create
// PER actor (2 sequential DB round-trips each), which for a 300-person
// list meant 600 sequential round-trips -- easily enough to exceed a
// platform request timeout and fail with a generic network error before
// ever reaching a clean response. This version does the existence check
// as ONE query for the whole batch, and the actual writes as ONE bulk
// insert, regardless of how many actors are submitted.
router.post('/bulk-import', requireAdmin, async (req, res) => {
  try {
    const { actors } = req.body;
    if (!Array.isArray(actors) || actors.length === 0) {
      return res.status(400).json({ error: 'Provide a non-empty actors array.' });
    }

    const errors = [];
    const validated = [];

    for (const a of actors) {
      if (!a.name || !a.day || !a.month || !a.year || !a.category || !a.gender) {
        errors.push(`Skipped "${a.name || 'unnamed'}" -- missing required field.`);
        continue;
      }
      const category = String(a.category).trim();
      if (!category || category.length > 40) {
        errors.push(`Skipped "${a.name}" -- category must be 1-40 characters.`);
        continue;
      }
      if (!['Actor', 'Actress'].includes(a.gender)) {
        errors.push(`Skipped "${a.name}" -- invalid gender "${a.gender}".`);
        continue;
      }
      validated.push({
        name: a.name, day: a.day, month: a.month, year: a.year,
        category, gender: a.gender, trending: !!a.trending,
      });
    }

    let inserted = 0;
    let skipped = 0;

    if (validated.length > 0) {
      // One query for the whole batch's existing entries, instead of one
      // findOne per actor.
      const existing = await ActorProfile.find({
        $or: validated.map((a) => ({ name: a.name, day: a.day, month: a.month, year: a.year })),
      }).select('name day month year');
      const seenKeys = new Set(existing.map((e) => `${e.name}|${e.day}|${e.month}|${e.year}`));

      // Also dedupe WITHIN the incoming batch itself -- checking only
      // against pre-existing DB records isn't enough, since two identical
      // entries submitted in the same batch would both pass that check
      // (neither is in the database yet) and both get inserted.
      const toInsert = [];
      for (const a of validated) {
        const key = `${a.name}|${a.day}|${a.month}|${a.year}`;
        if (seenKeys.has(key)) { skipped++; continue; }
        seenKeys.add(key);
        toInsert.push(a);
      }

      if (toInsert.length > 0) {
        // One bulk insert instead of one create() per actor. ordered:false
        // so one bad document doesn't abort the whole batch.
        const result = await ActorProfile.insertMany(toInsert, { ordered: false });
        inserted = result.length;
      }
    }

    res.json({ inserted, skipped, errors });
  } catch (err) {
    console.error('Actors bulk import failed:', err.message);
    res.status(500).json({ error: 'Bulk import failed.' });
  }
});

// PUT /api/actors/:id -- edit an existing actor's details
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, day, month, year, category, gender, trending } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (day !== undefined) update.day = Number(day);
    if (month !== undefined) update.month = Number(month);
    if (year !== undefined) update.year = Number(year);
    if (category !== undefined) update.category = String(category).trim();
    if (gender !== undefined) {
      if (!['Actor', 'Actress'].includes(gender)) return res.status(400).json({ error: 'Gender must be Actor or Actress.' });
      update.gender = gender;
    }
    if (trending !== undefined) update.trending = !!trending;

    const actor = await ActorProfile.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!actor) return res.status(404).json({ error: 'Actor not found.' });
    res.json({ actor });
  } catch (err) {
    console.error('Actor edit failed:', err.message);
    res.status(400).json({ error: 'Could not update this actor.' });
  }
});

// DELETE /api/actors/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const actor = await ActorProfile.findByIdAndDelete(req.params.id);
    if (!actor) return res.status(404).json({ error: 'Actor not found.' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: 'Could not delete this actor.' });
  }
});

module.exports = router;
