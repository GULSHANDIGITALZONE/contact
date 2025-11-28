// server.js
require('dotenv').config();
console.log('<< DEBUG START >>');
console.log('cwd=', process.cwd());
console.log('NODE_ENV=', process.env.NODE_ENV || 'not-set');
console.log('PORT=', process.env.PORT || 'not-set');
console.log('MONGO_URI=', process.env.MONGO_URI ? '[SET]' : '[NOT SET]');
console.log('<< DEBUG END >>');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const basicAuth = require('basic-auth');

const app = express();
app.use(helmet());
app.use(express.json());

// CORS origin from .env
const ORIGIN = process.env.ORIGIN || '*';
app.use(cors({
  origin: ORIGIN,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


// Rate limiter on contact endpoint
app.use('/api/contact', rateLimit({ windowMs: 60*1000, max: 12 }));

// simple root route to check server
app.get('/', (req, res) => {
  res.json({ ok: true, msg: 'Contact backend running' });
});

// MongoDB connect
async function startMongo() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGO_URI not set in .env');
      return;
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // do not crash here - show error and continue (optional: process.exit(1))
  }
}
startMongo();

// Mongoose schema & model
const msgSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.models.Message || mongoose.model('Message', msgSchema);

// POST /api/contact
app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    if (!name || !phone || !message) return res.status(400).json({ error: 'Missing fields' });
    const doc = new Message({ name: String(name).trim(), phone: String(phone).trim(), message: String(message).trim() });
    await doc.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/contact error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Basic auth middleware for admin endpoints
function requireAdmin(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== process.env.ADMIN_USER || user.pass !== process.env.ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="admin"');
    return res.status(401).send('Authentication required.');
  }
  return next();
}

// GET /api/messages (protected)
app.get('/api/messages', requireAdmin, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }).limit(500);
    res.json(messages);
  } catch (err) {
    console.error('GET /api/messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log('Server running on port', port));
