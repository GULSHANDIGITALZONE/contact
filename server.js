// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const Message = require('./messageModel'); // ensure correct path

const app = express();
app.use(express.json());

// CORS - set CLIENT_ORIGIN on Render to your Netlify URL, else '*' for testing
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/contactdb';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// ---------------- Routes ----------------

// 1) Public contact endpoint used by frontend form
// The frontend posts to /api/contact — we accept it and save (name, phone, message)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    if (!name || !message) return res.status(400).json({ success: false, error: 'Name and message are required' });

    const msg = new Message({ name, phone, message });
    await msg.save();
    return res.status(201).json({ success: true, data: msg });
  } catch (err) {
    console.error('Create (contact) error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 2) GET messages (admin). Supports query ?deleted=true to return deleted items.
// If deleted=true -> return deleted items; otherwise return non-deleted (inbox).
app.get('/api/messages', async (req, res) => {
  try {
    const wantDeleted = (req.query.deleted === 'true');
    const filter = wantDeleted ? { deleted: true } : { deleted: { $ne: true } };
    const messages = await Message.find(filter).sort({ createdAt: -1 });
    return res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 3) Soft-delete: mark deleted=true and set deletedAt
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const id = req.params.id;
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

// 4) Restore a message
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

// (Optional) permanent delete route if you ever want to remove completely
// app.delete('/api/messages/:id/permanent', async (req, res) => { ... });

// Serve static (if homepage is in this repo)
app.use(express.static(path.join(__dirname, '/')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
