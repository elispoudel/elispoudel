/**
 * Google Apps Script backend for Elis Poudel chapter/PDF site.
 *
 * Deploy: Extensions → Apps Script → paste this file → Deploy → New deployment
 * Type: Web app → Execute as: Me → Who has access: Anyone
 *
 * Set FOLDER_ID and UPLOAD_SECRET below before deploying.
 */

const FOLDER_ID = '1gb7Xww7_180OqOzknfm4XJhjpIu7NGZN';
const UPLOAD_SECRET = 'pbs@123';
const MANIFEST_NAME = 'chapters-manifest.json';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'chapters';

  try {
    if (action === 'chapters') {
      return jsonResponse(getChaptersData());
    }

    if (action === 'pdf') {
      const fileId = e.parameter.fileId;
      if (!fileId) {
        return jsonResponse({ error: 'Missing fileId' }, 400);
      }
      return servePdf(fileId);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  try {
    if (action === 'upload') {
      return handleUpload_(e);
    }

    if (action === 'saveChapters') {
      return handleSaveChapters_(e);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

function handleUpload_(e) {
  assertConfig_();
  const secret = e.parameter.secret;
  if (secret !== UPLOAD_SECRET) {
    return respond_(e, { error: 'Unauthorized — UPLOAD_SECRET in Code.gs must match uploadSecret in drive-config.js' }, 401);
  }

  const body = parseBody_(e);
  const fileName = body.fileName;
  const mimeType = body.mimeType || 'application/pdf';
  const base64 = body.data;

  if (!fileName || !base64) {
    return respond_(e, { error: 'Missing fileName or data' }, 400);
  }

  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return respond_(e, {
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    viewUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view',
  });
}

function handleSaveChapters_(e) {
  assertConfig_();
  const secret = e.parameter.secret;
  if (secret !== UPLOAD_SECRET) {
    return respond_(e, { error: 'Unauthorized — UPLOAD_SECRET in Code.gs must match uploadSecret in drive-config.js' }, 401);
  }

  const data = parseBody_(e);
  saveChaptersData(data);
  return respond_(e, { success: true });
}

function getChaptersData() {
  assertConfig_();
  const folder = DriveApp.getFolderById(getFolderId_());
  const files = folder.getFilesByName(MANIFEST_NAME);

  if (files.hasNext()) {
    const file = files.next();
    try {
      return JSON.parse(file.getBlob().getDataAsString());
    } catch (err) {
      Logger.log('Invalid chapters manifest: ' + err);
      return getDefaultChapters_();
    }
  }

  return getDefaultChapters_();
}

function saveChaptersData(data) {
  const folder = DriveApp.getFolderById(getFolderId_());
  const json = JSON.stringify(data, null, 2);
  const blob = Utilities.newBlob(json, 'application/json', MANIFEST_NAME);

  const existing = folder.getFilesByName(MANIFEST_NAME);
  if (existing.hasNext()) {
    existing.next().setContent(json);
  } else {
    folder.createFile(blob);
  }
}

function getFolderId_() {
  if (!FOLDER_ID) {
    return FOLDER_ID;
  }
  const match = FOLDER_ID.match(/[-\w]{25,}/);
  return match ? match[0] : FOLDER_ID;
}

function servePdf(fileId) {
  const file = DriveApp.getFileById(fileId);
  return ContentService.createBlobOutput(file.getBlob());
}

function getDefaultChapters_() {
  return {
    '6': { title: 'Class 6', chapters: [] },
    '7': { title: 'Class 7', chapters: [] },
    '8': { title: 'Class 8', chapters: [] },
    '9': { title: 'Class 9', chapters: [] },
    '10': { title: 'Class 10', chapters: [] },
  };
}

function assertConfig_() {
  if (!FOLDER_ID || FOLDER_ID.indexOf('PASTE_') === 0) {
    throw new Error('Set FOLDER_ID in Code.gs to your Google Drive folder ID, then Deploy → New deployment.');
  }
  if (!UPLOAD_SECRET || UPLOAD_SECRET.indexOf('change-this') === 0) {
    throw new Error('Set UPLOAD_SECRET in Code.gs (same value as uploadSecret in drive-config.js), then redeploy.');
  }
}

function parseBody_(e) {
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }
  throw new Error('Missing request body');
}

function respond_(e, obj, status) {
  if (e.parameter.response === 'postMessage') {
    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><body><script>parent.postMessage(' +
        JSON.stringify(obj) +
        ',"*");</script></body></html>'
    ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return jsonResponse(obj, status);
}

function jsonResponse(obj, status) {
  const output = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
  return output;
}

/**
 * One-time helper: run this from the Apps Script editor to seed chapters-manifest.json
 * from your existing chapters.json content (paste JSON into seedChaptersFromEditor).
 */
function seedManifestFromDefault() {
  const data = getDefaultChapters_();
  saveChaptersData(data);
  Logger.log('Manifest created in Drive folder.');
}
