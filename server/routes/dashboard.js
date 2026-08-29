const express = require('express');
const SavedProfile = require('../models/SavedProfile');
const { requireAdmin } = require('../utils/adminAuth');
const calc = require('../utils/calculationEngine');
const { buildInterpretationReport } = require('../knowledge/interpretationEngine');
const { buildNumbersAnalysis, buildColorProfile } = require('../knowledge/colorEngine');
const { buildCrystalCompatibility } = require('../knowledge/crystalEngine');
const { buildBookInsights } = require('../knowledge/bookSearch');
const { buildResultObject } = require('./readings');

const router = express.Router();

// POST /api/dashboard/save — save a profile snapshot (explicit action only)
router.post('/save', requireAdmin, async (req, res) => {
  try {
    const {
      name, phone, day, month, year, system, tabSource, driverNumber, conductorNumber, nameNumber, kuaNumber,
      crystalSuggestion, matchScore, autoSummary, userNotes, status, gender,
      correctedNameSuggestion, mobileNumberChecked, mobileAnalysisLabel,
      businessNameChecked, businessNameScore, genericNumberType, genericNumberValue,
      relationshipPersonBName, relationshipScore,
    } = req.body;

    if (!tabSource) return res.status(400).json({ error: 'Missing tab source.' });

    const profile = await SavedProfile.create({
      name: name || '',
      phone: phone || '',
      day: day || undefined,
      month: month || undefined,
      year: year || undefined,
      system: system === 'pythagorean' ? 'pythagorean' : 'chaldean',
      tabSource,
      status: ['Active', 'Review', 'Completed', 'Follow-up'].includes(status) ? status : 'Active',
      gender: ['Male', 'Female'].includes(gender) ? gender : undefined,
      driverNumber: driverNumber ?? undefined,
      conductorNumber: conductorNumber ?? undefined,
      nameNumber: nameNumber ?? undefined,
      kuaNumber: kuaNumber ?? undefined,
      crystalSuggestion: crystalSuggestion || '',
      matchScore: matchScore ?? undefined,
      correctedNameSuggestion: correctedNameSuggestion || '',
      mobileNumberChecked: mobileNumberChecked || '',
      mobileAnalysisLabel: mobileAnalysisLabel || '',
      businessNameChecked: businessNameChecked || '',
      businessNameScore: businessNameScore ?? undefined,
      genericNumberType: genericNumberType || '',
      genericNumberValue: genericNumberValue || '',
      relationshipPersonBName: relationshipPersonBName || '',
      relationshipScore: relationshipScore ?? undefined,
      autoSummary: autoSummary || '',
      userNotes: userNotes || '',
    });

    res.status(201).json({ profile });
  } catch (err) {
    console.error('Save profile failed:', err.message);
    res.status(500).json({ error: 'Could not save this profile right now.' });
  }
});

// GET /api/dashboard/list — all saved profiles, newest first
router.get('/list', requireAdmin, async (req, res) => {
  try {
    const profiles = await SavedProfile.find().sort({ createdAt: -1 });
    res.json({ profiles });
  } catch (err) {
    console.error('List profiles failed:', err.message);
    res.status(500).json({ error: 'Could not load saved profiles right now.' });
  }
});

// PUT /api/dashboard/:id — edit user notes and/or status (everything else is a historical record)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { userNotes, status, correctedNameSuggestion, name, phone, day, month, year, crystalSuggestion, gender } = req.body;
    const existing = await SavedProfile.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Profile not found.' });

    const update = { updatedAt: new Date() };
    if (userNotes !== undefined) update.userNotes = userNotes || '';
    if (status !== undefined && ['Active', 'Review', 'Completed', 'Follow-up'].includes(status)) update.status = status;
    if (correctedNameSuggestion !== undefined) update.correctedNameSuggestion = correctedNameSuggestion || '';
    if (name !== undefined) update.name = String(name).trim();
    if (phone !== undefined) update.phone = String(phone).trim();
    if (day !== undefined) update.day = Number(day);
    if (month !== undefined) update.month = Number(month);
    if (year !== undefined) update.year = Number(year);
    if (crystalSuggestion !== undefined) update.crystalSuggestion = String(crystalSuggestion).trim();
    if (gender !== undefined) {
      if (!['Male', 'Female'].includes(gender)) return res.status(400).json({ error: 'Gender must be Male or Female.' });
      update.gender = gender;
    }

    // If the DOB or name actually changed, the previously-stored
    // Driver/Conductor/Name numbers would otherwise go stale -- recompute
    // them from the (possibly new) values so the saved case stays
    // internally consistent with what it now says.
    const dobChanged = day !== undefined || month !== undefined || year !== undefined;
    const nameChanged = name !== undefined;
    if (dobChanged || nameChanged) {
      const finalDay = update.day ?? existing.day;
      const finalMonth = update.month ?? existing.month;
      const finalYear = update.year ?? existing.year;
      const finalName = update.name !== undefined ? update.name : existing.name;
      if (finalDay && finalMonth && finalYear) {
        const driver = calc.calculateDriverNumber(finalDay);
        const conductor = calc.calculateConductorNumber(finalDay, finalMonth, finalYear);
        update.driverNumber = driver.value;
        update.conductorNumber = conductor.value;
        if (finalName) {
          const nameNum = calc.calculateNameNumber(finalName, existing.system || 'chaldean');
          update.nameNumber = nameNum ? nameNum.value : undefined;
        }
      }
    }

    const profile = await SavedProfile.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ profile });
  } catch (err) {
    console.error('Case update failed:', err.message);
    res.status(400).json({ error: 'Could not update this profile.' });
  }
});

// DELETE /api/dashboard/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const profile = await SavedProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: 'Could not delete this profile.' });
  }
});

// GET /api/dashboard/common-numbers — simple frequency analysis across all saved profiles
router.get('/common-numbers', requireAdmin, async (req, res) => {
  try {
    const profiles = await SavedProfile.find().select('driverNumber conductorNumber nameNumber');
    const tally = (field) => {
      const counts = {};
      profiles.forEach((p) => {
        const v = p[field];
        if (v !== undefined && v !== null) counts[v] = (counts[v] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([number, count]) => ({ number: Number(number), count }))
        .sort((a, b) => b.count - a.count);
    };

    res.json({
      totalProfiles: profiles.length,
      driverNumbers: tally('driverNumber'),
      conductorNumbers: tally('conductorNumber'),
      nameNumbers: tally('nameNumber'),
    });
  } catch (err) {
    console.error('Common numbers analysis failed:', err.message);
    res.status(500).json({ error: 'Could not analyze saved profiles right now.' });
  }
});

// GET /api/dashboard/kpis — case counts by source tool and status, for the KPI cards
router.get('/kpis', requireAdmin, async (req, res) => {
  try {
    const profiles = await SavedProfile.find().select('tabSource status crystalSuggestion name day month year matchScore');

    const totalCases = profiles.length;
    // "DOB Matching": DOB-only cases, no name given
    const dobMatching = profiles.filter((p) => p.day && p.month && p.year && !p.name).length;
    // "Name + DOB": both a name and a DOB recorded together
    const nameDobMatching = profiles.filter((p) => p.name && p.day && p.month && p.year).length;
    // "Mobile + DOB": saved specifically from the Mobile Compatibility tool (inherently phone+DOB)
    const mobileDobMatching = profiles.filter((p) => p.tabSource === 'mobile').length;

    let crystalSuggestions = 0;
    const byStatus = {};
    profiles.forEach((p) => {
      if (p.crystalSuggestion) crystalSuggestions += 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    });

    // Compatibility Overview: average matchScore per category, only where
    // that data genuinely exists -- null (not 0) when there's nothing to
    // average yet, so the frontend can show "No data" honestly instead of
    // a fabricated 0%.
    const avgMatch = (filterFn) => {
      const withScore = profiles.filter((p) => filterFn(p) && typeof p.matchScore === 'number');
      if (withScore.length === 0) return null;
      return Math.round(withScore.reduce((sum, p) => sum + p.matchScore, 0) / withScore.length);
    };
    const allWithScore = profiles.filter((p) => typeof p.matchScore === 'number');
    const overallMatch = allWithScore.length === 0 ? null : Math.round(allWithScore.reduce((sum, p) => sum + p.matchScore, 0) / allWithScore.length);

    res.json({
      totalCases,
      dobMatching,
      nameDobMatching,
      mobileDobMatching,
      crystalSuggestions,
      byStatus,
      compatibilityOverview: {
        dobDob: avgMatch((p) => p.tabSource === 'relationship'),
        nameDob: avgMatch((p) => p.tabSource === 'lo-shu' && p.name),
        mobileDob: avgMatch((p) => p.tabSource === 'mobile'),
        nameMobile: null, // no tool currently computes this specific comparison -- honestly null, not fabricated
        overall: overallMatch,
      },
    });
  } catch (err) {
    console.error('KPI calculation failed:', err.message);
    res.status(500).json({ error: 'Could not calculate KPIs right now.' });
  }
});

// GET /api/dashboard/:id/report-data
// Assembles the full structured report object for the professional PDF --
// reuses buildResultObject (the same function powering the live calculator)
// for both the original name and, if one was saved, the corrected name --
// so the "before vs after" comparison is two REAL independent calculations,
// never a copy or an invented diff.
router.get('/:id/report-data', requireAdmin, async (req, res) => {
  try {
    const profile = await SavedProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Case not found.' });
    if (!profile.day || !profile.month || !profile.year) {
      return res.status(400).json({ error: 'This case has no date of birth on file, so a report cannot be generated.' });
    }

    const system = profile.system || 'chaldean';
    const original = buildResultObject({ name: profile.name || null, day: profile.day, month: profile.month, year: profile.year, system });

    let corrected = null;
    if (profile.correctedNameSuggestion) {
      corrected = buildResultObject({ name: profile.correctedNameSuggestion, day: profile.day, month: profile.month, year: profile.year, system });
    }

    const crystalCompatibility = buildCrystalCompatibility({
      driver: original.driverNumber.value,
      conductor: original.conductorNumber.value,
      nameNumber: original.nameNumber ? original.nameNumber.value : null,
      loshuMissing: original.loShuGrid.missing,
    });

    let bookInsights = [];
    try {
      bookInsights = await buildBookInsights({
        driver: original.driverNumber.value, conductor: original.conductorNumber.value,
        missing: original.loShuGrid.missing, repeated: original.loShuGrid.repeated,
        nameNumber: original.nameNumber ? original.nameNumber.value : null,
      }, null);
    } catch (e) { /* book insights are a bonus section, not critical to the report */ }

    res.json({
      client: { name: profile.name || 'Unnamed client', phone: profile.phone || null, day: profile.day, month: profile.month, year: profile.year, system },
      reportDate: new Date().toISOString(),
      original,
      corrected,
      crystalCompatibility,
      bookInsights: bookInsights.filter((t) => t.sourceCount > 0 && !t.isCombination),
      caseStatus: profile.status,
      caseNotes: profile.userNotes || '',
    });
  } catch (err) {
    console.error('Report data generation failed:', err.message);
    res.status(500).json({ error: 'Could not generate the report right now.' });
  }
});

module.exports = router;
