const express = require('express');
const router = express.Router();
const axios = require('axios');
const admin = require('firebase-admin');
const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');
const CryptoJS = require('crypto-js');
require('dotenv').config();

async function verifyRecaptchaEnterprise(token, expectedAction) {
  const client = new RecaptchaEnterpriseServiceClient();
  
  const projectId = 'speechscribeapp'; // ✅ Your actual Google Cloud Project ID
  const recaptchaKey = '6Lf8f1crAAAAAFdWZ4v-vjvuRi9iwNIIwBAN3uFR'; // ✅ Your site key
  const [response] = await client.createAssessment({
    parent: client.projectPath(projectId),
    assessment: {
      event: {
        token,
        siteKey: recaptchaKey,
      },
    },
  });
  
  const { tokenProperties, riskAnalysis } = response;
  
  if (!tokenProperties.valid) {
    throw new Error(`reCAPTCHA token invalid: ${tokenProperties.invalidReason}`);
  }
  
  if (tokenProperties.action !== expectedAction) {
    throw new Error(`Expected action '${expectedAction}' but got '${tokenProperties.action}'`);
  }
  
  return riskAnalysis.score;
}
// Utility: Generate AES key
function generateAESKey() {
  return CryptoJS.lib.WordArray.random(32).toString(); // 256-bit key
}

// Utility: Encrypt data with AES
function encryptData(data, secretKey) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(secretKey), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return iv.toString() + encrypted.toString(); // hex IV + base64 ciphertext
}

// Utility: Decrypt (optional for testing)
function decryptData(encryptedData, secretKey) {
  const iv = CryptoJS.enc.Hex.parse(encryptedData.substring(0, 32));
  const encrypted = encryptedData.substring(32);
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(secretKey), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return null;
  }
}

// ✅ Signup Route
router.post('/signup', async (req, res) => {
  const { username, email, tel, password, recaptchaToken } = req.body;
  
  
  if (!recaptchaToken) return res.status(400).json({ error: 'Missing reCAPTCHA token' });
  
  
  try {
    // ✅ 1. Verify reCAPTCHA
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify`;
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: recaptchaToken
    });
    
    const { data } = await axios.post(verifyURL, params);
    if (!data.success || data.score < 0.5 || data.action !== 'signup') {
      return res.status(403).json({ error: 'Failed reCAPTCHA verification.', score: data.score });
    }
    
    // ✅ 2. Check if user exists by username or tel
    const firestore = admin.firestore();
    const realtimeDB = admin.database();
    const usersRef = firestore.collection('users');
    
    const usernameCheck = await usersRef.where('username', '==', username).get();
    if (!usernameCheck.empty) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    
    const telCheck = await usersRef.where('tel', '==', tel).get();
    if (!telCheck.empty) {
      return res.status(409).json({ error: 'Phone number already in use.' });
    }
    
    // ✅ 3. Generate AES key
    const encryptionKey = generateAESKey();
    
    // ✅ 4. Encrypt user details
    const encryptedUsername = encryptData(username, encryptionKey);
    const encryptedEmail = encryptData(email, encryptionKey);
    const encryptedTel = encryptData(tel, encryptionKey);
    
    // ✅ 5. Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      phoneNumber: `+${tel}`,
      displayName: username,
    });
    
    const uid = userRecord.uid;
    
    // ✅ 6. Store encrypted data in Realtime DB
    await realtimeDB.ref(`Users Database/${uid}`).set({
      username: encryptedUsername,
      email: encryptedEmail,
      tel: encryptedTel,
      signupDate: new Date().toISOString(),
    });
    
    // ✅ 7. Store AES key in Firestore
    await firestore.collection("Users Encryption Keys").doc(uid).set({
      encryptionKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.status(201).json({ success: true, message: 'User created and data encrypted.' });
    
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;