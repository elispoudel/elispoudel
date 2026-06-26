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
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load chapters from Google Drive');
        return await res.json();
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

    const res = await fetch('chapters.json');
    return await res.json();
  },

  async saveChapters(chaptersData) {
    localStorage.setItem('chaptersData', JSON.stringify(chaptersData));

    if (!this.isEnabled()) {
      return { success: true, localOnly: true };
    }

    const url = `${DRIVE_CONFIG.webAppUrl}?action=saveChapters&secret=${encodeURIComponent(DRIVE_CONFIG.uploadSecret)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(chaptersData),
    });

    const result = await res.json();
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to save chapters online');
    }
    return result;
  },

  async uploadPdf(file) {
    if (!this.isEnabled()) {
      throw new Error('Google Drive is not configured. See GOOGLE-DRIVE-SETUP.md');
    }

    const base64 = await this.fileToBase64(file);
    const url = `${DRIVE_CONFIG.webAppUrl}?action=upload&secret=${encodeURIComponent(DRIVE_CONFIG.uploadSecret)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        data: base64,
      }),
    });

    const result = await res.json();
    if (!res.ok || result.error) {
      throw new Error(result.error || 'PDF upload failed');
    }
    return result;
  },

  getPdfUrl(chapter) {
    if (chapter.driveFileId && this.isEnabled()) {
      return `${DRIVE_CONFIG.webAppUrl}?action=pdf&fileId=${encodeURIComponent(chapter.driveFileId)}`;
    }

    let pdfPath = chapter.pdfFile || '';
    if (pdfPath.startsWith('http')) return pdfPath;
    if (!pdfPath.startsWith('/')) pdfPath = `assets/pdfs/${pdfPath}`;
    return pdfPath;
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};
