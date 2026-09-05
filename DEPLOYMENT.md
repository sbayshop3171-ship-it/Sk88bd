# Live Server Deployment

This repo contains the Next.js website/admin/signal backend and a Flutter APK
client. The current signal/admin access stores use local JSON files under
`.data/`, so a VPS or hosting with a persistent disk is the safest quick live
option.

## 1. Push To GitHub

```bash
git init
git branch -M main
git remote add origin https://github.com/sbayshop3171-ship-it/Sk88bd.git
git add .
git commit -m "Prepare Sk88bd live server build"
git push -u origin main
```

GitHub Actions workflow name: `CI - Build And Test`.

After every push, open:

```text
https://github.com/sbayshop3171-ship-it/Sk88bd/actions/workflows/ci.yml
```

If both `Web / Next.js` and `Mobile / Flutter APK` are green, the project is
ready to deploy from that commit.

## 2. VPS / Persistent Node Server

Use Node 20+.

```bash
git clone https://github.com/sbayshop3171-ship-it/Sk88bd.git
cd Sk88bd
cp .env.production.example .env.production
npm ci
npm run build
npm run start
```

The server starts on port `3000`. Put Nginx/Caddy in front of it and enable
HTTPS for your domain.

Required production notes:

- Set `ADMIN_PASSWORD` before first live boot.
- Keep `.data/` on persistent disk. It stores admin password hash, app key hash,
  device bindings, sessions, and demo round state.
- Do not upload `.env*`, `.data/`, APK signing keys, or `node_modules/`.
- After first login, change password from `/admin/settings`.
- Generate app keys from `/admin/app-keys`.

## 3. Vercel Note

The website can build on Vercel, but the current file-based admin/app-key store
is not durable on serverless hosting. For Vercel production, move these stores
to Supabase/Postgres first:

- `admin-auth-store`
- `signal-app-access-store`
- `aviator-signal-store`

## 4. Flutter APK For Live Domain

Build the APK with your real backend URL:

```bash
cd mobile/signal_app
flutter pub get
flutter build apk --release --dart-define=SIGNAL_API_BASE_URL=https://your-domain.com
```

For local Xiaomi testing from the same machine:

```bash
adb reverse tcp:3000 tcp:3000
flutter build apk --debug --dart-define=SIGNAL_API_BASE_URL=http://127.0.0.1:3000
adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

## 5. Live Checklist

- `/admin` login works.
- `/admin/settings` password change works.
- `/admin/app-keys` can generate/revoke/reset device access.
- `/api/signal-terminal/snapshot` returns `401` without app token.
- Flutter app unlocks with app key and then auto-opens signal screen.
- `/game/aviator` and mobile app show matching controlled demo signal rounds.
