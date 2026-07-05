require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { getToken } = require("./services/tokenManager");
const searchRoutes = require("./routes/search");

const app = express();

const PORT = process.env.PORT || 3001;

// =========================
// Middleware
// =========================

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

// =========================
// Routes
// =========================

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "🚀 SmartStay Backend Running",
  });
});

app.use("/api", searchRoutes);

// =========================
// Start Server
// =========================

app.listen(PORT, async () => {
  console.log(`✅ SmartStay Backend running on port ${PORT}`);

  try {
    await getToken();

    console.log("🔐 RouteStack connected successfully.");

  } catch (error) {
    console.error("❌ RouteStack initialization failed.");
  }
});