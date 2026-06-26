/**
 * Root-relative paths for the site (works from any page depth).
 */
const APP_PATHS = {
  home: 'index.html',
  login: 'pages/login.html',
  dashboard: 'pages/dashboard.html',
  adminPanel: 'pages/admin-panel.html',
  classDetail: (classId) => `pages/class-detail.html?id=${classId}`,
  chaptersData: 'assets/data/chapters.json',
  assets: {
    css: 'assets/css/style.css',
    js: {
      paths: 'assets/js/paths.js',
      main: 'assets/js/main.js',
      firebaseConfig: 'assets/js/firebase-config.js',
      firebaseService: 'assets/js/firebase-service.js',
    },
  },
};
