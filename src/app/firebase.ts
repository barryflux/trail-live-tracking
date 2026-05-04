import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {

  apiKey: "AIzaSyAd46xtpYimkr5wsh6mqkp30HUQtr570ts",
  authDomain: "trail-live-tracking.firebaseapp.com",
  projectId: "trail-live-tracking",
  storageBucket: "trail-live-tracking.firebasestorage.app",
  messagingSenderId: "759972725292",
  appId: "1:759972725292:web:f02c829302df823548c789"

};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);