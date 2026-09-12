// One-time update script: applies the 2026 crystal-consensus research pass
// (real, cited web research into what crystals are actually recommended
// for Numbers 1-9, see server/knowledge/crystalDatabase37.js's header
// comment for the full methodology and caveats) to the live CrystalStone
// collection.
//
// Unlike seedCrystalStones.js (which only inserts stones that don't exist
// yet), this script REPLACES the numberAssociations array for every stone
// this research pass touched -- the new, cited data is meant to supersede
// the old uncited "Existing app data" placeholders for those specific
// stones. Stones this pass didn't touch are left completely alone.
//
// Safe to re-run: it's idempotent (running it twice just re-applies the
// same data).
//
// Usage: node server/scripts/updateCrystalResearch2026.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CrystalStone = require('../models/CrystalStone');
const { CRYSTAL_37 } = require('../knowledge/crystalDatabase37');

// Every stoneId this research pass actually touched (added, changed, or
// explicitly emptied for a policy reason). Anything not in this list is
// left untouched even though it also appears in CRYSTAL_37.
const TOUCHED_STONE_IDS = [
  'amethyst', 'apatite', 'aquamarine', 'aventurine', 'bloodstone',
  'blue-sapphire', 'carnelian', 'citrine', 'clear-quartz', 'hematite',
  'jade', 'jasper', 'labradorite', 'lapis-lazuli', 'moonstone', 'pearl',
  'pyrite', 'rhodonite', 'rose-quartz', 'selenite', 'sunstone',
  'tiger-eye', 'tourmaline', 'garnet', 'smoky-quartz',
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Applying 2026 crystal-consensus research to', TOUCHED_STONE_IDS.length, 'stones...');

  let updated = 0, created = 0, skippedNotFound = 0;

  for (const stoneId of TOUCHED_STONE_IDS) {
    const canonical = CRYSTAL_37.find((s) => s.id === stoneId);
    if (!canonical) {
      console.warn('  ! No canonical data found for', stoneId, '-- skipping.');
      continue;
    }

    const newAssociations = canonical.numberAssociations.map((a) => ({
      number: a.number,
      role: a.role,
      source: a.source,
      sources: a.sources || [],
      evidenceTier: a.evidenceTier,
    }));

    const existing = await CrystalStone.findOne({ stoneId });
    if (existing) {
      existing.numberAssociations = newAssociations;
      existing.aliases = canonical.aliases || existing.aliases;
      existing.sourceNotes = canonical.sourceNotes;
      await existing.save();
      updated++;
      console.log('  Updated', stoneId, '->', newAssociations.length, 'association(s).');
    } else {
      await CrystalStone.create({
        stoneId: canonical.id,
        name: canonical.name,
        aliases: canonical.aliases || [],
        materialType: canonical.materialType,
        active: canonical.active,
        sourceNotes: canonical.sourceNotes,
        numberAssociations: newAssociations,
      });
      created++;
      console.log('  Created new stone', stoneId, '->', newAssociations.length, 'association(s).');
    }
  }

  console.log('\nDone. Updated:', updated, '| Created:', created, '| Not found in CRYSTAL_37:', skippedNotFound);
  await mongoose.disconnect();
}

run().catch((e) => { console.error('Update failed:', e.message); process.exit(1); });
