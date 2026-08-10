/* PDF Viewer powered by PDF.js
   Usage: trigger a click on any element with `data-pdf-id` or `data-pdf-url` attributes.
   Example: <a href="#" data-pdf-id="FILE_ID">Open PDF</a>
*/
(function () {
  if (window.PDFViewer) return; // singleton

  const pdfModalHtml = `
    <div class="pdf-modal" id="pdfModal" role="dialog" aria-hidden="true">
      <div class="pdf-reader" role="document">
        <div class="pdf-toolbar">
          <div class="pdf-title" id="pdfTitleBar" style="font-weight:600; margin-right:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:420px"></div>
          <div class="group">
            <button id="pdfPrev" aria-label="Previous page">‹ Prev</button>
            <button id="pdfNext" aria-label="Next page">Next ›</button>
            <span class="page-indicator" id="pdfPageIndicator">0 / 0</span>
          </div>
          <div class="group">
            <button id="pdfZoomOut" aria-label="Zoom out">-</button>
            <button id="pdfZoomReset" aria-label="Reset zoom">100%</button>
            <button id="pdfZoomIn" aria-label="Zoom in">+</button>
          </div>
          <button id="pdfClose" class="pdf-close" aria-label="Close viewer">✕</button>
        </div>
        <div class="pdf-canvas-wrap">
          <div class="pdf-loader" id="pdfLoader">
            <div>
              <svg width="48" height="48" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round">
                  <animate attributeName="stroke-dasharray" values="1,150;90,150;90,150" dur="1.4s" repeatCount="indefinite" />
                  <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          </div>
          <canvas id="pdfCanvas" class="pdf-canvas" role="img"></canvas>
          <div id="pdfError" class="pdf-error" style="display:none"></div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', pdfModalHtml);

  const modal = document.getElementById('pdfModal');
  const canvas = document.getElementById('pdfCanvas');
  const loader = document.getElementById('pdfLoader');
  const errorEl = document.getElementById('pdfError');
  const ctx = canvas.getContext('2d');

  const prevBtn = document.getElementById('pdfPrev');
  const nextBtn = document.getElementById('pdfNext');
  const pageIndicator = document.getElementById('pdfPageIndicator');
  const zoomInBtn = document.getElementById('pdfZoomIn');
  const zoomOutBtn = document.getElementById('pdfZoomOut');
  const zoomResetBtn = document.getElementById('pdfZoomReset');
  const closeBtn = document.getElementById('pdfClose');

  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let scale = 1.0;
  let pageRendering = false;
  let pendingPage = null;
  let lastTap = 0;

  // configure pdfjs worker
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
  }

  function showModal() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function hideModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // cleanup
    if (pdfDoc) {
      pdfDoc.destroy();
      pdfDoc = null;
    }
    canvas.width = canvas.height = 0;
    errorEl.style.display = 'none';
  }

  function showLoader(active) {
    if (active) loader.classList.add('active');
    else loader.classList.remove('active');
  }

  function showError(msg) {
    errorEl.style.display = 'block';
    errorEl.textContent = msg;
  }

        if (!res.ok) {
          // Provide actionable guidance for common failures
          if (lastStatus === 404) {
            throw new Error('PDF not found (404). Check the Apps Script webAppUrl, deployment, and that the fileId is correct.');
          }
          if (lastStatus === 403) {
            throw new Error('Access denied (403). Ensure the Drive file is shared appropriately or the Apps Script web app allows access.');
          }
          throw new Error(`Network response ${lastStatus}`);
        }

        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('pdf')) {
          // Non-PDF response — capture a short snippet to help debugging (e.g., HTML error or login page)
          let snippet = '';
          try {
            const text = await res.text();
            snippet = text.slice(0, 1500);
          } catch (e) {
            snippet = '(unable to read response text)';
          }
          throw new Error(`Server returned content-type '${contentType}' instead of 'application/pdf'. Response snippet: ${snippet}`);
        }

        const arrayBuffer = await res.arrayBuffer();
      const ratio = maxWidth / viewport.width;
      const renderScale = Math.min(scale, Math.max(0.5, ratio));
      const vp = page.getViewport({ scale: renderScale });

      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: vp,
      };

      const renderTask = page.render(renderContext);
      await renderTask.promise;
      currentPage = num;
      pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    } catch (err) {
      console.error('Render page failed', err);
      showError('Unable to render PDF page.');
    } finally {
      pageRendering = false;
      showLoader(false);
      if (pendingPage !== null) {
        const next = pendingPage;
        pendingPage = null;
        renderPage(next);
      }
    }
  }

  function queueRenderPage(num) {
    if (pageRendering) {
      pendingPage = num;
    } else {
      renderPage(num);
    }
  }

  // Touch gestures: swipe for prev/next, pinch to zoom, double-tap to reset/zoom
  let touchState = { startX: 0, startY: 0, startDist: 0, pinch: false };
  function getDist(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }

  modal.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchState.startX = e.touches[0].clientX;
      touchState.startY = e.touches[0].clientY;
      touchState.pinch = false;
    } else if (e.touches.length === 2) {
      touchState.startDist = getDist(e.touches[0], e.touches[1]);
      touchState.pinch = true;
    }
  }, { passive: true });

  modal.addEventListener('touchmove', (e) => {
    if (touchState.pinch && e.touches.length === 2) {
      const dist = getDist(e.touches[0], e.touches[1]);
      const factor = dist / touchState.startDist;
      const newScale = Math.min(3.0, Math.max(0.5, scale * factor));
      scale = newScale;
      zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
      queueRenderPage(currentPage);
      // update baseline dist to allow smooth continuous pinch
      touchState.startDist = dist;
    }
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    if (!touchState.pinch && e.changedTouches && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchState.startX;
      const dy = e.changedTouches[0].clientY - touchState.startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) onNextPage(); else onPrevPage();
      } else {
        // detect double tap
        const now = Date.now();
        if (now - lastTap < 300) {
          // double-tap: toggle zoom reset
          if (scale > 1) onZoomReset(); else onZoomIn();
          lastTap = 0;
        } else {
          lastTap = now;
        }
      }
    }
    if (touchState.pinch) touchState.pinch = false;
  });

  function onPrevPage() {
    if (!pdfDoc) return;
    if (currentPage <= 1) return;
    queueRenderPage(currentPage - 1);
  }
  function onNextPage() {
    if (!pdfDoc) return;
    if (currentPage >= totalPages) return;
    queueRenderPage(currentPage + 1);
  }

  function onZoomIn() {
    scale = Math.min(3.0, scale + 0.25);
    zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(currentPage);
  }
  function onZoomOut() {
    scale = Math.max(0.5, scale - 0.25);
    zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(currentPage);
  }
  function onZoomReset() {
    scale = 1.0;
    zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(currentPage);
  }

  prevBtn.addEventListener('click', onPrevPage);
  nextBtn.addEventListener('click', onNextPage);
  zoomInBtn.addEventListener('click', onZoomIn);
  zoomOutBtn.addEventListener('click', onZoomOut);
  zoomResetBtn.addEventListener('click', onZoomReset);
  closeBtn.addEventListener('click', hideModal);

  // keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('open')) {
      if (e.key === 'ArrowRight') onNextPage();
      else if (e.key === 'ArrowLeft') onPrevPage();
      else if (e.key === 'Escape') hideModal();
    }
  });

  // responsive: re-render on resize (debounced)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (!pdfDoc) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => queueRenderPage(currentPage), 250);
  });

  async function loadPdfFromUrl(url, fileId) {
    if (!window.pdfjsLib) {
      showError('PDF.js library not loaded.');
      return;
    }
    showLoader(true);
    try {
      // fetch the PDF as arrayBuffer; include credentials to preserve auth if needed
      let res = await fetch(url, { credentials: 'include' });
      let lastStatus = res.status;
      if (!res.ok) {
        // try fallback for Google Drive files when Apps Script endpoint returns 404
        if (fileId) {
          const fallback = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
          console.warn('Primary PDF fetch failed, trying Drive fallback:', res.status, fallback);
          res = await fetch(fallback, { credentials: 'include' });
          lastStatus = res.status;
        }
      }
      if (!res.ok) {
        // Provide actionable guidance for common failures
        if (lastStatus === 404) {
          throw new Error('PDF not found (404). Check the Apps Script webAppUrl, deployment, and that the fileId is correct.');
        }
        if (lastStatus === 403) {
          throw new Error('Access denied (403). Ensure the Drive file is shared appropriately or the Apps Script web app allows access.');
        }
        throw new Error(`Network response ${lastStatus}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;
      currentPage = 1;
      scale = 1.0;
      zoomResetBtn.textContent = `${Math.round(scale * 100)}%`;
      pageIndicator.textContent = `0 / ${totalPages}`;
      queueRenderPage(currentPage);
    } catch (err) {
      console.error('Failed to load PDF', err);
      showError('Failed to load PDF. The file may be missing or access is restricted.');
      showLoader(false);
    }
  }

  // public API: open viewer with url or drive file id
  async function openViewer({ url, fileId } = {}) {
    errorEl.style.display = 'none';
    if (!url && fileId) {
      // Prefer DriveService if available (respects apps script proxy), otherwise build a direct Drive download URL
      try {
        if (window.DriveService && typeof DriveService.getPdfUrl === 'function') {
          url = DriveService.getPdfUrl({ driveFileId: fileId });
        }
      } catch (e) {
        console.warn('DriveService.getPdfUrl failed:', e);
      }

      if (!url) {
        url = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
        console.debug('Using Drive fallback URL for fileId', fileId, url);
      }
    }

    if (!url) {
      showModal();
      showError('No PDF URL provided. Ensure the chapter includes a `driveFileId` or `pdfFile` path.');
      return;
    }
    // set title
    try {
      const titleText = (url && url.split('/').pop()) || (fileId ? `File ${fileId}` : 'PDF Document');
      const titleEl = document.getElementById('pdfTitleBar');
      if (titleEl) titleEl.textContent = titleText;
    } catch (e) {
      console.warn('Failed to set title', e);
    }

    showModal();
    await loadPdfFromUrl(url, fileId);
  }

  // global handler: any element clicked with data-pdf-id or data-pdf-url
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-pdf-id], [data-pdf-url]');
    if (!el) return;
    e.preventDefault();
    const fileId = el.getAttribute('data-pdf-id');
    const url = el.getAttribute('data-pdf-url');
    openViewer({ url: url || undefined, fileId: fileId || undefined });
  });

  // expose for other modules
  window.PDFViewer = {
    open: openViewer,
    close: hideModal,
  };

  // Diagnostic helper: test Apps Script endpoint and Drive fallback for a fileId
  async function diagnoseFileId(fileId) {
    if (!fileId) throw new Error('fileId required');
    const results = [];

    // build primary Apps Script URL if possible
    let primaryUrl = null;
    try {
      if (window.DriveService && typeof DriveService.getPdfUrl === 'function') {
        primaryUrl = DriveService.getPdfUrl({ driveFileId: fileId });
      }
    } catch (e) {
      console.warn('DriveService.getPdfUrl failed during diagnose:', e);
    }

    if (!primaryUrl && window.DRIVE_CONFIG && DRIVE_CONFIG.webAppUrl) {
      primaryUrl = `${DRIVE_CONFIG.webAppUrl}?action=pdf&fileId=${encodeURIComponent(fileId)}`;
    }

    async function probe(url) {
      if (!url) return { url, error: 'no-url' };
      try {
        const res = await fetch(url, { credentials: 'include', method: 'GET' });
        const contentType = res.headers.get('content-type');
        let snippet = '';
        if (res.ok && contentType && contentType.indexOf('application/pdf') !== -1) {
          snippet = 'OK: PDF content-type';
        } else {
          try {
            const txt = await res.text();
            snippet = txt.slice(0, 800);
          } catch (e) {
            snippet = '(no text)';
          }
        }
        return { url, status: res.status, ok: res.ok, contentType, snippet };
      } catch (err) {
        return { url, error: err.message };
      }
    }

    results.push({ probe: 'primary', result: await probe(primaryUrl) });

    // fallback to direct Drive download
    const fallback = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
    results.push({ probe: 'drive-fallback', result: await probe(fallback) });

    return results;
  }

  window.PDFViewer.diagnose = diagnoseFileId;
})();
