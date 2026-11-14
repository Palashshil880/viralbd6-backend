# ViralBD6 Backend

Starter backend for the ViralBD6 Telegram Bot and Mini App. This is a foundation, not the finished product: database storage, admin dashboard, earning/task logic, and the final Mini App features still need to be specified and implemented.

## Included

- Express server suitable for Render Web Services
- `GET /` and `GET /api/health` health endpoints
- Telegram bot commands: `/start` and `/help`
- Telegram webhook endpoint protected by Telegram's secret-token header
- Telegram Mini App `initData` signature and age validation
- Basic API rate limiting, Helmet security headers, and configurable CORS
- Safe `.env.example`; real secrets are not included

## Requirements

- Node.js 20+
- A Telegram bot token from BotFather
- A deployed HTTPS URL for the backend
- An HTTPS URL for the Mini App frontend

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:

   - `BOT_TOKEN`: token from BotFather
   - `TELEGRAM_WEBHOOK_SECRET`: a long random secret (letters, numbers, underscore, hyphen)
   - `MINI_APP_URL`: your Mini App HTTPS URL
   - `PUBLIC_URL`: your backend HTTPS URL after deployment

3. Start the server:

   ```bash
   npm start
   ```

4. Test:

   - `http://localhost:10000/`
   - `http://localhost:10000/api/health`

## Deploy on Render

1. Create a **Web Service** and connect this repository.
2. Runtime: Node.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Add environment variables in Render's Environment tab. Do not commit a real `.env` file.
6. After deployment, confirm `https://YOUR-SERVICE.onrender.com/api/health` returns `{"ok":true,...}`.

## Configure the Telegram webhook

After deployment, set the webhook URL to:

`https://YOUR-SERVICE.onrender.com/telegram/webhook`

Use Telegram's `setWebhook` API with the same `TELEGRAM_WEBHOOK_SECRET` value in the `secret_token` field. Keep the bot token and webhook secret private. Do not paste them into public issues, chat messages, or source files.

## Mini App authentication

Send the raw Telegram Web App `initData` string to:

`POST /api/telegram/auth`

JSON body:

```json
{ "initData": "the-raw-initData-string-from-Telegram" }
```

The backend validates the Telegram signature and rejects data older than 24 hours. The frontend must send the raw `Telegram.WebApp.initData`, not `initDataUnsafe`.

## Important next steps

Before adding production features, define the Mini App screens and business rules. In particular, specify whether ViralBD6 needs user accounts, referrals, tasks, points/rewards, ad network integration, withdrawals, admin roles, and a database. Never store bot tokens, API keys, payment credentials, or ad-network secrets in frontend code.
