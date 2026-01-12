/***********************************************************
 * CONFIGURACIÓN GENERAL
 ***********************************************************/
const ID_SHEET = '18WutALIVlTyjDMemf29HMgQFVI5_3brQIRLuITMjsUs';

// Carpetas raíz en Drive
const FOLDER_EXPEDIENTES = '1kePtZzWobZLrUUKsUaPPY3iCEHlq5kJV'; // Expedientes_Vecinos
const FOLDER_PAGOS       = '1XmVuEaDoLxKG1OO9ogHoyan_I8mRje8c'; // Comprobantes_Pagos

/***********************************************************
 * doGet
 ***********************************************************/
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Administración Coto Melía')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/***********************************************************
 * UTILIDADES
 ***********************************************************/
function getSheet(name) {
  const sh = SpreadsheetApp.openById(ID_SHEET).getSheetByName(name);
  if (!sh) throw new Error(`Hoja no encontrada: ${name}`);
  return sh;
}

function clean(v) {
  return String(v || '').trim();
}

function getOrCreateFolder(parentId, name) {
  const parent = DriveApp.getFolderById(parentId);
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function getFolderIdFromUrl(url) {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/***********************************************************
 * LOGIN
 ***********************************************************/
function login(payload) {
  const sh = getSheet('Casas');
  const data = sh.getDataRange().getValues();
  const wa = clean(payload.whatsappE164);

  const casas = data.slice(1)
    .filter(r => clean(r[7]) === wa)
    .map(r => r[0]);

  return { casas };
}

/***********************************************************
 * EXPEDIENTE POR CASA
 ***********************************************************/
function ensureExpedienteCasa(idUnico, rowIndex) {
  const sh = getSheet('Casas');
  const urlActual = clean(sh.getRange(rowIndex, 14).getValue());

  if (urlActual) return urlActual;

  const folder = getOrCreateFolder(FOLDER_EXPEDIENTES, idUnico);
  const url = folder.getUrl();

  sh.getRange(rowIndex, 14).setValue(url);
  sh.getRange(rowIndex, 17).setValue(new Date());

  return url;
}

/***********************************************************
 * INFO CASA
 ***********************************************************/
function getInfoCasa(idUnico) {
  const sh = getSheet('Casas');
  const data = sh.getDataRange().getValues();
  const rowIndex = data.findIndex(r => clean(r[0]) === idUnico);

  if (rowIndex === -1) throw new Error('Casa no encontrada');

  const r = data[rowIndex];
  ensureExpedienteCasa(idUnico, rowIndex + 1);

  return {
    idUnico: r[0],
    whatsapp: r[7],
    tieneRecibo: r[9] === 'SI',
    urlRecibo: r[10],
    estatusExpediente: r[12]
  };
}

/***********************************************************
 * RECIBO DE LUZ (UNA SOLA VEZ)
 ***********************************************************/
function subirReciboLuz(payload) {
  const sh = getSheet('Casas');
  const data = sh.getDataRange().getValues();
  const rowIndex = data.findIndex(r => clean(r[0]) === payload.idUnico);

  if (rowIndex === -1) throw new Error('Casa no encontrada');
  if (data[rowIndex][9] === 'SI') {
    return { ok: false, motivo: 'RECIBO_YA_REGISTRADO' };
  }

  const expedienteUrl = ensureExpedienteCasa(payload.idUnico, rowIndex + 1);
  const folderId = getFolderIdFromUrl(expedienteUrl);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(payload.archivo.base64),
    payload.archivo.mimeType,
    payload.archivo.name
  );

  const file = DriveApp.getFolderById(folderId).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

  sh.getRange(rowIndex + 1, 10).setValue('SI');
  sh.getRange(rowIndex + 1, 11).setValue(file.getUrl());
  sh.getRange(rowIndex + 1, 17).setValue(new Date());

  return { ok: true };
}

/***********************************************************
 * MASCOTAS
 ***********************************************************/
function agregarMascota(payload) {
  const shM = getSheet('Mascotas');
  const shC = getSheet('Casas');
  const casas = shC.getDataRange().getValues();

  const rowCasa = casas.findIndex(r => clean(r[0]) === payload.idUnico);
  if (rowCasa === -1) throw new Error('Casa no encontrada');

  const expedienteUrl = ensureExpedienteCasa(payload.idUnico, rowCasa + 1);
  const folderId = getFolderIdFromUrl(expedienteUrl);

  let fotoUrl = '';
  if (payload.foto) {
    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.foto.base64),
      payload.foto.mimeType,
      payload.foto.name
    );
    const file = DriveApp.getFolderById(folderId).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    fotoUrl = file.getUrl();
  }

  shM.appendRow([
    'MASC-' + Date.now(),
    payload.idUnico,
    payload.especie,
    payload.nombre,
    fotoUrl,
    'ACTIVA',
    new Date()
  ]);

  shC.getRange(rowCasa + 1, 12).setValue('SI');
  shC.getRange(rowCasa + 1, 17).setValue(new Date());

  return { ok: true };
}

function getMascotasCasa(idUnico) {
  return getSheet('Mascotas')
    .getDataRange().getValues().slice(1)
    .filter(r => clean(r[1]) === idUnico && r[5] === 'ACTIVA')
    .map(r => ({ nombre: r[3], especie: r[2] }));
}

/***********************************************************
 * PAGOS (REGISTRO CON FOLIO)
 ***********************************************************/
function registrarPago(payload) {
  const folio = `F-${new Date().getFullYear()}-${Math.floor(Math.random()*90000+10000)}`;
  const sh = getSheet('Pagos');

  const casaFolder = getOrCreateFolder(FOLDER_PAGOS, payload.idUnico);
  const pagoFolder = casaFolder.createFolder(folio);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(payload.comprobante.base64),
    payload.comprobante.mimeType,
    payload.comprobante.name
  );

  const file = pagoFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

  sh.appendRow([
    folio,
    new Date().getFullYear(),
    '',
    payload.concepto,
    new Date(),
    payload.idUnico,
    '',
    '',
    payload.whatsappE164,
    payload.monto,
    'MXN',
    payload.concepto,
    '',
    '',
    file.getUrl(),
    payload.comprobante.name,
    '',
    '',
    'PENDIENTE'
  ]);

  return { ok: true, folio };
}
