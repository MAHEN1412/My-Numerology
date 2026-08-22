const express = require('express');
const calc = require('../utils/calculationEngine');
const { NUMBER_TYPES, isValidNumberType, isValidForType, analyzeGenericNumber } = require('../knowledge/genericNumberEngine');

const router = express.Router();

function isValidCalendarDate(d, m, y) {
  if (!d || !m || !y) return false;
  if (m < 1 || m > 12) return false;
  if (y < 1000 || y > 9999) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

// GET /api/numbers/types — list supported number types (for the frontend dropdown)
router.get('/types', (req, res) => {
  res.json({ types: NUMBER_TYPES });
});

// POST /api/numbers/analyze — analyze a bank account/house/vehicle number
router.post('/analyze', (req, res) => {
  try {
    const { day, month, year, name, system, value, type } = req.body;
    const d = Number(day), m = Number(month), y = Number(year);

    if (!isValidCalendarDate(d, m, y)) {
      return res.status(400).json({ error: 'Please enter a valid date of birth.' });
    }
    if (!isValidNumberType(type)) {
      return res.status(400).json({ error: `Number type must be one of: ${Object.keys(NUMBER_TYPES).join(', ')}` });
    }
    if (!value || !isValidForType(value, type)) {
      return res.status(400).json({ error: `Enter a valid ${NUMBER_TYPES[type].label.toLowerCase()}.` });
    }

    const cleanSystem = system === 'pythagorean' ? 'pythagorean' : 'chaldean';
    const driverNumber = calc.calculateDriverNumber(d).value;
    const conductorNumber = calc.calculateConductorNumber(d, m, y).value;
    const nameNumber = name ? calc.calculateNameNumber(name, cleanSystem).value : null;

    const result = analyzeGenericNumber(value, type, { driver: driverNumber, conductor: conductorNumber, nameNumber });

    res.json({
      coreNumbers: { driverNumber, conductorNumber, nameNumber },
      result,
    });
  } catch (err) {
    console.error('Number analyze failed:', err.message);
    res.status(500).json({ error: 'Could not analyze this number right now.' });
  }
});

module.exports = router;
