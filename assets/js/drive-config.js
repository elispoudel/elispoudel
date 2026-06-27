/**
 * Google Drive / Apps Script configuration.
 *
 * 1. Follow GOOGLE-DRIVE-SETUP.md to create Drive folder + deploy Apps Script.
 * 2. Edit this file: /assets/js/drive-config.js
 * 3. Set enabled: true when ready (falls back to chapters.json when false).
 */
const DRIVE_CONFIG = {
  enabled: true,
  webAppUrl: 'https://script.google.com/macros/s/AKfycbzAO-tZRQhWXjf5vTzxyOwNT3UwVEMgHZICnx_V73VbkVaZKF9lSAo8PavBDnhHZfFyWg/exec',
  uploadSecret: 'pbs@123',
};
