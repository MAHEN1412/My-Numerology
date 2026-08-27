/**
 * 37-STONE CRYSTAL DATABASE
 * =========================
 * Canonical record for each of the 37 stones. Centralized here so the
 * scoring engine (crystalEngineV2.js) and any UI component reference the
 * SAME data -- no per-component hard-coded crystal lists.
 *
 * DATA-INTEGRITY NOTE (read before editing):
 * Each stone's `numberAssociations` field reflects ONLY what already
 * exists in numberKnowledge.js (this app's existing, authoritative
 * per-number crystal data) -- built by cross-referencing every stone
 * against that file's primaryCrystal/supportingCrystals fields. Stones
 * NOT found there have an empty numberAssociations array and
 * `sourceNotes` says so explicitly. Nothing here was invented to make
 * the scoring model produce a particular result.
 *
 * Per-crystal planetary and purpose associations are NOT included as a
 * separate field, because no authoritative per-crystal source for either
 * exists in this project (only per-NUMBER planetary/purpose data exists,
 * which is a different thing). The scoring engine reflects this honestly
 * by giving those dimensions zero weight rather than fabricating
 * crystal-level planet/purpose mappings.
 */

const CRYSTAL_37 = [
  { id: 'agate', name: 'Agate', aliases: [], materialType: 'Chalcedony', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'amazonite', name: 'Amazonite', aliases: [], materialType: 'Feldspar', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'amethyst', name: 'Amethyst', aliases: [], materialType: 'Quartz', numberAssociations: [{ number: 7, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 7 (numberKnowledge.js).' },
  { id: 'apatite', name: 'Apatite', aliases: [], materialType: 'Phosphate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'aquamarine', name: 'Aquamarine', aliases: [], materialType: 'Beryl', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'aventurine', name: 'Aventurine', aliases: [], materialType: 'Quartz', numberAssociations: [{ number: 5, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 5 (numberKnowledge.js).' },
  { id: 'azurite', name: 'Azurite', aliases: [], materialType: 'Carbonate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'bloodstone', name: 'Bloodstone', aliases: [], materialType: 'Chalcedony', numberAssociations: [{ number: 9, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 9 (numberKnowledge.js).' },
  { id: 'blue-sapphire', name: 'Blue Sapphire', aliases: [], materialType: 'Corundum', numberAssociations: [{ number: 8, role: 'primary' }], active: true, sourceNotes: 'Existing primaryCrystal entry for Number 8 (Saturn) (numberKnowledge.js).' },
  { id: 'carnelian', name: 'Carnelian', aliases: [], materialType: 'Chalcedony', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'cats-eye-stone', name: "Cat's Eye", aliases: [], materialType: 'Chrysoberyl (or quartz variant)', numberAssociations: [], active: true, sourceNotes: 'This app\u2019s existing primaryCrystal for Number 7 is specifically Chrysoberyl Cat\u2019s Eye -- kept separate here since the 37-list\u2019s "Cat\u2019s Eye" is not confirmed to be the same graded gemstone; not merged to avoid overstating the association.' },
  { id: 'charoite', name: 'Charoite', aliases: [], materialType: 'Silicate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'citrine', name: 'Citrine', aliases: [], materialType: 'Quartz', numberAssociations: [{ number: 3, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 3 (numberKnowledge.js).' },
  { id: 'clear-quartz', name: 'Clear Quartz', aliases: [], materialType: 'Quartz', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'hematite', name: 'Hematite', aliases: [], materialType: 'Iron oxide', numberAssociations: [{ number: 8, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 8 (numberKnowledge.js).' },
  { id: 'howlite', name: 'Howlite', aliases: [], materialType: 'Borate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'jade', name: 'Jade', aliases: [], materialType: 'Jadeite/Nephrite', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'jasper', name: 'Jasper', aliases: [], materialType: 'Chalcedony', numberAssociations: [], active: true, sourceNotes: 'This app\u2019s existing data has "Red Jasper" (a specific variety) as a supporting crystal for Number 1 -- not merged with plain "Jasper" here since the 37-list entry doesn\u2019t specify the red variety.' },
  { id: 'labradorite', name: 'Labradorite', aliases: [], materialType: 'Feldspar', numberAssociations: [{ number: 7, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 7 (numberKnowledge.js).' },
  { id: 'lapis-lazuli', name: 'Lapis Lazuli', aliases: [], materialType: 'Metamorphic rock', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'larimar', name: 'Larimar', aliases: [], materialType: 'Pectolite', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'malachite', name: 'Malachite', aliases: [], materialType: 'Carbonate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'moonstone', name: 'Moonstone', aliases: [], materialType: 'Feldspar', numberAssociations: [{ number: 2, role: 'primary' }], active: true, sourceNotes: 'Existing primaryCrystal entry for Number 2 (Moon) (numberKnowledge.js).' },
  { id: 'obsidian', name: 'Obsidian', aliases: [], materialType: 'Volcanic glass', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'opalite', name: 'Opalite', aliases: [], materialType: 'Synthetic glass', numberAssociations: [], active: true, sourceNotes: 'This app\u2019s existing data has "Opal" (a distinct natural gemstone) as a supporting crystal for Number 6 -- not merged with "Opalite" (a man-made glass product) since they are materially different.' },
  { id: 'pearl', name: 'Pearl', aliases: [], materialType: 'Organic gem', numberAssociations: [{ number: 2, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 2 (numberKnowledge.js).' },
  { id: 'pietersite', name: 'Pietersite', aliases: [], materialType: 'Chalcedony', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'pyrite', name: 'Pyrite', aliases: [], materialType: 'Iron sulfide', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'rhodochrosite', name: 'Rhodochrosite', aliases: [], materialType: 'Carbonate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'rhodonite', name: 'Rhodonite', aliases: [], materialType: 'Silicate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'rose-quartz', name: 'Rose Quartz', aliases: [], materialType: 'Quartz', numberAssociations: [{ number: 2, role: 'supporting' }, { number: 6, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Numbers 2 and 6 (numberKnowledge.js).' },
  { id: 'selenite', name: 'Selenite', aliases: [], materialType: 'Gypsum', numberAssociations: [{ number: 7, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 7 (numberKnowledge.js).' },
  { id: 'sodalite', name: 'Sodalite', aliases: [], materialType: 'Silicate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'sunstone', name: 'Sunstone', aliases: [], materialType: 'Feldspar', numberAssociations: [{ number: 1, role: 'supporting' }], active: true, sourceNotes: 'Existing supportingCrystals entry for Number 1 (numberKnowledge.js).' },
  { id: 'tiger-eye', name: 'Tiger Eye', aliases: [], materialType: 'Chalcedony (quartz)', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
  { id: 'tourmaline', name: 'Tourmaline', aliases: [], materialType: 'Boron silicate', numberAssociations: [], active: true, sourceNotes: 'This app\u2019s existing data has "Black Tourmaline" (a specific variety) as a supporting crystal for Number 4 -- not merged with plain "Tourmaline" since the 37-list entry doesn\u2019t specify the black variety.' },
  { id: 'turquoise', name: 'Turquoise', aliases: [], materialType: 'Phosphate mineral', numberAssociations: [], active: true, sourceNotes: 'No existing number association found in this project\u2019s data.' },
];

function getAllStones() {
  return CRYSTAL_37;
}

function getStoneById(id) {
  return CRYSTAL_37.find((s) => s.id === id) || null;
}

module.exports = { CRYSTAL_37, getAllStones, getStoneById };
