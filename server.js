// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const Message = require('./messageModel'); // ensure path is correct

const app = express();
app.use(express.json());

// CORS - set CLIENT_ORIGIN in Render's env to your Netlify URL (recommended).
// For quick testing you can use origin: '*' but it's better to restrict to your Netlify site.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// --- MongoDB connect ---
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/contactdb';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// ------------------- Routes -------------------

// Create message (public contact form)
app.post('/api/messages', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !message) return res.status(400).json({ success: false, error: 'Name and message are required' });

    const msg = new Message({ name, email, subject, message });
    await msg.save();
    return res.status(201).json({ success: true, data: msg });
  } catch (err) {
    console.error('Create message error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get all non-deleted messages (inbox) - admin UI uses this
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find({ deleted: { $ne: true } }).sort({ createdAt: -1 });
    return res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ----------------- SOFT DELETE (replace hard delete) -----------------
// Soft-delete: mark deleted=true and set deletedAt
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // validate id existence quickly
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });

    const updated = await Message.findByIdAndUpdate(
      id,
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, error: 'Message not found' });
    return res.json({ success: true, message: 'Message moved to Trash', data: updated });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get deleted messages (Trash list)
app.get('/api/messages/deleted', async (req, res) => {
  try {
    const items = await Message.find({ deleted: true }).sort({ deletedAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error('Get deleted error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Restore a message (set deleted false)
app.post('/api/messages/:id/restore', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await Message.findByIdAndUpdate(
      id,
      { deleted: false, deletedAt: null },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Message not found' });
    return res.json({ success: true, message: 'Message restored', data: updated });
  } catch (err) {
    console.error('Restore error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// (Optional) Permanent delete - uncomment only if you want it.
// app.delete('/api/messages/:id/permanent', async (req, res) => {
//   try {
//     const id = req.params.id;
//     const removed = await Message.findByIdAndDelete(id);
//     if (!removed) return res.status(404).json({ success: false, error: 'Message not found' });
//     return res.json({ success: true, message: 'Message permanently deleted' });
//   } catch (err) {
//     console.error('Permanent delete error:', err);
//     return res.status(500).json({ success: false, error: 'Server error' });
//   }
// });

// ----------------- Static / Frontend -----------------
// Serve your frontend (index.html) from repo root or public folder.
// If your Netlify frontend is separate, you may not need this.
app.use(express.static(path.join(__dirname, '/')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ----------------- Start server -----------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

