onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // 🔐 Fetch session ID from Firestore
      const sessionId = await retrieveSessionId(user.uid);
      if (!sessionId) {
        customAlert("Your session has expired. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login/login.html";
        }, 3000);
        return;
      }
      
      // 📊 Count user recordings (UI badge, etc.)
      await countUserRecordings(user.uid);
      
      // 🎙️ Save recording logic
      saveRecordingButton.addEventListener("click", async () => {
        if (!currentBlob) {
          customAlert("No recording found to save.");
          return;
        }
        
        const recordingName = recordingNameInput.value.trim() || `recording-${Date.now()}`;
        pageLoader.style.display = "grid";
        
        try {
          const filePath = `${FirebasePaths.userStoragePath(user.uid)}/${recordingName}.mp3`;
          const recordingRef = storageRef(storage, filePath);
          
          const snapshot = await uploadBytes(recordingRef, currentBlob);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          await addDoc(
            collection(firestoreDb, FirebasePaths.userRecordingsCollection(user.uid)),
            {
              name: recordingName,
              url: downloadURL,
              timestamp: serverTimestamp(),
            }
          );
          
          customAlert(`File saved as: ${recordingName}.mp3`);
          await countUserRecordings(user.uid);
          
          downloadContainer.style.top = "-100%";
          downloadContainer.style.height = "0%";
        } catch (error) {
          console.error("Error saving recording:", error.message);
          customAlert(`Error saving file: ${error.message}`);
        } finally {
          pageLoader.style.display = "none";
        }
      });
      
    } catch (error) {
      console.error("Error during session validation:", error);
      customAlert("An unexpected error occurred. Redirecting...");
      setTimeout(() => {
        window.location.href = "/login/login.html";
      }, 3000);
    }
  } else {
    // 🚪 User is not authenticated — redirect to login
    customAlert("You are not logged in. Redirecting...");
    setTimeout(() => {
      window.location.href = "/login/login.html";
    }, 3000);
  }
});