/**
 * TERMINOLOGY DICTIONARY -- Phase 1 & 2 of the multi-book terminology
 * preservation system.
 *
 * This is a STARTER, manually-curated list of numerology terms known to
 * appear across different authors/traditions. It exists so the search
 * system can look for each EXACT term literally, rather than the older
 * approach (still used elsewhere in this app) of grouping terms like
 * "Driver Number" / "Mulank" / "Birth Number" together as assumed
 * synonyms.
 *
 * CRITICAL: alternative_terms below are NOT claimed to be equivalent.
 * They're other terms that MIGHT describe a related concept in some
 * traditions -- the equivalence_status field says so explicitly, and nothing
 * in the search code merges results across these terms unless a specific
 * book's own text establishes the connection.
 *
 * This is deliberately NOT auto-populated by scanning book text --
 * per the phased plan's own instruction ("Do not retag the entire library
 * initially"), this is a hand-curated starting set covering the terms
 * explicitly named in the spec documents. It can be extended over time
 * as more terms are identified in the uploaded books.
 */

const TERMINOLOGY_DICTIONARY = [
  {
    id: 'mulank',
    original_term: 'Mulank',
    original_language: 'Hindi/Sanskrit',
    transliteration: 'Mulank',
    language_term: '\u092e\u0942\u0932\u093e\u0902\u0915',
    system: 'Indian Numerology',
    alternative_terms: ['Birth Number', 'Psychic Number', 'Driver Number', 'Janmaank'],
    normalized_concept: 'BIRTH_NUMBER',
    equivalence_status: 'Potentially related; verify by source',
    confidence: 'high',
  },
  {
    id: 'bhagyank',
    original_term: 'Bhagyank',
    original_language: 'Hindi/Sanskrit',
    transliteration: 'Bhagyank',
    language_term: '\u092d\u093e\u0917\u094d\u092f\u093e\u0902\u0915',
    system: 'Indian Numerology',
    alternative_terms: ['Destiny Number', 'Life Path', 'Conductor Number', 'Life Number'],
    normalized_concept: 'DOB_DESTINY',
    equivalence_status: 'Potentially related; verify by source',
    confidence: 'medium',
  },
  { id: 'driver-number', original_term: 'Driver Number', original_language: 'English', system: 'Not explicitly stated', alternative_terms: ['Mulank', 'Birth Number', 'Psychic Number'], normalized_concept: 'BIRTH_NUMBER', equivalence_status: 'Potentially related; verify by source', confidence: 'medium' },
  { id: 'conductor-number', original_term: 'Conductor Number', original_language: 'English', system: 'Not explicitly stated', alternative_terms: ['Bhagyank', 'Destiny Number', 'Life Path'], normalized_concept: 'DOB_DESTINY', equivalence_status: 'Potentially related; verify by source', confidence: 'medium' },
  { id: 'life-path', original_term: 'Life Path', original_language: 'English', system: 'Western Numerology', alternative_terms: ['Bhagyank', 'Conductor Number', 'Destiny'], normalized_concept: 'DOB_DESTINY', equivalence_status: 'Potentially related; verify by source', confidence: 'low' },
  { id: 'destiny-number', original_term: 'Destiny Number', original_language: 'English', system: 'Western Numerology', alternative_terms: ['Bhagyank', 'Life Path', 'Expression Number'], normalized_concept: 'DOB_DESTINY', equivalence_status: 'Potentially related; verify by source', confidence: 'low' },
  { id: 'expression-number', original_term: 'Expression Number', original_language: 'English', system: 'Western Numerology', alternative_terms: ['Destiny Number', 'Name Number'], normalized_concept: 'NAME_EXPRESSION', equivalence_status: 'Potentially related; verify by source', confidence: 'medium' },
  { id: 'name-number', original_term: 'Name Number', original_language: 'English', system: 'Not explicitly stated', alternative_terms: ['Expression Number'], normalized_concept: 'NAME_EXPRESSION', equivalence_status: 'Potentially related; verify by source', confidence: 'medium' },
  { id: 'psychic-number', original_term: 'Psychic Number', original_language: 'English', system: 'Indian Numerology', alternative_terms: ['Mulank', 'Driver Number', 'Birth Number'], normalized_concept: 'BIRTH_NUMBER', equivalence_status: 'Potentially related; verify by source', confidence: 'medium' },
  { id: 'birth-number', original_term: 'Birth Number', original_language: 'English', system: 'Not explicitly stated', alternative_terms: ['Mulank', 'Psychic Number', 'Driver Number'], normalized_concept: 'BIRTH_NUMBER', equivalence_status: 'Potentially related; verify by source', confidence: 'medium' },
  { id: 'soul-urge', original_term: 'Soul Urge', original_language: 'English', system: 'Western Numerology', alternative_terms: ["Heart's Desire"], normalized_concept: 'SOUL_URGE', equivalence_status: 'Potentially related; verify by source', confidence: 'high' },
  { id: 'hearts-desire', original_term: "Heart's Desire", original_language: 'English', system: 'Western Numerology', alternative_terms: ['Soul Urge'], normalized_concept: 'SOUL_URGE', equivalence_status: 'Potentially related; verify by source', confidence: 'high' },
  { id: 'personality-number', original_term: 'Personality Number', original_language: 'English', system: 'Western Numerology', alternative_terms: [], normalized_concept: 'PERSONALITY', equivalence_status: 'Standalone term', confidence: 'n/a' },
  { id: 'birthday-number', original_term: 'Birthday Number', original_language: 'English', system: 'Western Numerology', alternative_terms: [], normalized_concept: 'BIRTHDAY', equivalence_status: 'Standalone term', confidence: 'n/a' },
  { id: 'karmic-debt', original_term: 'Karmic Debt', original_language: 'English', system: 'Western Numerology', alternative_terms: [], normalized_concept: 'KARMIC_DEBT', equivalence_status: 'Standalone term', confidence: 'n/a' },
  { id: 'pinnacle', original_term: 'Pinnacle', original_language: 'English', system: 'Western Numerology', alternative_terms: [], normalized_concept: 'PINNACLE', equivalence_status: 'Standalone term', confidence: 'n/a' },
  { id: 'challenge-number', original_term: 'Challenge', original_language: 'English', system: 'Western Numerology', alternative_terms: [], normalized_concept: 'CHALLENGE', equivalence_status: 'Standalone term', confidence: 'n/a' },
  { id: 'personal-year', original_term: 'Personal Year', original_language: 'English', system: 'Western Numerology', alternative_terms: [], normalized_concept: 'PERSONAL_YEAR', equivalence_status: 'Standalone term', confidence: 'n/a' },
  { id: 'janmaank', original_term: 'Janmaank', original_language: 'Hindi/Sanskrit', transliteration: 'Janmaank', language_term: '\u091c\u0928\u094d\u092e\u093e\u0902\u0915', system: 'Indian Numerology', alternative_terms: ['Mulank', 'Birth Number'], normalized_concept: 'BIRTH_NUMBER', equivalence_status: 'Potentially related; verify by source', confidence: 'medium' },
];

function getTerminologyDictionary() {
  return TERMINOLOGY_DICTIONARY;
}

function findTermEntry(termId) {
  return TERMINOLOGY_DICTIONARY.find((t) => t.id === termId) || null;
}

module.exports = { TERMINOLOGY_DICTIONARY, getTerminologyDictionary, findTermEntry };
