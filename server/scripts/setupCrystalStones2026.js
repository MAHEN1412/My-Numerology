// ONE COMMAND to get the "37/39-Stone Crystal Analysis" panel showing real
// data. This is the reason that panel has been showing "No stone currently
// qualifies for this role" with an empty Full Ranking table -- the
// CrystalStone collection in MongoDB has never actually been populated.
// Neither seedCrystalStones.js nor updateCrystalResearch2026.js had been
// run against the live database yet, so calculateCrystalRecommendations()
// was correctly scoring zero stones because there were zero stones to score.
//
// This script runs both steps in the right order so nothing needs to be
// remembered or run twice:
//   1. updateCrystalResearch2026.js's logic FIRST -- creates/updates the 25
//      stones touched by the real, cited 2026 crystal-consensus research
//      pass (this is what actually shows up as Primary/Harmony/etc. in the
//      UI), preserving their sources/evidenceTier fields.
//   2. seedCrystalStones.js's logic SECOND -- backfills the remaining
//      stones (the ones with no number association at all, like Agate or
//      Amazonite) so the Full Ranking table shows the complete list.
//      (Running seed first would have overwritten the cited stones with
//      generic "Existing app data" placeholders, so the order matters.)
//
// Safe to re-run any time -- both steps are idempotent.
//
// Usage: node server/scripts/setupCrystalStones2026.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CrystalStone = require('../models/CrystalStone');
const { CRYSTAL_37 } = require('../knowledge/crystalDatabase37');

const TOUCHED_STONE_IDS = [
  'amethyst', 'apatite', 'aquamarine', 'aventurine', 'bloodstone',
  'blue-sapphire', 'carnelian', 'citrine', 'clear-quartz', 'hematite',
  'jade', 'jasper', 'labradorite', 'lapis-lazuli', 'moonstone', 'pearl',
  'pyrite', 'rhodonite', 'rose-quartz', 'selenite', 'sunstone',
  'tiger-eye', 'tourmaline', 'garnet', 'smoky-quartz',
];

async function applyResearchPass() {
  console.log('Step 1/2: applying the 2026 crystal-consensus research to', TOUCHED_STONE_IDS.length, 'stones...');
  let updated = 0, created = 0;
  for (const stoneId of TOUCHED_STONE_IDS) {
    const canonical = CRYSTAL_37.find((s) => s.id === stoneId);
    if (!canonical) { console.warn('  ! No canonical data found for', stoneId, '-- skipping.'); continue; }

    const newAssociations = canonical.numberAssociations.map((a) => ({
      number: a.number, role: a.role, source: a.source, sources: a.sources || [], evidenceTier: a.evidenceTier,
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
        stoneId: canonical.id, name: canonical.name, aliases: canonical.aliases || [],
        materialType: canonical.materialType, active: canonical.active, sourceNotes: canonical.sourceNotes,
        numberAssociations: newAssociations,
      });
      created++;
      console.log('  Created new stone', stoneId, '->', newAssociations.length, 'association(s).');
    }
  }
  console.log('Step 1/2 done. Updated:', updated, '| Created:', created);
}

async function seedRemaining() {
  console.log('Step 2/2: backfilling any remaining stones (no number association)...');
  let inserted = 0, skipped = 0;
  for (const stone of CRYSTAL_37) {
    const existing = await CrystalStone.findOne({ stoneId: stone.id });
    if (existing) { skipped++; continue; }
    await CrystalStone.create({
      stoneId: stone.id, name: stone.name, aliases: stone.aliases || [], materialType: stone.materialType,
      active: stone.active, sourceNotes: stone.sourceNotes,
      numberAssociations: stone.numberAssociations.map((a) => ({
        number: a.number, role: a.role, source: a.source || 'Existing app data (numberKnowledge.js primary/supporting crystal fields).',
        sources: a.sources || [], evidenceTier: a.evidenceTier,
      })),
    });
    inserted++;
  }
  console.log('Step 2/2 done. Inserted:', inserted, '| Already present:', skipped);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');
  await applyResearchPass();
  await seedRemaining();
  const total = await CrystalStone.countDocuments({ active: true });
  console.log('\nDone. CrystalStone collection now has', total, 'active stones. Refresh the Crystal Compatibility Calculator tab and check "View New Crystal Analysis (Beta)" -- it should now show real results.');
  await mongoose.disconnect();
}

run().catch((e) => { console.error('Setup failed:', e.message); process.exit(1); });
