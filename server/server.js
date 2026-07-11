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
// Global Error Handler
// =========================

app.use((error, req, res, next) => {

  if (res.headersSent) {

    return next(error);

  }

  const isMalformedJson =
    error instanceof SyntaxError &&
    error.status === 400 &&
    error.type === "entity.parse.failed";

  if (isMalformedJson) {

    console.error(
      "Invalid JSON payload received."
    );

    console.error({
      method: req.method,
      path: req.originalUrl,
      message: error.message,
    });

    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload.",
    });

  }

  const rawStatus =
    error.status ?? error.statusCode;

  const status =
    Number.isInteger(rawStatus) &&
    rawStatus >= 400 &&
    rawStatus <= 599
      ? rawStatus
      : 500;

  console.error(
    "Unhandled request error."
  );

  console.error({
    method: req.method,
    path: req.originalUrl,
    status,
    message: error.message,
    stack: error.stack,
  });

  const publicMessage =
    status >= 500
      ? "Internal server error."
      : "Request failed.";

  return res.status(status).json({
    success: false,
    message: publicMessage,
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