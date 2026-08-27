// One-time seed script: populates the CrystalStone collection from the
// original static data. Run once after deploying the CrystalStone model.
// Safe to re-run -- skips any stoneId that already exists.
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CrystalStone = require('../models/CrystalStone');
const { CRYSTAL_37 } = require('../knowledge/crystalDatabase37');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Seeding', CRYSTAL_37.length, 'stones...');

  let inserted = 0, skipped = 0;
  for (const stone of CRYSTAL_37) {
    const existing = await CrystalStone.findOne({ stoneId: stone.id });
    if (existing) { skipped++; continue; }

    await CrystalStone.create({
      stoneId: stone.id,
      name: stone.name,
      aliases: stone.aliases || [],
      materialType: stone.materialType,
      active: stone.active,
      sourceNotes: stone.sourceNotes,
      numberAssociations: stone.numberAssociations.map((a) => ({
        number: a.number,
        role: a.role,
        source: 'Existing app data (numberKnowledge.js primary/supporting crystal fields).',
      })),
    });
    inserted++;
  }

  console.log('Inserted:', inserted, '| Skipped (already existed):', skipped);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
