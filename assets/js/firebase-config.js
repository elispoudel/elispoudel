/**
 * Firebase configuration for Elis Poudel chapter/PDF site.
 *
 * 1. Follow docs/FIREBASE-SETUP.md to create your Firebase project.
 * 2. Paste your web app config values below.
 * 3. Set enabled: true when ready (falls back to assets/data/chapters.json when false).
 */
const FIREBASE_CONFIG = {
  enabled: true,
  adminEmail: 'admin@elispoudel.com.np',
  studentEmailSuffix: '@students.elispoudel.com.np',
  firebase: {
    apiKey: "AIzaSyD_jEHD5WkQehssBLfr0noLCoh1U7QWvec",
  authDomain: "elispoudel-pdfs-df473.firebaseapp.com",
  projectId: "elispoudel-pdfs-df473",
  storageBucket: "elispoudel-pdfs-df473.firebasestorage.app",
  messagingSenderId: "166923776597",
  appId: "1:166923776597:web:07e0f4bc3acc10fc319adc",
  },
  collections: {
    chaptersDoc: 'chapters/manifest',
    users: 'users',
  },
};

