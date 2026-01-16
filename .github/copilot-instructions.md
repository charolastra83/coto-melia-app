# Copilot / AI agent instructions — Coto Melía app

Purpose
- Quick, focused guide to be productive editing this Google Apps Script + Supabase web app.

Big picture
- The project mixes two integration modes: a Google Apps Script backend and a client-side Supabase-backed frontend.
  - Server: `code.gs` is a Google Apps Script project that exposes RPC-style functions (e.g. `login`, `subirReciboLuz`) and manipulates a central Google Sheet. See [code.gs](code.gs#L1-L10).
  - Client: `Index.html` contains UI + client logic that talks directly to Supabase (storage + tables) via `supabase.js`. See [Index.html](Index.html#L1).
  - Files and persistent records: Google Drive folders (constants in `code.gs`) and a Google Sheet (ID in `code.gs`) are the canonical storage for Apps Script flows; Supabase storage/tables are used by the alternate front-end flows.

Two client flavors (important)
- There are two coexisting approaches — pick one and be consistent when changing behavior:
  - Apps Script RPC mode: server logic in `code.gs` is intended to be called via `google.script.run` (file uploads as base64 blobs). See example helpers in `code.gs` (e.g., `Utilities.newBlob`, `file.setSharing`).
  - Supabase client mode: `Index.html` (and `supabase.js`) implements UI flows that use Supabase Storage and Tables directly (e.g., upload + insert). If you modify the client, confirm whether it should call `google.script.run` or Supabase APIs.

Core helpers & patterns
- Reuse server helpers in `code.gs`: `getSheet(name)`, `clean(v)`, `ensureExpedienteCasa(idUnico,row)`, `getOrCreateFolder(parentId,name)`, `getFolderIdFromUrl(url)`. See [code.gs](code.gs#L20-L70).
- Sheet indexing: `getDataRange().getValues()` → 0-based arrays; sheet `getRange(row,col)` uses 1-based rows. Always convert indexes (`index + 1`).
- Drive uploads via Apps Script: create blobs from base64 and call `createFile(blob)`; then `file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW)` to persist public URLs.

Important RPC functions (server examples)
- `login(payload)` — find casas by WhatsApp (see [code.gs#L40-L60]).
- `getInfoCasa(idUnico)` — returns casa metadata and ensures expediente folder exists ([code.gs#L80-L110]).
- `subirReciboLuz(payload)` — accepts `{ idUnico, archivo }` where `archivo` is `{ name, base64, mimeType }`, writes file to expediente and flips flags in `Casas` sheet ([code.gs#L120-L170]).
- `agregarMascota(payload)` / `getMascotasCasa(idUnico)` — manage mascotas rows and optional photo uploads ([code.gs#L180-L250]).
- `registrarPago(payload)` — creates folio folder in payments and appends a `Pagos` row ([code.gs#L260-L330]).

Sheet column mappings (Casas)
- `r[0]` → `idUnico` (col A)
- `r[7]` → `whatsapp` (col H)
- `r[9]` → `tieneRecibo` flag (col J)
- `r[10]` → `urlRecibo` (col K)
- Expediente URL: col 14 (N); timestamps written to col 17 (Q).
  Update these indices if you change the sheet layout — many functions rely on fixed indexes.

Local development & deployment
- No build step. Edit files directly or use `clasp` to sync with Apps Script for local edits.
- Deploy Apps Script via the Apps Script editor: `Deploy → New deployment`. Use `doGet()` (in `code.gs`) to serve `Index.html` when deploying server-backed flows.
- Debugging: use `Logger.log(...)` in `code.gs` for server logs; browser console for client logs; check Execution logs in Apps Script editor.

Security & secrets
- `supabase.js` contains the public Supabase URL + anon key (read-only by design). Do not add private keys or service_role keys to the repo.
- Apps Script-created Drive files are shared publicly here; changing sharing behavior will affect URLs stored in sheets.

How to add new RPC functions (server)
- Add a top-level function in `code.gs` that accepts a single `payload` object and mirrors existing shapes; it becomes callable from the UI via `google.script.run.<fn>`.
- For file uploads via Apps Script: accept `{ name, base64, mimeType }`, then `Utilities.newBlob(Utilities.base64Decode(base64), mimeType, name)` and `createFile(blob)`.

Files worth inspecting
- [code.gs](code.gs) — server logic, constants, and sheet-folder mappings.
- [Index.html](Index.html) — UI and client flows (note: it currently uses Supabase APIs directly).
- [supabase.js](supabase.js) — Supabase client and helper UI flows.

If anything here is unclear or you'd like the guidance adjusted (for example, to standardize on Apps Script RPC vs Supabase client flows), tell me which direction you prefer and I'll update this file.
# Copilot / AI agent instructions — Coto Melía app
# Copilot / AI agent instructions — Coto Melía app

Purpose
- Quick, actionable guide to be productive editing this Google Apps Script web app.

Big picture
- Single Google Apps Script project: server code is in [code.gs](code.gs), UI in [Index.html](Index.html) served by `doGet()`.
- Persistent data: a Google Sheet (ID set in `ID_SHEET` at top of [code.gs](code.gs#L1-L10)). Files are stored in Drive folders configured with `FOLDER_EXPEDIENTES` and `FOLDER_PAGOS` constants.
- Client ↔ server RPC uses `google.script.run`; file uploads are sent from the browser as base64 (see file-readers in [Index.html](Index.html#L60)).

Core helpers & patterns to reuse
- `getSheet(name)`, `clean(v)`, `ensureExpedienteCasa(idUnico,row)`, `getOrCreateFolder(parentId,name)`, `getFolderIdFromUrl(url)` — prefer these over new low-level Drive/Sheet code. See [code.gs](code.gs#L20-L70).
- Row vs array indexing: `getDataRange().getValues()` gives a 0-based JS array; sheet `getRange(row,col)` expects 1-based rows. Convert with `index + 1`.
- Drive files are created from blobs via `Utilities.newBlob(Utilities.base64Decode(...))` and then shared with `file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW)` (public URLs are stored in sheets).

Important RPC endpoints (examples)
- `login({ whatsappE164 })` — finds casas by WhatsApp (used in `doLogin()` in [Index.html](Index.html#L60)).
- `getInfoCasa(idUnico)` — returns basic casa fields and ensures expediente folder exists.
- `subirReciboLuz({ idUnico, archivo })` — receives `{name, base64, mimeType}`, creates file in expediente, flips flag in `Casas` sheet.
- `agregarMascota({ idUnico, nombre, especie, foto })` and `getMascotasCasa(idUnico)` — add/list mascotas (photo optional).
- `registrarPago({ idUnico, whatsappE164, concepto, monto, comprobante })` — creates folio folder under payments and appends a `Pagos` row.

Sheet column mappings (checked in `Casas`)
- `r[0]` → `idUnico` (col A)
- `r[7]` → `whatsapp` (col H)
- `r[9]` → `tieneRecibo` flag (col J)
- `r[10]` → `urlRecibo` (col K)
- expediente URL stored in col 14 (N); timestamps written to col 17 (Q).
Update these indices when you change sheet layout.

Local development & debugging
- No build step. Edit in Apps Script editor or use `clasp` for local edits + deploy.
- Run the web UI via Apps Script “Deploy → New deployment” or editor preview.
- Server logs: use `Logger.log(...)` in `code.gs` and check Execution logs in the Apps Script editor. Client-side: use browser console.

Security & secrets
- `supabase.js` contains a public Supabase URL & anon key (see [supabase.js](supabase.js#L1-L20)). Treat private keys carefully; this repo currently exposes the anon key—do not add secret keys here.
- Drive files created are shared publicly by design; be mindful when changing sharing behavior.

How to add new RPC functions
- Add a top-level function in [code.gs](code.gs), accept a single object payload, and mirror existing shapes (e.g., `{ idUnico, ... }`). The function becomes available to the client via `google.script.run.<fn>`.
- For file uploads: accept an `{ name, base64, mimeType }` object and create a blob with `Utilities.newBlob(Utilities.base64Decode(base64), mimeType, name)`.

Files worth inspecting
- [code.gs](code.gs) — all server logic and constants.
- [Index.html](Index.html) — client flows, `google.script.run` usage, FileReader→base64 examples.
- [supabase.js](supabase.js) — contains public Supabase client initialization (note the anon key).

If any section is unclear or you'd like concrete examples (new RPC, column remap, or clasp setup), tell me which area to expand and I'll update this file.
