const express = require('express');
const SavedProfile = require('../models/SavedProfile');
const { requireAdmin } = require('../utils/adminAuth');

const router = express.Router();

// POST /api/dashboard/save — save a profile snapshot (explicit action only)
router.post('/save', requireAdmin, async (req, res) => {
  try {
    const { name, phone, day, month, year, system, tabSource, driverNumber, conductorNumber, nameNumber, crystalSuggestion, matchScore, autoSummary, userNotes, status } = req.body;

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
    const profiles = await SavedProfile.find().select('tabSource status crystalSuggestion');
    const bySource = {};
    let crystalSuggestions = 0;
    profiles.forEach((p) => {
      bySource[p.tabSource] = (bySource[p.tabSource] || 0) + 1;
      if (p.crystalSuggestion) crystalSuggestions += 1;
    });
    const byStatus = {};
    profiles.forEach((p) => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });

    res.json({
      totalCases: profiles.length,
      bySource,
      byStatus,
      crystalSuggestions,
    });
  } catch (err) {
    console.error('KPI calculation failed:', err.message);
    res.status(500).json({ error: 'Could not calculate KPIs right now.' });
  }
});

module.exports = router;
