function bindProfileData(data, key, uid) {
	const editableFields = ["bio", "age", "address"];
	const readonlyFields = ["email", "tel", "username"]; // Updated key
	
	[...editableFields, ...readonlyFields].forEach(field => {
		const el = document.getElementById(field);
		if (!el) return;
		
		let value;
		if (data[field]) {
			value = CryptoUtils.decrypt(data[field], key, `${uid}_${field}`);
		} else if (field === 'phone_number' && data['telephone']) { // Handle potential old key
			value = CryptoUtils.decrypt(data['telephone'], key, `${uid}_telephone`);
		}
		else {
			value = "Tap to edit";
		}
		el.textContent = value;
		
		// LOGGING email, telephone, and username
		if (readonlyFields.includes(field)) {
			console.log(`Raw ${field} data:`, data[field]); // Add this line
			const value = data[field] ? CryptoUtils.decrypt(data[field], key, `${uid}_${field}`) : "Tap to edit";
			el.textContent = value;
		}
		
		if (editableFields.includes(field)) {
			el.addEventListener("click", () => showEditField(el, field, uid, key));
		}
	});
	
	// Profile Image (rest of the function remains the same)
	if (data.profileImage) {
		const decryptedImage = CryptoUtils.decrypt(data.profileImage, key, `${uid}_profileImage`);
		const userImage = document.querySelector(".userImage");
		if (userImage) {
			userImage.style.backgroundImage = `url(${decryptedImage})`;
			document.getElementById("profilePhoto").style.display = "none";
		}
	}
}