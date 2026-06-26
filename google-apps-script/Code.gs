/**
 * Google Apps Script backend for Elis Poudel chapter/PDF site.
 *
 * Deploy: Extensions → Apps Script → paste this file → Deploy → New deployment
 * Type: Web app → Execute as: Me → Who has access: Anyone
 *
 * Set FOLDER_ID and UPLOAD_SECRET below before deploying.
 */

const FOLDER_ID = 'PASTE_YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE';
const UPLOAD_SECRET = 'change-this-to-a-long-random-secret';
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
  const secret = e.parameter.secret;
  if (secret !== UPLOAD_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const body = JSON.parse(e.postData.contents);
  const fileName = body.fileName;
  const mimeType = body.mimeType || 'application/pdf';
  const base64 = body.data;

  if (!fileName || !base64) {
    return jsonResponse({ error: 'Missing fileName or data' }, 400);
  }

  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return jsonResponse({
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    viewUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view',
  });
}

function handleSaveChapters_(e) {
  const secret = e.parameter.secret;
  if (secret !== UPLOAD_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const data = JSON.parse(e.postData.contents);
  saveChaptersData(data);
  return jsonResponse({ success: true });
}

function getChaptersData() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFilesByName(MANIFEST_NAME);

  if (files.hasNext()) {
    const file = files.next();
    return JSON.parse(file.getBlob().getDataAsString());
  }

  return getDefaultChapters_();
}

function saveChaptersData(data) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const json = JSON.stringify(data, null, 2);
  const blob = Utilities.newBlob(json, 'application/json', MANIFEST_NAME);

  const existing = folder.getFilesByName(MANIFEST_NAME);
  if (existing.hasNext()) {
    existing.next().setContent(json);
  } else {
    folder.createFile(blob);
  }
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
