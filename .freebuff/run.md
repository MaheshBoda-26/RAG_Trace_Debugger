# Run doc — RAG Trace Debugger preview

Two processes: FastAPI API (`:8000`) + Vite dev server (`:5173`, proxies `/api` → `:8000`).
Log file for both: `.freebuff/preview-72155cd1-5ac4-4f61-a313-96a8d48a1f01.log`

## Reproduce artifacts (fresh checkout)

1. Python deps (uses repo-root `.venv`):
   ```
   python3.12 -m venv .venv && .venv/bin/pip install -r server/requirements.txt -r requirements-dev.txt
   ```
2. Web deps (package-lock.json present → npm ci):
   ```
   cd web && npm ci
   ```
   Typefaces are **self-hosted** (no Google Fonts request). `web/public/fonts/`
   is committed; only re-fetch if you change the family list:
   ```
   python3 web/scripts/fetch-fonts.py     # writes public/fonts/*.woff2 + fonts.css
   ```
3. Populate traces so the dashboard has data:
   ```
   .venv/bin/python -m server.eval.runner
   ```
4. Env: this workspace IS the main checkout; `.env.local` and `server/.env` are
   already present. In a fresh worktree, copy `.env.local` from the main
   checkout (never symlink; adapt ports if needed). No key is required — the
   app runs fully in mock mode.

## Run the servers (macOS, detached via launchd — nohup gets reaped here)

**Gotchas learned the hard way:**
- plain `nohup … &` from the tool shell dies when the shell exits → use `launchctl submit`
- launchd has no repo cwd and no `node`/`python` on PATH → use absolute paths + explicit `cd`
- node here lives at `/Users/maheshboda/.local/bin/node`, NOT `/usr/bin`

### API (`:8000`)
```
launchctl submit -l rtd-api-preview -- /bin/sh -c \
  "cd /Users/maheshboda/Projects/RAG_Trace_Debugger && exec /Users/maheshboda/Projects/RAG_Trace_Debugger/.venv/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 >> /Users/maheshboda/Projects/RAG_Trace_Debugger/.freebuff/preview-72155cd1-5ac4-4f61-a313-96a8d48a1f01.log 2>&1"
```
Verify: `curl -s http://127.0.0.1:8000/api/health` → `{"status":"ok",...}`
Take pid: `launchctl print gui/$(id -u)/rtd-api-preview` (look for `pid =`)

### Web (`:5173`)
```
NODE=$(which node)
launchctl submit -l rtd-web-preview -- /bin/sh -c \
  "cd /Users/maheshboda/Projects/RAG_Trace_Debugger/web && exec '$NODE' node_modules/vite/bin/vite.js --port 5173 --strictPort --host 127.0.0.1 >> /Users/maheshboda/Projects/RAG_Trace_Debugger/.freebuff/preview-72155cd1-5ac4-4f61-a313-96a8d48a1f01.log 2>&1"
```
Verify: `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5173/` → 200
AND `curl http://127.0.0.1:5173/api/health` → 200 (proxy check).
Take pid from `launchctl print gui/$(id -u)/rtd-web-preview`.

### Teardown
```
launchctl remove rtd-api-preview
launchctl remove rtd-web-preview
```

## Verify a change (all commands from the repo root)

```
cd web && ./node_modules/.bin/tsc -b      # types
cd web && npm run lint                    # oxlint — expect 0/0
cd web && npm run build                   # tsc + vite build (must split chunks)
.venv/bin/python -m pytest -q              # backend suite — expect 14 passed
.venv/bin/python -m server.eval.runner     # expect 15/15 localization
```

### Accessibility audit (axe-core, real browser)

```
cd web && npm i -D axe-core && cp node_modules/axe-core/axe.min.js public/axe.min.js
```
Then in the browser console (repeat per route and per theme):
```js
const s=document.createElement('script'); s.src='/axe.min.js';
s.onload=async()=>console.log((await axe.run(document)).violations);
document.head.appendChild(s);
```
Delete `web/public/axe.min.js` afterwards so the auditor never ships in `dist/`.
Expect **0 violations** on `/`, `/debugger`, `/features`, `/about`, `/eval`, `/corpus`
with `data-theme` set to `dark` and to `light`. Wait ~900 ms after flipping the
theme — the colour transitions interpolate, and axe would otherwise measure a
mid-transition colour and report a false failure.

### Contrast probe (the same maths axe uses, without the browser UI)

Run in the browser console. Sampling through a 1×1 canvas is required because
`getComputedStyle` returns the `oklch()` text, not sRGB — and never pass a
`var(...)` string to `fillStyle` (it is unsupported and silently falls back):
```js
const c=document.createElement('canvas');c.width=c.height=1;
const x=c.getContext('2d',{willReadFrequently:true});
const rgb=(v)=>{x.fillStyle='#ff00ff';x.fillStyle=v;x.fillRect(0,0,1,1);return [...x.getImageData(0,0,1,1).data].slice(0,3)};
const L=(a)=>a.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
const R=(f,b)=>{const[a,c2]=[L(f),L(b)].sort((m,n)=>n-m);return (a+0.05)/(c2+0.05)};
const cs=getComputedStyle(document.documentElement);
R(rgb(cs.getPropertyValue('--color-text').trim()), rgb(cs.getPropertyValue('--color-bg').trim()));
```

### Motion budget / rest state

The hero run is once-per-session (`sessionStorage['rtd-hero-run']`). To watch it
again: `sessionStorage.removeItem('rtd-hero-run')` then reload. `prefers-reduced-motion`
cannot be emulated through the preview harness — framer-motion caches the media
query at module load — so that branch is verified by its CSS block plus the
equivalent rest-state path (the session flag), not by live emulation.

## Notes
- `--strictPort` prevents Vite from silently drifting to 5174 (breaks the preview URL).
- Register the **Vite** URL (`http://127.0.0.1:5173/`) as the preview, with the vite pid.
- Framework cores (`langchain-core`, `llama-index-core`) are installed in `.venv`;
  the SDK adapters import them lazily, so their absence only skips those adapters.
