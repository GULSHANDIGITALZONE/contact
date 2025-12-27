require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const basicAuth = require('basic-auth');
const bcrypt = require('bcrypt');

const Message = require('./messageModel');
const Admin = require('./adminModel');

const app = express();
app.use(express.json());

/* -------------------- CORS -------------------- */
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

/* -------------------- MONGODB -------------------- */
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected');
  await ensureAdmin(); // 🔥 MOST IMPORTANT
})
.catch(err => console.error('MongoDB connection error:', err));

/* -------------------- AUTO ADMIN CREATE -------------------- */
async function ensureAdmin() {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASS;

  if (!username || !password) {
    console.log('ADMIN_USER / ADMIN_PASS not set');
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  await Admin.findOneAndUpdate(
    { username },
    { username, passwordHash: hash },
    { upsert: true, new: true }
  );

  console.log('Admin ensured:', username);
}

/* -------------------- AUTH MIDDLEWARE -------------------- */
async function requireAdmin(req, res, next) {
  try {
    console.log('Auth header:', req.headers.authorization);

    const user = basicAuth(req);
    console.log('basic-auth parsed:', user);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = await Admin.findOne({ username: user.name });
    console.log('Auth: found admin record?', !!admin);

    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ok = await bcrypt.compare(user.pass, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/* -------------------- ROUTES -------------------- */

// Public contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message required' });
    }

    const msg = new Message({ name, phone, message });
    await msg.save();
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: get messages
app.get('/api/messages', requireAdmin, async (req, res) => {
  const deleted = req.query.deleted === 'true';
  const filter = deleted ? { deleted: true } : { deleted: { $ne: true } };
  const messages = await Message.find(filter).sort({ createdAt: -1 });
  res.json(messages);
});

// Admin: delete message (soft delete)
app.delete('/api/messages/:id', requireAdmin, async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, {
    deleted: true,
    deletedAt: new Date()
  });
  res.json({ success: true });
});

// Admin: restore message
app.post('/api/messages/:id/restore', requireAdmin, async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, {
    deleted: false,
    deletedAt: null
  });
  res.json({ success: true });
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
