/**
 * Site paths — works locally (file://), GitHub Pages, and custom domain.
 * Paths resolve relative to the current page location.
 */
(function () {
  const pathname = location.pathname.replace(/\\/g, "/");
  const inApp = pathname.includes("/app/");
  const root = inApp ? ".." : ".";

  function sitePath(path) {
    if (!path.startsWith("/")) path = "/" + path;
    return root + path;
  }

  window.SITE = {
    root,
    pages: {
      home: sitePath("/index.html"),
      login: sitePath("/app/login.html"),
      dashboard: sitePath("/app/dashboard.html"),
      admin: sitePath("/app/admin-panel.html"),
      classDetail: sitePath("/app/class-detail.html"),
    },
    data: {
      chapters: sitePath("/assets/data/chapters.json"),
      classes: sitePath("/assets/data/data.json"),
    },
    assets: {
      css: sitePath("/assets/css/style.css"),
      js: {
        paths: sitePath("/assets/js/paths.js"),
        main: sitePath("/assets/js/main.js"),
        driveConfig: sitePath("/assets/js/drive-config.js"),
        driveService: sitePath("/assets/js/drive-service.js"),
      },
      pdfs: sitePath("/assets/pdfs/"),
      cv: sitePath("/assets/documents/elis-cv.pdf"),
      manifest: sitePath("/assets/manifest.json"),
      favicon: sitePath("/assets/images/favicon/icons.png"),
      images: sitePath("/assets/images/"),
      sw: sitePath("/sw.js"),
    },
  };

  window.sitePath = sitePath;

  window.classDetailUrl = function (classId) {
    return `${SITE.pages.classDetail}?id=${encodeURIComponent(classId)}`;
  };
})();
