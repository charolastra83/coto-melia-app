# Copilot / AI agent instructions — Coto Melía app

Purpose: quick guide for AI coding agents to be immediately productive in this Google Apps Script web app.

Big picture
- This is a single Google Apps Script web app: server logic lives in `code.gs`, UI in `Index.html` served by `doGet()`.
- Data is stored in a Google Sheet (ID configured in `ID_SHEET`) and files are stored in Drive folders (constants `FOLDER_EXPEDIENTES`, `FOLDER_PAGOS`). See [code.gs](code.gs#L1-L10).
- Client ↔ server RPC uses `google.script.run` (see [Index.html](Index.html)). File uploads use base64 transfer (client FileReader → server Utilities.base64Decode + Utilities.newBlob).

Key patterns & conventions
- Sheet access: `getSheet(name)` → `sheet.getDataRange().getValues()`; code searches the returned 2D array with `findIndex` and then uses `rowIndex + 1` when calling `sheet.getRange(...)` because sheet rows are 1-based. Be careful mixing zero-based `r[...]` array indices and 1-based `.getRange(row, col)` calls.
- Column mappings (observed in `Casas` sheet):
  - `r[0]` → idUnico (col A / 1)
  - `r[7]` → whatsapp (col H / 8)
  - `r[9]` → tieneRecibo flag (col J / 10)
  - `r[10]` → urlRecibo (col K / 11)
  - expediente URL written to col 14 (N) and timestamps to col 17 (Q) — update these indices if sheet layout changes.
- Drive & files: folders are found/created via `getOrCreateFolder(parentId, name)`; files are created from blobs and then shared with `file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW)` — be mindful of public visibility.
- Base64 file upload flow (exact example): client reads file with `FileReader`, sends `{ name, base64, mimeType }` to server; server does `Utilities.base64Decode(...)`, `Utilities.newBlob(...)`, `createFile(...)` and stores the returned `file.getUrl()` in the sheet. See `subirReciboLuz`, `agregarMascota`, and `registrarPago` in [code.gs](code.gs).

Common RPC functions to reference
- `login(payload)` — finds `idUnico` by whatsapp (used by client `doLogin`).
- `getInfoCasa(idUnico)` — returns basic casa info; calls `ensureExpedienteCasa` to create the expediente folder if missing.
- `subirReciboLuz(payload)` — one-time recibo upload; updates sheet flags and URL.
- `agregarMascota(payload)` / `getMascotasCasa(idUnico)` — photo optional, appends rows to `Mascotas` sheet.
- `registrarPago(payload)` — creates a folio folder under `FOLDER_PAGOS`, stores file and appends a row in `Pagos` sheet.

Developer workflows
- No build step. Edit code in the Apps Script editor or via clasp if you prefer local dev. To run the UI open the web app URL (Deploy → New deployment) or use the editor's web preview.
- Debugging: use `Logger.log(...)` in `code.gs` and check Execution logs in the Apps Script editor after running. For client-side, use browser console.
- When changing sheet layout: update the numeric column indices in `code.gs` (see column mapping above). When changing sheet IDs or target Drive folders, update `ID_SHEET`, `FOLDER_EXPEDIENTES`, and `FOLDER_PAGOS` at the top of `code.gs`.

Implementation notes for AI edits
- Prefer adding new top-level functions for RPC (they become callable from `google.script.run`). Mirror existing parameter shapes (objects with `idUnico`, `whatsappE164`, `archivo`/`comprobante` objects containing `name`, `base64`, `mimeType`).
- Use existing helpers: `getSheet`, `clean`, `ensureExpedienteCasa`, `getOrCreateFolder`, and `getFolderIdFromUrl` to avoid duplication.
- Be explicit about row vs array indexing: when you use `getDataRange().getValues()` operate on the array (zero-based), and convert to sheet row numbers with `index + 1` when calling `getRange`.

Files to inspect for context
- [code.gs](code.gs) — server logic, constants, and helpers.
- [Index.html](Index.html) — client UI and `google.script.run` usage patterns.

If anything above is unclear or you'd like examples for adding a new RPC or migrating sheet columns, tell me which change you want and I will update this file with concrete code edits.
