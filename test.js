loginForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const email = emailField.value.trim();
	const password = passwordField.value.trim();
	loginError.textContent = '';
	loginButton.disabled = true;
	loginButton.textContent = 'Logging in...';
	
	// First, try to sign in the user
	signInWithEmailAndPassword(auth, email, password)
		.then(async (userCredential) => {
			const user = userCredential.user;
			
			try {
				// If the email is correct, we now need to check the password
				const secretKeySnapshot = await getDoc(doc(firestoreDb, "Users_Encryption_Keys", user.uid));
				if (!secretKeySnapshot.exists()) {
					throw new Error("Secret key not found.");
				}
				const secretKey = secretKeySnapshot.data().key;
				const encryptedEmail = encryptData(email, secretKey);
				const userRef = ref(rtdb, 'Users_Database/' + user.uid);
				const userSnapshot = await get(userRef);
				
				if (!userSnapshot.exists()) {
					throw new Error("User not found.");
				}
				const storedEncryptedEmail = userSnapshot.val().email;
				const decryptedStoredEmail = decryptData(storedEncryptedEmail, secretKey);
				
				if (decryptedStoredEmail === email) {
					const sessionId = generateSessionId();
					await setDoc(doc(firestoreDb, "User_Sessions", user.uid), {
						sessionId: sessionId,
						lastLogin: new Date().toISOString()
					});
					setCookie('sessionId', sessionId, 7);
					setSessionStorage('sessionUserId', user.uid);
					setLocalStorage('userAccount', user.uid);
					window.location.href = "/index.html";
				} 
				
				/*else {
					loginError.textContent = "Login failed: Email does not match.";
				}*/
			} catch (error) {
				if (decryptedStoredEmail === email){
					loginError.textContent="email not found"
				}
				if(password === user){
					console.log("password is incorrect")
				}
				//loginError.textContent = `Login failed: ${error.message}`;
			}
		})
		.finally(() => {
			loginButton.disabled = false;
			loginButton.textContent = 'Log in';
		});
});