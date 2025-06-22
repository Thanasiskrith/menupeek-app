// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// We check if the essential configuration is present.
// This is crucial for allowing the app to be built and deployed
// in environments where these keys are not available (e.g., during the build process on App Hosting).
const isConfigured = firebaseConfig.projectId && firebaseConfig.apiKey;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Initialize app and services ONLY if configuration is valid.
if (isConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (e) {
      console.error("Firebase initialization failed:", e);
      // Ensure db and storage are null if initialization fails
      app = null;
      db = null;
      storage = null;
  }
}

// Log a clear warning during the build process if configuration is missing.
if (!isConfigured && process.env.NODE_ENV === 'production') {
    console.log(
        '[Firebase Init] Firebase config not found. Build will proceed, but runtime functionality will be disabled until environment variables are set in your App Hosting backend settings.'
    );
}

// Export the potentially null services.
// Any code using these MUST handle the null case to prevent runtime errors.
export { db, storage };
