import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// ========================================================
//  PUT YOUR FIREBASE CONFIG VALUES IN frontend/.env
// ========================================================
// Add these variables to your frontend/.env file:
//
//   VITE_FIREBASE_API_KEY=AIza...
//   VITE_FIREBASE_AUTH_DOMAIN=skyview-ai.firebaseapp.com
//   VITE_FIREBASE_PROJECT_ID=skyview-ai
//   VITE_FIREBASE_STORAGE_BUCKET=skyview-ai.firebasestorage.app
//   VITE_FIREBASE_MESSAGING_SENDER_ID=1001623214899
//   VITE_FIREBASE_APP_ID=1:1001623214899:web:545de4bbd4bb99db263c46
//   VITE_FIREBASE_MEASUREMENT_ID=G-P9T1Z95THS
// ========================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.settings.appVerificationDisabledForTesting = true;
export default app;
