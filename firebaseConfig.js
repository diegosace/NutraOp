
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAU5Ty8sNZWX7MbziyQK7q_OlpTrrHYxUs",
  authDomain: "nutra-op-ia.firebaseapp.com",
  projectId: "nutra-op-ia",
  storageBucket: "nutra-op-ia.firebasestorage.app",
  messagingSenderId: "105482031610",
  appId: "1:105482031610:web:3cb4222f9704175f1f5443",
  measurementId: "G-RSW41L4JK4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only if supported and in production
let analytics;
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Silently handle analytics initialization failure
  });
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
