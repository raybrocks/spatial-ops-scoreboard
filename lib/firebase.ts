import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "spatial-ops-sb-4491",
  appId: "1:833779146885:web:a0005f8c4ab478289d89ec",
  storageBucket: "spatial-ops-sb-4491.firebasestorage.app",
  apiKey: "AIzaSyD-9DuoMziM0QGRyhggqv_ZBpOLmEXI1wM",
  authDomain: "spatial-ops-sb-4491.firebaseapp.com",
  messagingSenderId: "833779146885",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
