/**
 * 37-STONE CRYSTAL DATABASE
 * =========================
 * Canonical record for each stone. Centralized here so the scoring engine
 * (crystalEngineV2.js) and any UI component reference the SAME data -- no
 * per-component hard-coded crystal lists.
 *
 * DATA-INTEGRITY NOTE (read before editing):
 * Two layers of data exist here, both honestly labeled:
 *
 * 1. Original data: numberAssociations that just say "Existing app data
 *    (numberKnowledge.js primary/supporting crystal fields)" -- carried
 *    over from this app's older per-number data, with no independent
 *    web research behind them.
 *
 * 2. 2026 crystal-consensus research pass: numberAssociations with a
 *    `sources` array and an `evidenceTier` were added by checking real,
 *    named websites (Ratnakripa, Navratan, Solacely, Astrology Answers,
 *    Satvik Gems) for what each one actually recommends for Numbers 1-9,
 *    counting how many independent sites agree, and EXCLUDING traditional
 *    Jyotish gemstones (Ruby, Pearl, Yellow/Blue Sapphire, Red Coral,
 *    Hessonite, Cat's Eye, Diamond) even when a site listed one as the
 *    "main" recommendation -- those are gemstone recommendations, not
 *    crystal ones, and are deliberately not carried over.
 *
 *    This pass only covers Driver/Conductor Numbers 1-9 (both use the same
 *    1-9 number system, so one pass covers both). It does NOT yet cover
 *    zodiac signs, Rashi, birth month, specific Driver+Conductor
 *    combinations, or stated intentions (money, love, protection, etc.) --
 *    those would need their own research passes.
 *
 *    Two existing associations were REMOVED by this pass because they
 *    were traditional Jyotish gemstones miscategorized as crystals:
 *    Blue Sapphire (was "primary" for Number 8) and Pearl (was
 *    "supporting" for Number 2). See their sourceNotes below.
 *
 * Per-crystal planetary and purpose associations are still NOT included
 * as a separate field -- no authoritative per-crystal source for either
 * exists in this project (only per-NUMBER planetary/purpose data exists,
 * which is a different thing). The scoring engine reflects this honestly
 * by giving those dimensions zero weight rather than fabricating
 * crystal-level planet/purpose mappings.
 */

const CRYSTAL_37 = [
  { id: 'agate', name: 'Agate', aliases: [], materialType: 'Chalcedony', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data.' },
  { id: 'amazonite', name: 'Amazonite', aliases: [], materialType: 'Feldspar', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data.' },
  {
    id: 'amethyst', name: 'Amethyst', aliases: [], materialType: 'Quartz', active: true,
    numberAssociations: [
      { number: 3, role: 'supporting', source: '2026 research: 2 of 4 sources checked (Satvik Gems, Solacely). Sunstone/Amazonite lead this number.', sources: ['Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Solacely, "Crystals for Destiny Number 3" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-3'], evidenceTier: 'B' },
      { number: 5, role: 'supporting', source: '2026 research: 2 of 4 sources (Ratnakripa, Satvik Gems); ties with Aquamarine as most-ranked pick.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025 | Mulank/Birth Number Crystal" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/'], evidenceTier: 'B' },
      { number: 7, role: 'primary', source: '2026 research: 3 independent sources agree (Astrology Answers, Navratan, Solacely), all ranking it #1. Strongest single-number consensus found in this pass.', sources: ['Astrology Answers, "The Connection Between Numerology & Crystals" — https://www.astrologyanswers.com/article/numerology-the-crystal-connection/', 'Navratan, "Lucky Gemstones For Number 7 In Numerology" — https://www.navratan.com/blog/lucky-gemstones-for-number-7-in-numerology', 'Solacely, "Crystals For Life Path Number 7" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-life-path-number-7'], evidenceTier: 'A' },
      { number: 9, role: 'primary', source: '2026 research: 3 independent sources agree (Satvik Gems, Navratan, Solacely), though ranked lower (#4) where a rank was given. Genuine conflict with Rose Quartz (a dedicated Astrology Answers source) and Bloodstone/Red Jasper (Mars-themed).', sources: ['Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Navratan, "Which Stone Is Lucky For Number 9?" — https://www.navratan.com/blog/lucky-stones-for-number-9', 'Solacely, "Crystals for Destiny Number 9" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-9'], evidenceTier: 'A' },
    ],
    sourceNotes: 'Number 7 association predates this file (supportingCrystals in numberKnowledge.js) and is now upgraded to primary with real citations; Numbers 3, 5 and 9 associations are new from the 2026 research pass.',
  },
  { id: 'apatite', name: 'Apatite', aliases: ['Blue Apatite'], materialType: 'Phosphate mineral', numberAssociations: [
    { number: 5, role: 'supporting', source: '2026 research: 1 source (Solacely, ranked #5 of 6) — minor mention, listed here for completeness.', sources: ['Solacely, "Crystals for Life Path Number 5" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-life-path-number-5'], evidenceTier: 'D' },
  ], active: true, sourceNotes: '2026 research pass: single-source mention for Number 5 (as "Blue Apatite").' },
  { id: 'aquamarine', name: 'Aquamarine', aliases: [], materialType: 'Beryl', numberAssociations: [
    { number: 5, role: 'primary', source: '2026 research: 2 sources (Astrology Answers, Solacely), both ranking it #1 for this number despite Citrine having broader source-count — a genuine disagreement, not resolved by source count alone.', sources: ['Astrology Answers, "The Connection Between Numerology & Crystals" — https://www.astrologyanswers.com/article/numerology-the-crystal-connection/', 'Solacely, "Crystals for Life Path Number 5" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-life-path-number-5'], evidenceTier: 'B' },
  ], active: true, sourceNotes: '2026 research pass: new association for Number 5.' },
  {
    id: 'aventurine', name: 'Aventurine', aliases: ['Green Aventurine'], materialType: 'Quartz', active: true,
    numberAssociations: [
      { number: 3, role: 'supporting', source: '2026 research: 2 sources (Satvik Gems, Solacely).', sources: ['Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Solacely, "Crystals for Destiny Number 3" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-3'], evidenceTier: 'B' },
      { number: 6, role: 'supporting', source: '2026 research: 2 sources (Navratan, Solacely); part of a 4-way tie for Number 6, no clear winner.', sources: ['Navratan, "Lucky Gemstones for Number 6 in Numerology" — https://www.navratan.com/blog/best-stones-for-numerology-number-6', 'Solacely, "Crystals for Destiny Number 6" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-6'], evidenceTier: 'B' },
    ],
    sourceNotes: 'Previously a single generic Number 5 supporting entry from numberKnowledge.js; that specific claim was NOT independently confirmed by the 2026 research pass (Green Aventurine was not among the strongest Number 5 sources found) and has been replaced with the two associations the new research actually supports (Numbers 3 and 6).',
  },
  { id: 'azurite', name: 'Azurite', aliases: [], materialType: 'Carbonate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data.' },
  {
    id: 'bloodstone', name: 'Bloodstone', aliases: [], materialType: 'Chalcedony', active: true,
    numberAssociations: [
      { number: 9, role: 'supporting', source: '2026 research: 1 source (Solacely), but ranked #1 there ("the crystal most often called lucky for Destiny 9") — part of a three-way split with Amethyst and Rose Quartz for this number.', sources: ['Solacely, "Crystals for Destiny Number 9" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-9'], evidenceTier: 'D' },
    ],
    sourceNotes: 'Existing supportingCrystals entry for Number 9 (numberKnowledge.js); confirmed (not contradicted) by the 2026 research pass, which found it top-ranked in one dedicated source but not the broadest cross-source pick (Amethyst).',
  },
  { id: 'blue-sapphire', name: 'Blue Sapphire', aliases: [], materialType: 'Corundum', numberAssociations: [], active: true, sourceNotes: '2026 crystal-consensus research pass: REMOVED as a "primary" Number 8 association. Blue Sapphire is the traditional Jyotish gemstone for Saturn/Number 8, not a crystal-healing recommendation, and this project’s crystal engine is explicitly crystals-only. Kept in the list (inactive from a numerology standpoint) rather than deleted, so the removal itself stays visible in the data.' },
  {
    id: 'carnelian', name: 'Carnelian', aliases: ['Red Carnelian'], materialType: 'Chalcedony', active: true,
    numberAssociations: [
      { number: 1, role: 'primary', source: '2026 research: 4 independent sources (Ratnakripa, Satvik Gems, Navratan, Solacely #2) — the broadest single-number consensus found for Number 1.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Navratan, "Lucky Stones For 1 Number In Numerology" — https://www.navratan.com/blog/lucky-stone-for-1-number-in-numerology', 'Solacely, "Crystals for Destiny Number 1" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-1'], evidenceTier: 'A' },
      { number: 3, role: 'supporting', source: '2026 research: 2 sources (Navratan, Solacely #2).', sources: ['Navratan, "Lucky Stones For Numerology Number 3" — https://www.navratan.com/blog/lucky-stones-for-numerology-number-3', 'Solacely, "Crystals for Destiny Number 3" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-3'], evidenceTier: 'B' },
    ],
    sourceNotes: '2026 research pass: new associations for Numbers 1 and 3.',
  },
  { id: 'cats-eye-stone', name: "Cat's Eye", aliases: [], materialType: 'Chrysoberyl (or quartz variant)', numberAssociations: [], active: true, sourceNotes: 'Kept out of the crystal-consensus pass on purpose: Cat’s Eye (Lehsunia) is the traditional Jyotish gemstone for Number 7 in every 2026 source that mentioned it, so it is excluded here under the crystals-only policy, same as Ruby, Pearl, the Sapphires, Red Coral, Hessonite and Diamond.' },
  { id: 'charoite', name: 'Charoite', aliases: [], materialType: 'Silicate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data.' },
  {
    id: 'citrine', name: 'Citrine', aliases: [], materialType: 'Quartz', active: true,
    numberAssociations: [
      { number: 1, role: 'supporting', source: '2026 research: 3 sources (Ratnakripa, Navratan, Solacely #1).', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Navratan, "Lucky Stones For 1 Number In Numerology" — https://www.navratan.com/blog/lucky-stone-for-1-number-in-numerology', 'Solacely, "Crystals for Destiny Number 1" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-1'], evidenceTier: 'A' },
      { number: 3, role: 'primary', source: '2026 research: 3 sources (Ratnakripa, Navratan, Solacely #1) — the top pick for Number 3.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Navratan, "Lucky Stones For Numerology Number 3" — https://www.navratan.com/blog/lucky-stones-for-numerology-number-3', 'Solacely, "Crystals for Destiny Number 3" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-3'], evidenceTier: 'A' },
      { number: 5, role: 'primary', source: '2026 research: 3 sources (Ratnakripa, Satvik Gems, Solacely #2) — broadest support for Number 5, though two other sources rank Aquamarine #1 instead. Genuine disagreement.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Solacely, "Crystals for Life Path Number 5" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-life-path-number-5'], evidenceTier: 'B' },
      { number: 8, role: 'supporting', source: '2026 research: 2 sources (Astrology Answers primary pick, Solacely #2); part of a 4-way tie for Number 8.', sources: ['Astrology Answers, "The Connection Between Numerology & Crystals" — https://www.astrologyanswers.com/article/numerology-the-crystal-connection/', 'Solacely, "Crystals for Destiny Number 8" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-8'], evidenceTier: 'B' },
    ],
    sourceNotes: 'Number 3 supporting association predates this file (numberKnowledge.js) and is upgraded to primary with citations; Numbers 1, 5 and 8 are new from the 2026 research pass.',
  },
  {
    id: 'clear-quartz', name: 'Clear Quartz', aliases: [], materialType: 'Quartz', active: true,
    numberAssociations: [
      { number: 7, role: 'supporting', source: '2026 research: 1 source (Solacely, ranked #3) — a minor pick behind Amethyst and Lapis Lazuli.', sources: ['Solacely, "Crystals For Life Path Number 7" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-life-path-number-7'], evidenceTier: 'D' },
    ],
    sourceNotes: '2026 research pass: new single-source association for Number 7.',
  },
  {
    id: 'hematite', name: 'Hematite', aliases: [], materialType: 'Iron oxide', active: true,
    numberAssociations: [
      { number: 4, role: 'supporting', source: '2026 research: 1 dedicated source (Solacely) but ranked #1 there ("the classic grounding stone for number 4"); Black Tourmaline has broader cross-source support for this number.', sources: ['Solacely, "Crystals for Destiny Number 4" — https://solacely.co/blogs/numerology/crystals-for-destiny-number-4'], evidenceTier: 'D' },
      { number: 8, role: 'supporting', source: '2026 research: 2 sources (Ratnakripa, Satvik Gems); part of a 4-way tie for Number 8.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/'], evidenceTier: 'B' },
    ],
    sourceNotes: 'Existing supportingCrystals entry for Number 8 (numberKnowledge.js), confirmed by the 2026 research pass; Number 4 is a new association from that pass.',
  },
  { id: 'howlite', name: 'Howlite', aliases: [], materialType: 'Borate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data. (2026 research pass found one single-source mention for Number 2 via Ratnakripa, too thin on its own to add as a scored association.)' },
  {
    id: 'jade', name: 'Jade', aliases: [], materialType: 'Jadeite/Nephrite', active: true,
    numberAssociations: [
      { number: 6, role: 'supporting', source: '2026 research: 2 sources (Navratan, Solacely #5); part of a 4-way tie for Number 6.', sources: ['Navratan, "Lucky Gemstones for Number 6 in Numerology" — https://www.navratan.com/blog/best-stones-for-numerology-number-6', 'Solacely, "Crystals for Destiny Number 6" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-6'], evidenceTier: 'B' },
    ],
    sourceNotes: '2026 research pass: new association for Number 6.',
  },
  { id: 'jasper', name: 'Jasper', aliases: ['Red Jasper'], materialType: 'Chalcedony', active: true, numberAssociations: [
    { number: 9, role: 'supporting', source: '2026 research: 2 sources referring to the red variety (Ratnakripa, Solacely #2).', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Solacely, "Crystals for Destiny Number 9" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-9'], evidenceTier: 'B' },
  ], sourceNotes: 'This app’s existing data had "Red Jasper" as a supporting crystal for Number 1, but the 2026 research pass did not independently confirm that specific pairing (Carnelian, Citrine and Garnet had far stronger support for Number 1) -- so it was not carried forward. The 2026 pass instead found real, independent support for Red Jasper on Number 9, recorded here.' },
  { id: 'labradorite', name: 'Labradorite', aliases: [], materialType: 'Feldspar', numberAssociations: [{ number: 7, role: 'supporting', source: 'Existing supportingCrystals entry for Number 7 (numberKnowledge.js). Confirmed by one 2026 source (Solacely) but only as a lower-ranked (#4) pick behind Amethyst and Lapis Lazuli.', sources: ['Solacely, "Crystals For Life Path Number 7" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-life-path-number-7'], evidenceTier: 'D' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 7 (numberKnowledge.js); evidence tier added by the 2026 research pass.' },
  {
    id: 'lapis-lazuli', name: 'Lapis Lazuli', aliases: [], materialType: 'Metamorphic rock', active: true,
    numberAssociations: [
      { number: 7, role: 'supporting', source: '2026 research: 2 sources (Navratan, Solacely #2).', sources: ['Navratan, "Lucky Gemstones For Number 7 In Numerology" — https://www.navratan.com/blog/lucky-gemstones-for-number-7-in-numerology', 'Solacely, "Crystals For Life Path Number 7" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-life-path-number-7'], evidenceTier: 'B' },
      { number: 9, role: 'supporting', source: '2026 research: 2 sources (Navratan, Solacely #5).', sources: ['Navratan, "Which Stone Is Lucky For Number 9?" — https://www.navratan.com/blog/lucky-stones-for-number-9', 'Solacely, "Crystals for Destiny Number 9" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-9'], evidenceTier: 'B' },
    ],
    sourceNotes: '2026 research pass: new associations for Numbers 7 and 9.',
  },
  { id: 'larimar', name: 'Larimar', aliases: [], materialType: 'Pectolite', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data.' },
  { id: 'malachite', name: 'Malachite', aliases: [], materialType: 'Carbonate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data. (2026 research pass found one single-source mention for Number 1 via Ratnakripa, too thin on its own to add as a scored association.)' },
  {
    id: 'moonstone', name: 'Moonstone', aliases: [], materialType: 'Feldspar', active: true,
    numberAssociations: [
      { number: 2, role: 'primary', source: '2026 research: 4 independent sources agree (Ratnakripa, Satvik Gems, Navratan, Solacely #1) — the broadest consensus found in this whole research pass.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Navratan, "Lucky Gemstones for Number 2 Numerology" — https://www.navratan.com/blog/numerology-number-2-lucky-stones', 'Solacely, "Crystals For Destiny Number 2" — https://global.solacely.co/blogs/numerology/crystals-for-destiny-number-2/'], evidenceTier: 'A' },
    ],
    sourceNotes: 'Existing primaryCrystal entry for Number 2 (Moon) (numberKnowledge.js); the 2026 research pass independently confirmed this as the single strongest-consensus association found across all nine numbers.',
  },
  { id: 'obsidian', name: 'Obsidian', aliases: ['Snowflake Obsidian'], materialType: 'Volcanic glass', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data. (2026 research pass found single-source mentions of Snowflake Obsidian for Numbers 1, 3 and 7 via Ratnakripa only -- one source each, too thin to add as scored associations; Obsidian also appears as one of six Number 8 picks in a single Solacely list.)' },
  { id: 'opalite', name: 'Opalite', aliases: [], materialType: 'Synthetic glass', numberAssociations: [], active: true, sourceNotes: 'This app’s existing data has "Opal" (a distinct natural gemstone) as a supporting crystal for Number 6 -- not merged with "Opalite" (a man-made glass product) since they are materially different. Not touched by the 2026 research pass, which found Opal for Number 6 offered specifically as a Jyotish substitute stone in the sources checked, and therefore excluded it under the crystals-only policy.' },
  { id: 'pearl', name: 'Pearl', aliases: [], materialType: 'Organic gem', numberAssociations: [], active: true, sourceNotes: '2026 crystal-consensus research pass: REMOVED as a "supporting" Number 2 association. Pearl is a traditional Jyotish gemstone for the Moon/Number 2 (and an organic gem, not a mineral crystal), consistently presented that way in the sources checked -- not a crystal-healing recommendation. Kept in the list rather than deleted so the removal stays visible in the data. Moonstone remains the strongly-confirmed Number 2 crystal.' },
  { id: 'pietersite', name: 'Pietersite', aliases: [], materialType: 'Chalcedony', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data.' },
  {
    id: 'pyrite', name: 'Pyrite', aliases: [], materialType: 'Iron sulfide', active: true,
    numberAssociations: [
      { number: 3, role: 'supporting', source: '2026 research: 2 sources (Ratnakripa, Navratan).', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Navratan, "Lucky Stones For Numerology Number 3" — https://www.navratan.com/blog/lucky-stones-for-numerology-number-3'], evidenceTier: 'B' },
      { number: 8, role: 'primary', source: '2026 research: 2 sources (Satvik Gems, Solacely #1 — "the classic wealth stone"); part of a 4-way tie for source count but strongest thematic fit and top rank where ranked.', sources: ['Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Solacely, "Crystals for Destiny Number 8" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-8'], evidenceTier: 'B' },
    ],
    sourceNotes: '2026 research pass: new associations for Numbers 3 and 8.',
  },
  { id: 'rhodochrosite', name: 'Rhodochrosite', aliases: [], materialType: 'Carbonate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data.' },
  {
    id: 'rhodonite', name: 'Rhodonite', aliases: ['Pink Rhodonite'], materialType: 'Silicate mineral', active: true,
    numberAssociations: [
      { number: 6, role: 'supporting', source: '2026 research: 2 sources (Ratnakripa, Solacely #4); part of a 4-way tie for Number 6.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Solacely, "Crystals for Destiny Number 6" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-6'], evidenceTier: 'B' },
    ],
    sourceNotes: '2026 research pass: new association for Number 6.',
  },
  {
    id: 'rose-quartz', name: 'Rose Quartz', aliases: [], materialType: 'Quartz', active: true,
    numberAssociations: [
      { number: 2, role: 'supporting', source: '2026 research: 1 source (Solacely, ranked #3) -- kept as a secondary pick behind Moonstone and Selenite.', sources: ['Solacely, "Crystals For Destiny Number 2" — https://global.solacely.co/blogs/numerology/crystals-for-destiny-number-2/'], evidenceTier: 'D' },
      { number: 6, role: 'primary', source: '2026 research: 2 sources (Navratan, Solacely #1 — "signature stone... traditional stone of unconditional love"); highest individual rank in a 4-way tie for Number 6.', sources: ['Navratan, "Lucky Gemstones for Number 6 in Numerology" — https://www.navratan.com/blog/best-stones-for-numerology-number-6', 'Solacely, "Crystals for Destiny Number 6" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-6'], evidenceTier: 'B' },
      { number: 9, role: 'supporting', source: '2026 research: 1 dedicated source (Astrology Answers), naming it the Number 9 primary crystal -- conflicts with the broader Amethyst consensus and the Mars-themed Bloodstone/Red Jasper/Garnet cluster. A genuine three-way split.', sources: ['Astrology Answers, "The Connection Between Numerology & Crystals" — https://www.astrologyanswers.com/article/numerology-the-crystal-connection/'], evidenceTier: 'D' },
    ],
    sourceNotes: 'Existing supportingCrystals entries for Numbers 2 and 6 (numberKnowledge.js); Number 2 confirmed at a lower tier by the 2026 research pass (Moonstone and Selenite are stronger), Number 6 upgraded to primary, and Number 9 added as a new, conflicting association.',
  },
  {
    id: 'selenite', name: 'Selenite', aliases: [], materialType: 'Gypsum', active: true,
    numberAssociations: [
      { number: 2, role: 'supporting', source: '2026 research: 3 sources (Satvik Gems, Navratan, Solacely #4) — the strongest secondary pick for Number 2 behind Moonstone.', sources: ['Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Navratan, "Lucky Gemstones for Number 2 Numerology" — https://www.navratan.com/blog/numerology-number-2-lucky-stones', 'Solacely, "Crystals For Destiny Number 2" — https://global.solacely.co/blogs/numerology/crystals-for-destiny-number-2/'], evidenceTier: 'A' },
      { number: 7, role: 'supporting', source: 'Existing supportingCrystals entry for Number 7 (numberKnowledge.js). Not independently confirmed by the 2026 research pass -- none of the five Number 7 sources checked mentioned Selenite; kept as-is rather than removed, since absence of evidence in a small sample isn’t evidence of absence.' },
    ],
    sourceNotes: 'Existing supportingCrystals entry for Number 7 (numberKnowledge.js), left untouched; Number 2 is a new, strongly-supported association from the 2026 research pass.',
  },
  { id: 'sodalite', name: 'Sodalite', aliases: [], materialType: 'Silicate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data. (2026 research pass found one single-source mention for Number 7 via Solacely, too thin on its own to add as a scored association.)' },
  {
    id: 'sunstone', name: 'Sunstone', aliases: [], materialType: 'Feldspar', active: true,
    numberAssociations: [
      { number: 1, role: 'supporting', source: '2026 research: 3 sources (Ratnakripa, Satvik Gems, Solacely #3) — a strong secondary pick behind Carnelian, Citrine and Garnet for Number 1.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Solacely, "Crystals for Destiny Number 1" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-1'], evidenceTier: 'A' },
    ],
    sourceNotes: 'Existing supportingCrystals entry for Number 1 (numberKnowledge.js); independently confirmed and given an evidence tier by the 2026 research pass.',
  },
  {
    id: 'tiger-eye', name: 'Tiger Eye', aliases: ["Tiger's Eye"], materialType: 'Chalcedony (quartz)', active: true,
    numberAssociations: [
      { number: 8, role: 'supporting', source: '2026 research: 1 source (Solacely, ranked #3) — a minor pick in a number with unusually divided evidence.', sources: ['Solacely, "Crystals for Destiny Number 8" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-8'], evidenceTier: 'D' },
    ],
    sourceNotes: '2026 research pass: new single-source association for Number 8.',
  },
  {
    id: 'tourmaline', name: 'Tourmaline', aliases: ['Black Tourmaline'], materialType: 'Boron silicate', active: true,
    numberAssociations: [
      { number: 4, role: 'primary', source: '2026 research: 3 sources referring to the black variety (Satvik Gems, Navratan, Solacely #2) — the top pick for Number 4, though one dedicated source instead ranks Hematite first.', sources: ['Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Navratan, "Lucky Gemstones For Number 4 In Numerology" — https://www.navratan.com/blog/lucky-gemstones-for-number-4-in-numerology', 'Solacely, "Crystals for Destiny Number 4" — https://solacely.co/blogs/numerology/crystals-for-destiny-number-4'], evidenceTier: 'A' },
      { number: 8, role: 'supporting', source: '2026 research: 2 sources referring to the black variety (Ratnakripa, Solacely #4); part of a 4-way tie for Number 8.', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Solacely, "Crystals for Destiny Number 8" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-8'], evidenceTier: 'B' },
    ],
    sourceNotes: 'This app’s existing data had "Black Tourmaline" as a supporting crystal for Number 4 with no citation; the 2026 research pass independently confirmed this, upgraded it to primary, and added a new Number 8 association.',
  },
  { id: 'turquoise', name: 'Turquoise', aliases: [], materialType: 'Phosphate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project’s data. (2026 research pass found single-source mentions for Numbers 5 and 9, one source each -- too thin on their own to add as scored associations.)' },
  {
    id: 'garnet', name: 'Garnet', aliases: [], materialType: 'Nesosilicate', active: true,
    numberAssociations: [
      { number: 1, role: 'supporting', source: '2026 research: 3 sources (Ratnakripa, Astrology Answers — sole named crystal there, Navratan).', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Astrology Answers, "The Connection Between Numerology & Crystals" — https://www.astrologyanswers.com/article/numerology-the-crystal-connection/', 'Navratan, "Lucky Stones For 1 Number In Numerology" — https://www.navratan.com/blog/lucky-stone-for-1-number-in-numerology'], evidenceTier: 'A' },
      { number: 4, role: 'supporting', source: '2026 research: 2 sources (Ratnakripa, Navratan).', sources: ['Ratnakripa, "Crystal Suggestion for the Year 2025" — https://www.ratnakripa.com/blogs/news/crystal-suggestion-2025', 'Navratan, "Lucky Gemstones For Number 4 In Numerology" — https://www.navratan.com/blog/lucky-gemstones-for-number-4-in-numerology'], evidenceTier: 'B' },
      { number: 9, role: 'supporting', source: '2026 research: 1 source (Solacely, ranked #3) — part of the Mars-themed cluster for Number 9.', sources: ['Solacely, "Crystals for Destiny Number 9" — https://www.solacely.co/en-us/blogs/numerology/crystals-for-destiny-number-9'], evidenceTier: 'D' },
    ],
    sourceNotes: 'New stone added by the 2026 crystal-consensus research pass -- it was not previously in this 37-stone list even though it showed real cross-source support for Numbers 1 and 4.',
  },
  {
    id: 'smoky-quartz', name: 'Smoky Quartz', aliases: [], materialType: 'Quartz', active: true,
    numberAssociations: [
      { number: 4, role: 'supporting', source: '2026 research: 2 sources (Satvik Gems, Solacely #3).', sources: ['Satvik Gems, "Best Healing Crystals For Your Birthdays" — https://satvikgems.com/best-healing-crystals-for-your-birthdays/', 'Solacely, "Crystals for Destiny Number 4" — https://solacely.co/blogs/numerology/crystals-for-destiny-number-4'], evidenceTier: 'B' },
    ],
    sourceNotes: 'New stone added by the 2026 crystal-consensus research pass, kept distinct from plain Clear Quartz since it is a materially different (irradiated/naturally smoky) variety commonly sold as its own crystal.',
  },
];

function getAllStones() {
  return CRYSTAL_37;
}

function getStoneById(id) {
  return CRYSTAL_37.find((s) => s.id === id) || null;
}

module.exports = { CRYSTAL_37, getAllStones, getStoneById };
