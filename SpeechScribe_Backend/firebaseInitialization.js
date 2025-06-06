// firebaseInitialization.js
const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    databaseURL: 'https://speechscribeapp-default-rtdb.firebaseio.com',
  });
}

// Export Firebase services
const auth = admin.auth();
const firestore = admin.firestore();
const realtimeDB = admin.database();
const storage = admin.storage()

module.exports = {
  admin, // full access if needed elsewhere
  auth, // Firebase Auth
  firestore, // Firestore
  realtimeDB, // Realtime Database
};