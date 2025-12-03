// messageModel.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', schema);
