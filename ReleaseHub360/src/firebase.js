// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfZlFeyOq4pWBjZvDPpKIMUDqhT_qqbso",
  authDomain: "releasehub360.firebaseapp.com",
  projectId: "releasehub360",
  storageBucket: "releasehub360.firebasestorage.app",
  messagingSenderId: "488556101623",
  appId: "1:488556101623:web:b6f1aec57a61f63aa0f8f2",
  measurementId: "G-8X91VQQQ1P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };
