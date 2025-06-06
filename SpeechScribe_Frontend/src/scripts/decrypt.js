const CryptoJS = require('crypto-js');

// Function to decrypt data
function decryptData(encryptedData, secretKey) {
  const iv = CryptoJS.enc.Hex.parse(encryptedData.substring(0, 32));
  const encrypted = encryptedData.substring(32);
  const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(secretKey), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

module.exports = { decryptData };