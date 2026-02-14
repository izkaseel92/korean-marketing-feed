/**
 * Firebase SDK initialization
 * Uses Firebase v9+ modular SDK via CDN
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, limit, startAfter, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase configuration - replace with your project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "korean-marketing-feed.firebaseapp.com",
  projectId: "korean-marketing-feed",
  storageBucket: "korean-marketing-feed.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  serverTimestamp
};
