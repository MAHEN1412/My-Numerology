// ONE COMMAND to sync the live CrystalStone collection with the canonical
// crystalDatabase37.js data.
//
// This version (2026 EXPANDED RESEARCH PASS) replaced the earlier
// touched-stones-only script. That approach made sense when only ~25 of the
// 39 stones had been researched -- now that the expanded, ~250-page,
// nine-agent research pass touched effectively every scored stone (and
// added four brand-new ones: Fluorite, Blue Lace Agate, Peridot, and Black
// Onyx), this script simply syncs EVERY stone in CRYSTAL_37 unconditionally.
// Safe to re-run any time -- fully idempotent (upsert by stoneId).
//
// Usage: node server/scripts/setupCrystalStones2026.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CrystalStone = require('../models/CrystalStone');
const { CRYSTAL_37 } = require('../knowledge/crystalDatabase37');

async function syncAllStones() {
  console.log('Syncing', CRYSTAL_37.length, 'stones from crystalDatabase37.js into MongoDB...');
  let updated = 0, created = 0;
  const failures = [];
  // IMPORTANT: each stone is synced inside its own try/catch. A previous
  // version of this script let a single bad document (e.g. a `source` string
  // longer than the schema's maxlength) throw, which aborted the whole
  // Promise chain and silently left every stone after the failed one on
  // stale data -- exactly the kind of half-updated database that makes a
  // scoring formula look untrustworthy for no algorithmic reason at all.
  // Now one bad entry is reported clearly at the end instead of quietly
  // stopping the sync partway through.
  for (const canonical of CRYSTAL_37) {
    try {
      const newAssociations = canonical.numberAssociations.map((a) => ({
        number: a.number, role: a.role, source: a.source, sources: a.sources || [], evidenceTier: a.evidenceTier,
      }));

      const existing = await CrystalStone.findOne({ stoneId: canonical.id });
      if (existing) {
        existing.name = canonical.name;
        existing.aliases = canonical.aliases || [];
        existing.materialType = canonical.materialType;
        existing.active = canonical.active;
        existing.sourceNotes = canonical.sourceNotes;
        existing.numberAssociations = newAssociations;
        await existing.save();
        updated++;
        console.log('  Updated', canonical.id, '->', newAssociations.length, 'association(s).');
      } else {
        await CrystalStone.create({
          stoneId: canonical.id, name: canonical.name, aliases: canonical.aliases || [],
          materialType: canonical.materialType, active: canonical.active, sourceNotes: canonical.sourceNotes,
          numberAssociations: newAssociations,
        });
        created++;
        console.log('  Created new stone', canonical.id, '->', newAssociations.length, 'association(s).');
      }
    } catch (e) {
      failures.push({ id: canonical.id, error: e.message });
      console.error('  FAILED to sync', canonical.id, '->', e.message);
    }
  }
  console.log('Sync done. Updated:', updated, '| Created:', created, '| Failed:', failures.length);
  if (failures.length) {
    console.error('\n/!\\ Some stones failed to sync and still have STALE data in MongoDB:');
    failures.forEach((f) => console.error('  -', f.id, ':', f.error));
    console.error('Fix the listed issue(s) in crystalDatabase37.js (or the CrystalStone schema) and re-run this script -- it is safe to re-run any time.');
  }
  return failures;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');
  const failures = await syncAllStones();
  const total = await CrystalStone.countDocuments({ active: true });
  console.log('\nDone. CrystalStone collection now has', total, 'active stones.');
  if (failures.length === 0) {
    console.log('All stones synced cleanly. Refresh the Crystal Compatibility Calculator tab and check "View New Crystal Analysis (Beta)" -- it should now show the 2026 expanded-research results.');
  } else {
    console.log(failures.length, 'stone(s) still have stale data -- see the FAILED lines above.');
  }
  await mongoose.disconnect();
}

run().catch((e) => { console.error('Setup failed:', e.message); process.exit(1); });
