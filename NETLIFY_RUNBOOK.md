# Netlify Runbook (Band of Men)

This is a quick checklist for diagnosing and fixing common Netlify deploy and auth issues for this site.

## Basics (What Is Deployed)

- Production URL: `https://bandofmen.uk`
- Functions live under: `/.netlify/functions/*`
- Local deploy folder: this directory
- Functions source: `netlify/functions/`
- Netlify config: `netlify.toml`

## 1) If Images/CSS Backgrounds Are Missing

Netlify serves on Linux (case-sensitive paths). If you reference `Photos/...` but the folder is `photos/...`, assets will 404.

Expected paths used by the site:
- `Photos/Branding/...`
- `Photos/Haircuts/...`

Fix locally (example):
```bash
mv photos Photos
mv Photos/branding Photos/Branding
mv Photos/haircuts Photos/Haircuts
```

## 2) If Signup/Login Shows "Failed (502)"

A `502` from a Function usually means the function crashed at startup (common cause: missing node dependencies in the deployed bundle).

### Confirm the real error
```bash
curl -sS -D - -o /tmp/signup_body.txt \
  -X POST "https://bandofmen.uk/.netlify/functions/signup" \
  -H "content-type: application/json" \
  --data '{"email":"debug@example.com","password":"password123","name":"Debug User"}' | head -50
head -c 400 /tmp/signup_body.txt; echo
```

If you see something like "Cannot find package 'postgres' ...", go to the next step.

### Fix: install deps before deploying with Netlify CLI
This project expects `postgres`, `bcryptjs`, `resend` from `package.json`.

```bash
npm ci
```

Then redeploy (see Deploy section below).

## 3) If Signup/Login Returns a 500 With DB Errors

Two common cases:

### A) Missing DB URL env var
Symptoms:
- Error mentions `DATABASE_URL` or `NETLIFY_DATABASE_URL` missing.

Fix:
- In Netlify site settings, set one of:
  - `DATABASE_URL` (your own Postgres URL), or
  - Netlify DB integration vars: `NETLIFY_DATABASE_URL` / `NETLIFY_DATABASE_URL_UNPOOLED`

### B) Missing tables (relation does not exist)
Symptoms:
- Error mentions `relation "users" does not exist` (or similar).

Fix: initialize tables once:
- Visit:
  - `https://bandofmen.uk/.netlify/functions/init-db`
or curl it:
```bash
curl -sS "https://bandofmen.uk/.netlify/functions/init-db" | head
```

## 4) If Verification Codes Are Not Emailing

The email sender function requires:
- `RESEND_API_KEY`
Optional:
- `RESEND_FROM` (defaults to `Band of Men <send@bandofmen.uk>`)

If `RESEND_API_KEY` is missing, `/.netlify/functions/send-code` will return an error explaining that the provider is not configured.

## 5) Netlify CLI: Install/Use Without Global Install

If `netlify` is not installed:
```bash
npx -y netlify-cli --version
```

Login (opens a browser flow):
```bash
npx -y netlify-cli login
```

## 6) Link This Folder to the Correct Netlify Site

If `netlify status` says the folder is not linked:
```bash
npx -y netlify-cli sites:list --json | head
```

Then link by site id (recommended, non-interactive):
```bash
npx -y netlify-cli link --id 4e63ac4b-f3cb-4e05-a119-3e5c951fb73a
```

Confirm:
```bash
npx -y netlify-cli status
```

## 7) Deploy (Production)

This site is deployed as static files from `.` plus Functions from `netlify/functions`.

Recommended production deploy:
```bash
npx -y netlify-cli deploy --prod \
  --dir . \
  --functions netlify/functions \
  --message "Deploy"
```

## 8) Check Function Logs

Stream logs for a function (example: `signup`):
```bash
npx -y netlify-cli logs:function signup -l error warn info
```

## 9) If The Browser Still Shows Old JS

The HTML cache-busts `js/auth.js` with a query param, for example:
- `js/auth.js?v=YYYYMMDD`

If you change `js/auth.js`, bump that `v=` value in:
- `index.html`
- `account.html`

