/**
 * Firebase SDK initialization
 * Uses Firebase v9+ modular SDK via CDN
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, limit, startAfter, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyANayEysRwzqr8RFOO8Bd7-W20UPV3rZds",
  authDomain: "korean-marketing-feed.firebaseapp.com",
  projectId: "korean-marketing-feed",
  storageBucket: "korean-marketing-feed.firebasestorage.app",
  messagingSenderId: "551151404261",
  appId: "1:551151404261:web:f20ceb29001757de16400c"
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
