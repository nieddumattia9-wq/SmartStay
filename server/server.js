require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { getToken } = require("./services/tokenManager");
const searchRoutes = require("./routes/search");

const app = express();

const PORT =
  Number(process.env.PORT) || 3001;

const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

// =========================
// Middleware
// =========================

app.use(helmet());

app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use(limiter);

// =========================
// Health Check
// =========================

app.get("/", (req, res) => {

  res.json({
    status: "ok",
    message: "🚀 SmartStay Backend Running",
  });

});

app.get("/health", (req, res) => {

  res.json({
    status: "ok",
    service: "smartstay-backend",
    timestamp: new Date().toISOString(),
  });

});

// =========================
// Routes
// =========================

app.use("/api", searchRoutes);

// =========================
// 404 Handler
// =========================

app.use((req, res) => {

  res.status(404).json({
    success: false,
    message: "Route not found.",
  });

});

// =========================
// Start Server
// =========================

app.listen(PORT, async () => {

  console.log(
    `✅ SmartStay Backend running on port ${PORT}`
  );

  console.log(
    `🌍 Allowed client origin: ${CLIENT_ORIGIN}`
  );

  try {

    await getToken();

    console.log(
      "🔐 RouteStack connected successfully."
    );

  } catch (error) {

    console.error(
      "❌ RouteStack initialization failed."
    );

    console.error(error.message);

  }

});