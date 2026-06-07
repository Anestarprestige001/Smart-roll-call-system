// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBw7EhYxAq-QXQ-IBGNPr2uUfJUJRHm_K8",
  authDomain: "studio-1136830837-f10c1.firebaseapp.com",
  projectId: "studio-1136830837-f10c1",
  storageBucket: "studio-1136830837-f10c1.firebasestorage.app",
  messagingSenderId: "985276250347",
  appId: "1:985276250347:web:6ac23f5cb4633c2e1366ae"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore services so App.jsx can use them!
export const auth = getAuth(app);
export const db = getFirestore(app);