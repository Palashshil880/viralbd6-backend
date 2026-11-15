require("dotenv").config();

const crypto = require("node:crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { Bot, InlineKeyboard } = require("grammy");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const MINI_APP_URL = process.env.MINI_APP_URL || "";

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  }
}));

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

let bot = null;

if (BOT_TOKEN) {
  bot = new Bot(BOT_TOKEN);

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard();
    if (MINI_APP_URL) {
      keyboard.webApp("Open ViralBD6", MINI_APP_URL);
    }

    await ctx.reply(
      "Welcome to ViralBD6! Use the button below to open the Mini App.",
      MINI_APP_URL ? { reply_markup: keyboard } : undefined
    );
  });

  bot.command("help", (ctx) =>
    ctx.reply("ViralBD6 bot is running. Send /start to begin.")
  );

  bot.catch((error) => {
    console.error("Telegram bot error:", error.message);
  });
}

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "ViralBD6 Backend",
    status: "running",
    docs: "See README.md for setup instructions"
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "viralbd6-backend",
    timestamp: new Date().toISOString()
  });
});

// Validate Telegram Mini App initData according to Telegram's Web Apps rules.
function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) return null;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const a = Buffer.from(calculatedHash, "hex");
  const b = Buffer.from(receivedHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get("auth_date"));
  const maxAgeSeconds = 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || authDate > now + 60 || now - authDate > maxAgeSeconds) {
    return null;
  }

  try {
    const userValue = params.get("user");
    return userValue ? JSON.parse(userValue) : null;
  } catch {
    return null;
  }
}

app.post("/api/telegram/auth", (req, res) => {
  if (!BOT_TOKEN) {
    return res.status(503).json({ ok: false, error: "Telegram authentication is not configured" });
  }

  const user = validateTelegramInitData(req.body && req.body.initData, BOT_TOKEN);
  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid or expired Telegram initData" });
  }

  return res.json({
    ok: true,
    user: {
      id: user.id,
      first_name: user.first_name,
      username: user.username || null,
      language_code: user.language_code || null
    }
  });
});

app.post("/telegram/webhook", async (req, res) => {
  if (!bot || !WEBHOOK_SECRET) {
    return res.status(503).json({ ok: false, error: "Telegram webhook is not configured" });
  }

  const suppliedSecret = req.get("x-telegram-bot-api-secret-token") || "";
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(WEBHOOK_SECRET);

  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ ok: false, error: "Unauthorized webhook request" });
  }

  try {
    await bot.handleUpdate(req.body);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook update failed:", error.message);
    return res.sendStatus(500);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

async function startServer() {
  if (bot) {
    await bot.init();
    console.log(`Telegram bot initialized: @${bot.botInfo.username}`);
  }

  app.listen(PORT, () => {
    console.log(`ViralBD6 backend listening on port ${PORT}`);
    if (!BOT_TOKEN) {
      console.warn("BOT_TOKEN is not set. API health checks work, but bot/auth features are disabled.");
    }
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
