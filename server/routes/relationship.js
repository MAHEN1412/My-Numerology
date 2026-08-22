const express = require('express');
const calc = require('../utils/calculationEngine');
const { scoreRelationshipCompatibility } = require('../knowledge/relationshipEngine');

const router = express.Router();

function isValidCalendarDate(d, m, y) {
  if (!d || !m || !y) return false;
  if (m < 1 || m > 12) return false;
  if (y < 1000 || y > 9999) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

function computeProfile(label, day, month, year, name, system) {
  const d = Number(day), m = Number(month), y = Number(year);
  if (!isValidCalendarDate(d, m, y)) return null;
  const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
  return {
    label,
    driver: calc.calculateDriverNumber(d).value,
    conductor: calc.calculateConductorNumber(d, m, y).value,
    nameNumber: name ? calc.calculateNameNumber(name, cleanSystem).value : null,
  };
}

// POST /api/relationship/compare — compare two people's numerology profiles
router.post('/compare', (req, res) => {
  try {
    const { personA, personB } = req.body;
    if (!personA || !personB) {
      return res.status(400).json({ error: 'Both people\u2019s details are required.' });
    }

    const profileA = computeProfile(personA.label || 'Person A', personA.day, personA.month, personA.year, personA.name, personA.system);
    const profileB = computeProfile(personB.label || 'Person B', personB.day, personB.month, personB.year, personB.name, personB.system);

    if (!profileA) return res.status(400).json({ error: `Please enter a valid date of birth for ${personA.label || 'Person A'}.` });
    if (!profileB) return res.status(400).json({ error: `Please enter a valid date of birth for ${personB.label || 'Person B'}.` });

    const compatibility = scoreRelationshipCompatibility(profileA, profileB);

    res.json({ profileA, profileB, compatibility });
  } catch (err) {
    console.error('Relationship compare failed:', err.message);
    res.status(500).json({ error: 'Could not compare these profiles right now.' });
  }
});

module.exports = router;
