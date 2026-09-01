import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// All values come from environment variables (see .env.example).
// Nothing here is secret-in-practice (Firebase web config is public by design —
// security lives in firestore.rules, not in hiding this object), but we still
// keep it out of source control as good practice and to make multi-project
// setups (dev/staging/prod) painless.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Super-admin allowlist — kept in one place, enforced for real in firestore.rules.
export const SUPER_ADMIN_EMAILS = ["m.mukuka1323@gmail.com"];
