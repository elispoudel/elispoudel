/**
 * Client service for chapter data and PDF uploads via Google Apps Script + Drive.
 */
const DriveService = {
  isEnabled() {
    return typeof DRIVE_CONFIG !== 'undefined' && DRIVE_CONFIG.enabled && DRIVE_CONFIG.webAppUrl;
  },

  async fetchChapters() {
    if (this.isEnabled()) {
      try {
        const url = `${DRIVE_CONFIG.webAppUrl}?action=chapters`;
        const result = await this.gasGetJson(url);
        localStorage.setItem('chaptersData', JSON.stringify(result));
        return result;
      } catch (err) {
        console.warn('Drive fetch failed, using local fallback:', err);
      }
    }

    const stored = localStorage.getItem('chaptersData');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing localStorage chapters:', e);
      }
    }

    const chaptersUrl =
      typeof SITE !== 'undefined'
        ? SITE.data.chapters
        : typeof sitePath === 'function'
          ? sitePath('/assets/data/chapters.json')
          : '../assets/data/chapters.json';
    const res = await fetch(chaptersUrl);
    return await res.json();
  },

  async saveChapters(chaptersData) {
    localStorage.setItem('chaptersData', JSON.stringify(chaptersData));

    if (!this.isEnabled()) {
      return { success: true, localOnly: true };
    }

    const url = `${DRIVE_CONFIG.webAppUrl}?action=saveChapters&secret=${encodeURIComponent(DRIVE_CONFIG.uploadSecret)}`;
    return await this.gasPostJson(url, chaptersData);
  },

  async uploadPdf(file) {
    if (!this.isEnabled()) {
      throw new Error('Google Drive is not configured. See GOOGLE-DRIVE-SETUP.md');
    }

    if (file.size > 25 * 1024 * 1024) {
      throw new Error('PDF too large (max 25 MB). Compress the file and try again.');
    }

    const base64 = await this.fileToBase64(file);
    const url = `${DRIVE_CONFIG.webAppUrl}?action=upload&secret=${encodeURIComponent(DRIVE_CONFIG.uploadSecret)}`;

    const payload = {
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      data: base64,
    };

    console.debug('DriveService.uploadPdf()', { url, fileName: file.name });
    const result = await this.gasPostJson(url, payload);
    console.debug('DriveService.uploadPdf result', result);

    if (!result || !result.fileId) {
      throw new Error('Upload completed but did not return a valid file ID.');
    }

    return result;
  },

  async gasGetJson(url) {
    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new Error(
        'Cannot reach Google Apps Script. Open the site via https://elispoudel.com.np (not as a local file). ' +
          'Also check webAppUrl in drive-config.js and that the script is deployed with access set to Anyone.'
      );
    }
    return this.parseGasResponse(res);
  },

  async gasPostJson(url, payload) {
    console.debug('DriveService.gasPostJson()', { url, payload });
    let res;
    try {
      const body = new URLSearchParams({ payload: JSON.stringify(payload) });
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'Accept': 'application/json',
        },
        body: body.toString(),
        mode: 'cors',
        credentials: 'omit',
      });
    } catch (err) {
      console.warn('DriveService.gasPostJson failed, falling back to iframe:', err);
      return this.gasPostViaIframe(url + (url.includes('response=postMessage') ? '' : '&response=postMessage'), payload);
    }
    return this.parseGasResponse(res);
  },

  async parseGasResponse(res) {
    const text = await res.text();
    console.debug('DriveService.parseGasResponse()', { status: res.status, text });
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      const normalized = text.toLowerCase();
      if (normalized.includes('parent.postmessage')) {
        const match = text.match(/parent\.postMessage\((\{[\s\S]*?\}),/);
        if (match && match[1]) {
          try {
            result = JSON.parse(match[1]);
          } catch (innerErr) {
            console.warn('DriveService.parseGasResponse failed to parse embedded JSON:', innerErr);
          }
        }
      }
      if (!result) {
        if (normalized.includes('authorization is required') || normalized.includes('sign in')) {
          throw new Error('Apps Script access must be set to "Anyone" (not "Anyone with Google account"). Redeploy the web app.');
        }
        if (normalized.includes('script function doget') || normalized.includes('script function dopost')) {
          throw new Error('The Apps Script deployment URL is not the correct web app deployment. Open the Apps Script project, deploy a new web app, and update webAppUrl in drive-config.js.');
        }
        throw new Error('Invalid response from Apps Script. Redeploy after setting FOLDER_ID and UPLOAD_SECRET in Code.gs.');
      }
    }
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Request failed');
    }
    return result;
  },

  gasPostViaIframe(url, payload) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Upload timed out. Check FOLDER_ID and UPLOAD_SECRET in Apps Script match drive-config.js, then redeploy.'));
      }, 120000);

      function onMessage(event) {
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        if (data.success === undefined && !data.error) return;
        cleanup();
        if (data.error) reject(new Error(data.error));
        else resolve(data);
      }

      const iframe = document.createElement('iframe');
      iframe.name = 'gas_frame_' + Date.now();
      iframe.style.display = 'none';

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      form.target = iframe.name;
      form.style.display = 'none';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(payload);
      form.appendChild(input);

      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        iframe.remove();
        form.remove();
      }

      window.addEventListener('message', onMessage, false);
      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
    });
  },

  getPdfUrl(chapter) {
    if (chapter.driveFileId && this.isEnabled()) {
      return `${DRIVE_CONFIG.webAppUrl}?action=pdf&fileId=${encodeURIComponent(chapter.driveFileId)}`;
    }

    let pdfPath = chapter.pdfFile || '';
    if (pdfPath.startsWith('http')) return pdfPath;
    const pdfBase =
      typeof SITE !== 'undefined'
        ? SITE.assets.pdfs
        : typeof sitePath === 'function'
          ? sitePath('/assets/pdfs/')
          : '../assets/pdfs/';
    if (!pdfPath.startsWith('/')) pdfPath = `${pdfBase}${pdfPath}`;
    return pdfPath;
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};
