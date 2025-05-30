// utils/firebasePaths.js

export const FirebasePaths = {
  // 🔐 User Session document (Firestore)
  userSession: (uid) => `User_Sessions/${uid}`,
  
  // 🎙️ User Recordings collection (Firestore)
  userRecordingsCollection: (uid) => `Users_Recordings/${uid}/recordings`,
  
  userRecordingDoc: (uid, docId) => `Users_Recordings/${uid}/recordings/${docId}`,
  
  // 🔑 User Encryption Key document (Firestore)
  userEncryptionDoc: (uid) => `Users_Encryption_Keys/${uid}/`,
  
  // user storage
  userStoragePath : (uid) => `Users_Recordings/${uid}/`,
  
  // 🧠 User General Profile/Info document (Realtime Database)
  userDatabaseDoc: (uid) => `Users_Database/${uid}/`,
};