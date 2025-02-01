// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCwI08TncslS8hcgOy3TWQxgycHTSlfiac",
  authDomain: "gemini-med-lit-review.firebaseapp.com",
  projectId: "gemini-med-lit-review",
  storageBucket: "gemini-med-lit-review.firebasestorage.app",
  messagingSenderId: "934163632848",
  appId: "1:934163632848:web:50cbae45b7ea11ef2e44d5",
  measurementId: "G-W65LYW17QJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;
