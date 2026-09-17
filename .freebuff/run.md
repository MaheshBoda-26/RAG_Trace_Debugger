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

## Notes
- `--strictPort` prevents Vite from silently drifting to 5174 (breaks the preview URL).
- Register the **Vite** URL (`http://127.0.0.1:5173/`) as the preview, with the vite pid.
- Framework cores (`langchain-core`, `llama-index-core`) are installed in `.venv`;
  the SDK adapters import them lazily, so their absence only skips those adapters.
