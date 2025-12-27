// messageModel.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  // soft-delete fields (keep at top or anywhere inside schema)
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  name: { type: String, required: true },
  phone: { type: String, default: '' },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// optional index to speed queries (useful)
schema.index({ deleted: 1, createdAt: -1 });

module.exports = mongoose.model('Message', schema);
