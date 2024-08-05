import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBsgCY_V_Az1oiTK3KJCRbL6-NDtQnfuTI",
  authDomain: "day-challenge-763b5.firebaseapp.com",
  projectId: "day-challenge-763b5",
  storageBucket: "day-challenge-763b5.appspot.com",
  messagingSenderId: "1040291833000",
  appId: "1:1040291833000:web:604b7be554ef68f2814e9d",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);
export { storage, db };
