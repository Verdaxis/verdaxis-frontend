# Verdaxis Frontend - Claude Code Instructions

## Deployment

**Server:** `verdaxis-prod@144.126.151.136`
**Site:** `app.verdaxis.exchange` (served by Caddy from `~/verdaxis-frontend/dist`)
**API:** `api.verdaxis.exchange` (Caddy reverse proxy to backend on `localhost:8000`)

### Deploy command (from local machine)

```bash
ssh verdaxis-prod@144.126.151.136 "cd ~/verdaxis-frontend && git pull && rm -rf dist && npm run build"
```

**IMPORTANT:** Always `rm -rf dist` before `npm run build`. Vite generates hashed JS filenames on each build. If stale `dist/index.html` references an old hash, the site breaks with:
> "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html"

### Verify deployment

```bash
ssh verdaxis-prod@144.126.151.136 "grep 'src=\"/assets' ~/verdaxis-frontend/dist/index.html && ls ~/verdaxis-frontend/dist/assets/*.js"
```
Both should show the same filename hash.

## Local Development

```bash
npm run dev
```

`.env` should use `VITE_API_URL=/api` for local dev. The vite proxy (configured in `vite.config.ts`) forwards `/api/*` to `http://144.126.151.136:8000/api/*`, avoiding CORS issues.

**Production `.env`** on server uses `VITE_API_URL=https://api.verdaxis.exchange/api`.

## Known Gotchas

- **API returns numbers as strings.** Always wrap numeric fields (`quantity_mt`, `final_quantity_mt`, `price_per_mt_usd`, `final_price_per_mt`, `final_total_usd`) with `Number()` before arithmetic or `.toFixed()` calls.
- **Never commit `dist/` to git.** It's in `.gitignore`. If it gets force-added, run `git rm -r --cached dist/` to untrack it.
