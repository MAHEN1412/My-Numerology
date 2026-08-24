const express = require('express');
const SavedProfile = require('../models/SavedProfile');
const { requireAdmin } = require('../utils/adminAuth');

const router = express.Router();

// POST /api/dashboard/save — save a profile snapshot (explicit action only)
router.post('/save', requireAdmin, async (req, res) => {
  try {
    const {
      name, phone, day, month, year, system, tabSource, driverNumber, conductorNumber, nameNumber,
      crystalSuggestion, matchScore, autoSummary, userNotes, status,
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
      driverNumber: driverNumber ?? undefined,
      conductorNumber: conductorNumber ?? undefined,
      nameNumber: nameNumber ?? undefined,
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
    const { userNotes, status } = req.body;
    const update = { updatedAt: new Date() };
    if (userNotes !== undefined) update.userNotes = userNotes || '';
    if (status !== undefined && ['Active', 'Review', 'Completed', 'Follow-up'].includes(status)) update.status = status;

    const profile = await SavedProfile.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ profile });
  } catch (err) {
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

module.exports = router;
