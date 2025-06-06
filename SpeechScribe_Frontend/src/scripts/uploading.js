import {
 initializeApp,
 getApps
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import {
 getFirestore,
 collection,
 addDoc,
 serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import {
 getAuth,
 onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import {
 getStorage,
 ref,
 uploadBytesResumable,
 getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js';

// Removed getDatabase — not used

const firebaseConfig = {
 apiKey: 'AIzaSyApeufdnAhQCnsYljYchPjrh8W8Wf_YOtk',
 authDomain: 'speechscribeapp.firebaseapp.com',
 projectId: 'speechscribeapp',
 storageBucket: 'speechscribeapp.appspot.com',
 messagingSenderId: '624877337813',
 appId: '1:624877337813:web:8a857bf46caf430318765c',
 measurementId: 'G-239G8L2PGX'
};

if (!getApps().length) {
 initializeApp(firebaseConfig);
}

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const uploadFileContainer = document.getElementById('uploadFileContainer'),
 uploadFileContainerCover = document.getElementById('uploadFileContainerCover'),
 browseBtn = document.getElementById('browseBtn'),
 browseFilesToUpload = document.getElementById('browseFilesToUpload'),
 uploadName = document.getElementById('uploadName'),
 uploadPercentCounter = document.getElementById('uploadPercentCounter'),
 uploadProgressBar = document.getElementById('uploadProgressBar'),
 uploadBtn = document.getElementById('uploadBtn'),
 alertContainer = document.querySelector('.alertContainer'),
 alertText = document.getElementById('alertText'),
 deleteUploadBtn = document.getElementById('deleteUploadBtn'),
 closeUploadContainer = document.getElementById('closeUploadContainer');

let selectedFile = null;

function customAlert(message) {
 alertText.innerText = message;
 alertContainer.style.display = 'grid';
}

closeUploadContainer.addEventListener('click', () => {
 uploadFileContainerCover.style.display = 'none';
});

uploadFileContainer.addEventListener('click', () => {
 uploadFileContainerCover.style.display = 'grid';
});

browseBtn.addEventListener('click', () => {
 browseFilesToUpload.click();
});

deleteUploadBtn.addEventListener('click', () => {
 if (!selectedFile) {
  customAlert('No file selected to remove.');
  return;
 }
 
 selectedFile = null;
 uploadName.textContent = 'no file selected';
 browseFilesToUpload.value = '';
 customAlert('File selection cleared. You can select a new file.');
});

browseFilesToUpload.addEventListener('change', (event) => {
 selectedFile = event.target.files[0];
 
 const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'];
 const maxSizeInMB = 1;
 
 if (selectedFile) {
  if (!allowedTypes.includes(selectedFile.type)) {
   customAlert('Please select a valid audio file (mp3, wav, ogg, aac).');
   selectedFile = null;
   return;
  }
  
  if (selectedFile.size > maxSizeInMB * 1024 * 1024) {
   customAlert('The selected file exceeds the 1MB size limit.');
   selectedFile = null;
   return;
  }
  
  uploadName.textContent = selectedFile.name;
 }
});

uploadBtn.addEventListener('click', () => {
 if (!selectedFile) {
  customAlert('Please select a valid audio file before uploading.');
  return;
 }
 
 onAuthStateChanged(auth, (currentUser) => {
  if (currentUser) {
   const storageRef = ref(
    storage,
    `Users_Recordings/${currentUser.uid}/${selectedFile.name}`
   );
   
   const uploadTask = uploadBytesResumable(storageRef, selectedFile);
   
   uploadTask.on(
    'state_changed',
    (snapshot) => {
     const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
     uploadPercentCounter.textContent = Math.floor(progress) + '%';
     uploadProgressBar.style.width = progress + '%';
    },
    (error) => {
     customAlert('Upload failed: ' + error.message);
    },
    () => {
     getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
      uploadPercentCounter.textContent = '100%';
      uploadProgressBar.style.width = '100%';
      customAlert('File uploaded successfully!');
      
      addDoc(
       collection(db, 'Users_Recordings', currentUser.uid, 'recordings'),
       {
        name: selectedFile.name,
        url: downloadURL,
        timestamp: serverTimestamp()
       }
      ).catch((error) => {
       customAlert('Error saving metadata: ' + error.message);
      });
     });
    }
   );
  } else {
   customAlert('User is not authenticated. Please log in to upload files.');
   window.location.href = '/SpeechScribe_Frontend/src/pages/auth/login.html';
  }
 });
});