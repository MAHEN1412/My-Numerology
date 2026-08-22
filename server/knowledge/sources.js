/**
 * SOURCE METADATA
 * ===============
 * Every knowledge record cites where its content comes from. Interpretation
 * text throughout this app is original — written for this application, not
 * copied from any book or site. Historical sources are cited to show the
 * tradition an interpretation draws from, not as a claim of verbatim
 * reproduction.
 */

const SOURCES = {
  original: {
    title: 'Original interpretation created for this application',
    author: null,
    year: null,
    url: null,
    license: 'All rights reserved by this application',
    sourceType: 'original',
  },
  taylor1926: {
    title: 'Numerology Made Plain: The Science of Names and Numbers and the Law of Vibration',
    author: 'Ariel Yvon Taylor',
    year: 1926,
    url: 'https://www.loc.gov/item/26014441/',
    license: 'Public domain (US) \u2014 confirmed by the Library of Congress',
    sourceType: 'public_domain_historical_reference',
    note: 'Cited as a historical reference for the traditional practice this interpretation draws from. No text from this book is reproduced.',
  },
  wikipedia: {
    title: 'Wikipedia',
    author: 'Wikipedia contributors',
    year: null,
    url: 'https://en.wikipedia.org',
    license: 'CC BY-SA 4.0',
    sourceType: 'open_license_reference',
    note: 'Short attributed extracts only, with links to full articles \u2014 see the Reference Library section.',
  },
  jcChaudhry: {
    title: 'Psychic Number 9 & Destiny Number 9 \u2014 Number Compatibility',
    author: 'Dr. J.C. Chaudhry',
    year: null,
    url: 'https://www.jcchaudhry.com/psychic-number-9-numerology',
    license: 'External reference \u2014 named and linked only, no content reproduced',
    sourceType: 'external_practitioner_reference',
    note: 'Cited to show this app\u2019s compatible-number table is consistent with a named practitioner\u2019s independently published table, not copied from it.',
  },
  astroMedha: {
    title: 'Number 1 and 9 Compatibility',
    author: 'AstroMedha',
    year: null,
    url: 'https://astromedha.in/insights/numerology/number-1-and-9-compatibility',
    license: 'External reference \u2014 named and linked only, no content reproduced',
    sourceType: 'external_practitioner_reference',
    note: 'Cited to show this app\u2019s compatible-number table is consistent with a named practitioner\u2019s independently published table, not copied from it.',
  },
  dineshAtrish: {
    title: 'How to Find a Lucky Mobile Number Using Numerology',
    author: 'Dinesh Atrish',
    year: null,
    url: 'https://www.dineshatrish.com/how-to-find-a-lucky-mobile-number/',
    license: 'External reference \u2014 named and linked only, no content reproduced',
    sourceType: 'external_practitioner_reference',
    note: 'Cited to show this app\u2019s compatible-number table is consistent with a named practitioner\u2019s independently published table, not copied from it.',
  },
};

/**
 * Corroborating external sources for SPECIFIC compatible-number pairs.
 * Deliberately narrow: only includes pairs that were actually checked
 * against real, named, independent practitioner sources (see the
 * conversation history this was built from) -- not a blanket claim that
 * every entry in compatibleNumbers has been externally verified. Extend
 * this only when a pair has genuinely been checked, not by default.
 */
const CORROBORATED_PAIRS = {
  '1-9': ['jcChaudhry', 'astroMedha', 'dineshAtrish'],
  '1-2': ['dineshAtrish'],
};

function getCorroboratingSources(a, b) {
  const key = [a, b].sort((x, y) => x - y).join('-');
  const sourceKeys = CORROBORATED_PAIRS[key];
  if (!sourceKeys) return null;
  return sourceKeys.map((k) => SOURCES[k]);
}

module.exports = { SOURCES, getCorroboratingSources };
