/**
 * Client service for chapters and PDF uploads via Firebase Auth, Firestore, and Storage.
 */
const FirebaseService = {
  _initialized: false,

  isEnabled() {
    return (
      typeof FIREBASE_CONFIG !== 'undefined' &&
      FIREBASE_CONFIG.enabled &&
      FIREBASE_CONFIG.firebase.apiKey &&
      FIREBASE_CONFIG.firebase.apiKey !== 'YOUR_API_KEY'
    );
  },

  isConfigured() {
    return this.isEnabled();
  },

  async init() {
    if (this._initialized) return;
    if (!this.isEnabled()) return;

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG.firebase);
    }

    this._auth = firebase.auth();
    this._db = firebase.firestore();
    this._storage = firebase.storage();
    this._initialized = true;
  },

  usernameToEmail(username) {
    const trimmed = username.trim().toLowerCase();
    if (trimmed === 'admin') {
      return FIREBASE_CONFIG.adminEmail;
    }
    return `${trimmed}${FIREBASE_CONFIG.studentEmailSuffix}`;
  },

  emailToUsername(email) {
    if (!email) return '';
    if (email === FIREBASE_CONFIG.adminEmail) return 'admin';
    return email.replace(FIREBASE_CONFIG.studentEmailSuffix, '');
  },

  async signIn(username, password) {
    await this.init();
    if (!this.isEnabled()) {
      throw new Error('Firebase is not configured. See docs/FIREBASE-SETUP.md');
    }

    const email = this.usernameToEmail(username);
    const credential = await this._auth.signInWithEmailAndPassword(email, password);
    const role = await this.getUserRole(credential.user.uid);

    sessionStorage.setItem('loggedInUser', this.emailToUsername(credential.user.email));
    sessionStorage.setItem('userRole', role);

    return { user: credential.user, role };
  },

  async signOut() {
    sessionStorage.removeItem('loggedInUser');
    sessionStorage.removeItem('userRole');

    if (this._initialized && this._auth) {
      await this._auth.signOut();
    }
  },

  async restoreSession() {
    if (!this.isEnabled()) {
      return !!sessionStorage.getItem('loggedInUser');
    }

    await this.init();

    if (this._auth.currentUser) {
      const role = await this.getUserRole(this._auth.currentUser.uid);
      sessionStorage.setItem('loggedInUser', this.emailToUsername(this._auth.currentUser.email));
      sessionStorage.setItem('userRole', role);
      return true;
    }

    return !!sessionStorage.getItem('loggedInUser');
  },

  async requireAuth(options = {}) {
    const { adminOnly = false } = options;
    const hasSession = await this.restoreSession();
    const username = sessionStorage.getItem('loggedInUser');
    const role = sessionStorage.getItem('userRole');

    if (!hasSession || !username) {
      window.location.href = APP_PATHS.login;
      return false;
    }

    if (adminOnly && role !== 'admin') {
      alert('Access denied. Admin only.');
      window.location.href = APP_PATHS.login;
      return false;
    }

    return true;
  },

  async getUserRole(uid) {
    const doc = await this._db.collection('users').doc(uid).get();
    if (doc.exists && doc.data().role) {
      return doc.data().role;
    }
    return 'student';
  },

  getDefaultChapters() {
    return {
      '6': { title: 'Class 6', chapters: [] },
      '7': { title: 'Class 7', chapters: [] },
      '8': { title: 'Class 8', chapters: [] },
      '9': { title: 'Class 9', chapters: [] },
      '10': { title: 'Class 10', chapters: [] },
    };
  },

  async fetchChapters() {
    if (this.isEnabled()) {
      try {
        await this.init();
        const doc = await this._db.doc(FIREBASE_CONFIG.collections.chaptersDoc).get();
        if (doc.exists) {
          return doc.data();
        }
        return this.getDefaultChapters();
      } catch (err) {
        console.warn('Firebase fetch failed, using fallback:', err);
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

    try {
      const res = await fetch(APP_PATHS.chaptersData);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Local chapters fetch failed or missing, using defaults:', err);
      return this.getDefaultChapters();
    }
  },

  async saveChapters(chaptersData) {
    localStorage.setItem('chaptersData', JSON.stringify(chaptersData));

    if (!this.isEnabled()) {
      return { success: true, localOnly: true };
    }

    await this.init();
    await this._db.doc(FIREBASE_CONFIG.collections.chaptersDoc).set(chaptersData);
    return { success: true };
  },

  sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  },

  async uploadPdf(file, classId) {
    if (!this.isEnabled()) {
      throw new Error('Firebase is not configured. See docs/FIREBASE-SETUP.md');
    }

    await this.init();

    const safeName = this.sanitizeFileName(file.name);
    const storagePath = `pdfs/class-${classId}/${Date.now()}-${safeName}`;
    const ref = this._storage.ref(storagePath);

    await ref.put(file, {
      contentType: file.type || 'application/pdf',
    });

    const downloadUrl = await ref.getDownloadURL();

    return {
      success: true,
      storagePath,
      downloadUrl,
      fileName: file.name,
    };
  },

  async getPdfUrl(chapter) {
    if (chapter.downloadUrl) {
      return chapter.downloadUrl;
    }

    if (chapter.storagePath && this.isEnabled()) {
      await this.init();
      const ref = this._storage.ref(chapter.storagePath);
      return await ref.getDownloadURL();
    }

    let pdfPath = chapter.pdfFile || '';
    if (pdfPath.startsWith('http')) return pdfPath;
    if (!pdfPath.startsWith('/')) pdfPath = `/assets/pdfs/${pdfPath}`;
    return pdfPath;
  },

  async deletePdf(storagePath) {
    if (!storagePath || !this.isEnabled()) return;

    await this.init();
    await this._storage.ref(storagePath).delete();
  },
};
