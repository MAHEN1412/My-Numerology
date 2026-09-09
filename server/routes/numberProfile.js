const express = require('express');
const { loadNumberProfile, getCompoundEntry } = require('../knowledge/bookDataLoader');

const router = express.Router();

// GET /api/number-profile/compound/:day — compound-number gloss for a
// two-digit birth date (10-31). Placed before /:num so Express doesn't
// try to parse "compound" as a number.
router.get('/compound/:day', (req, res) => {
  const day = Number(req.params.day);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return res.status(400).json({ error: 'Day must be between 1 and 31.' });
  }
  const entry = getCompoundEntry(day);
  if (!entry) {
    return res.json({ day, applicable: false, entry: null });
  }
  res.json({ day, applicable: true, entry });
});

// GET /api/number-profile/:num — full reference profile for a single
// number 1-9 (introduction, psychic/destiny sections, deity, mantra,
// yantra, health, relationships to every other number, and image paths).
router.get('/:num', (req, res) => {
  const num = Number(req.params.num);
  if (!Number.isInteger(num) || num < 1 || num > 9) {
    return res.status(400).json({ error: 'Number must be between 1 and 9.' });
  }
  const profile = loadNumberProfile(num);
  if (!profile) {
    return res.status(404).json({ error: 'No profile data found for this number.' });
  }
  res.json({ profile });
});

module.exports = router;
