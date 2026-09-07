import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  Firestore 
} from 'firebase/firestore';
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  indexedDBLocalPersistence,
  inMemoryPersistence, 
  Auth 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let db: Firestore;
try {
  const config = firebaseConfig as any;
  const dbSettings = {
    experimentalAutoDetectLongPolling: true,
  };
  
  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
    db = initializeFirestore(app, dbSettings, config.firestoreDatabaseId);
  } else {
    db = initializeFirestore(app, dbSettings);
  }
} catch (e) {
  try {
    const config = firebaseConfig as any;
    if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
      db = getFirestore(app, config.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn('Initializing default firestore fallback:', err);
    db = getFirestore(app);
  }
}

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
  });
} catch (e) {
  auth = getAuth(app);
}

export { app, db, auth, firebaseConfig };



