require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./adminModel');

async function main() {
  const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!MONGO_URI) {
    console.error('Please set MONGO_URI (or DATABASE_URL) in environment');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const username = process.env.ADMIN_USER || process.argv[2];
  const password = process.env.ADMIN_PASS || process.argv[3];

  if (!username || !password) {
    console.error('Usage: ADMIN_USER=alice ADMIN_PASS=secret node createAdmin.js');
    console.error('Or: node createAdmin.js <username> <password>');
    process.exit(1);
  }

  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);

  const res = await Admin.findOneAndUpdate(
    { username },
    { username, passwordHash: hash },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Admin user created/updated:', res.username);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
