const express = require('express');
const router = express.Router();
const axios = require('axios')
const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');
require('dotenv').config();

// ✅ Initialize Firebase (only once)
if (!admin.apps.length) {
  const serviceAccount = require('./recaptchaKey.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://speechscribeapp-default-rtdb.firebaseio.com' // 🔁 Use your actual DB URL
  });
}

const axios = require('axios');


// Replace your verifyRecaptchaEnterprise with:

// ✅ reCAPTCHA Enterprise Verification
async function verifyRecaptchaEnterprise(token, expectedAction) {
  const client = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${6LdnbFcrAAAAAIuFgkQ3mAPUUXJJt5-77P53Irug}&response=${6LdnbFcrAAAAAHwgdOujpkl08gkk6U1i_9fKJS87}`
  return client.data
  const projectId = 'speechscribeapp'; // 🔁 Your GCP project ID
  const siteKey = '6Le58VorAAAAAMBO_-3mGm5li27zi3in7eLjLiMw'; // 🔁 Your reCAPTCHA site key
  
  const [response] = await client.createAssessment({
    parent: client.projectPath(projectId),
    assessment: {
      event: { token, siteKey },
    },
  });
  
  const { tokenProperties, riskAnalysis } = response;
  
  if (!tokenProperties.valid) {
    throw new Error(`Invalid reCAPTCHA token: ${tokenProperties.invalidReason}`);
  }
  
  if (tokenProperties.action !== expectedAction) {
    throw new Error(`reCAPTCHA action mismatch: expected '${expectedAction}', got '${tokenProperties.action}'`);
  }
  
  return riskAnalysis.score;
}

// ✅ Utility: AES key generation
function generateAESKey() {
  return CryptoJS.lib.WordArray.random(32).toString(); // 256-bit
}

// ✅ Utility: AES encryption with IV
function encryptData(data, secretKey) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(secretKey), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return iv.toString() + encrypted.toString(); // IV (hex) + ciphertext (base64)
}

// ✅ POST /signup
router.post('/signup', async (req, res) => {
  console.log("🔥 Received signup request");
  console.log("🧾 Body:", req.body);

  const { username, email, tel, password, recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ error: 'Missing reCAPTCHA token' });
  }

  try {
    // Step 1: reCAPTCHA verification
    const score = await verifyRecaptchaEnterprise(recaptchaToken, 'signup');
    console.log("🔐 reCAPTCHA score:", score);
    if (score < 0.5) {
      return res.status(403).json({ error: 'reCAPTCHA verification failed.', score });
    }

    const firestore = admin.firestore();
    const realtimeDB = admin.database();
    const usersRef = firestore.collection('Users Firestore');

    // Step 2: Uniqueness checks
    const usernameTaken = !(await usersRef.where('username', '==', username).get()).empty;
    if (usernameTaken) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const telTaken = !(await usersRef.where('tel', '==', tel).get()).empty;
    if (telTaken) {
      return res.status(409).json({ error: 'Phone number already in use.' });
    }

    // Step 3: Encrypt user data
    const encryptionKey = generateAESKey();
    const encryptedUsername = encryptData(username, encryptionKey);
    const encryptedEmail = encryptData(email, encryptionKey);
    const encryptedTel = encryptData(tel, encryptionKey);

    // Step 4: Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      phoneNumber: `+${tel}`,
      displayName: username,
    });
    console.log("✅ Firebase Auth user created:", userRecord.uid);

    const uid = userRecord.uid;

    // Step 5: Store encrypted data in Realtime DB
    await realtimeDB.ref(`Users Database/${uid}`).set({
      username: encryptedUsername,
      email: encryptedEmail,
      tel: encryptedTel,
      signupDate: new Date().toISOString(),
    });

    // Step 6: Store encryption key in Firestore
    await firestore.collection("Users Encryption Keys").doc(uid).set({
      encryptionKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(201).json({ success: true, message: 'User created and encrypted successfully.' });

  } catch (err) {
    console.error('❌ Signup error:', err.message);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});
module.exports = router;
