require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Model
const Message = require("./messageModel");

// Basic Auth
function checkAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic "))
    return res.status(401).send("Unauthorized");

  const base64 = auth.split(" ")[1];
  const [user, pass] = Buffer.from(base64, "base64").toString().split(":");

  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    next();
  } else {
    return res.status(401).send("Unauthorized");
  }
}

// 🟢 POST /api/contact  (SAVE MESSAGE)
app.post("/api/contact", async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    if (!name || !phone || !message)
      return res.status(400).json({ ok: false, error: "Missing fields" });

    const newMsg = await Message.create({
      name,
      phone,
      message
    });

    res.json({ ok: true, data: newMsg });

  } catch (err) {
    console.error("ERROR =>", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// 🟢 GET /api/messages (ADMIN ONLY)
app.get("/api/messages", checkAuth, async (req, res) => {
  try {
    const list = await Message.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// MongoDB connect
async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB ERROR:", err);
  }
}
start();

// Default route
app.get("/", (req, res) => {
  res.send("Backend is running.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
