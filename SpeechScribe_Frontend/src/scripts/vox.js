// Open the voice build dialogue
function openDialogue() {
	document.querySelector('.startSession').style.display = "flex";
}

// Cancel button closes the dialogue and resets selections
document.getElementById("cancel").onclick = function() {
	document.querySelector('.startSession').style.display = "none";
	// Reset selection and disable Next button
	document.querySelectorAll('.selectable-box').forEach(b => b.classList.remove('selected'));
	document.getElementById('next').disabled = true;
};

// Selectable boxes logic
const boxes = document.querySelectorAll('.selectable-box');
const nextBtn = document.getElementById('next');

boxes.forEach(box => {
	box.addEventListener('click', () => {
		boxes.forEach(b => b.classList.remove('selected')); // Remove previous selection
		box.classList.add('selected'); // Add current selection
		nextBtn.disabled = false; // Enable Next button
	});
});

// Text-to-speech setup
const synth = window.speechSynthesis;

const soundMessages = {
	neutral_male: "I have a meeting to catch today — let’s get started.",
	child_girl: "Hi, I'm Liya! Mommy says I'm her little sunshine.",
	elderly_man: "Wisdom comes with age — and I’ve lived long enough to know.",
	robot_ai: "Hello, I am your intelligent voice assistant, fully AI-powered.",
	robot_mechanical: "Initiating mechanical voice protocol. Systems engaged.",
	villian_deep: "You should never underestimate the voice... of a villain.",
	villian_sinister: "I am Retro — the darkness you’ve feared in silence.",
	fairy: "Oh blessed starlight! Let our magic awaken the skies!",
	alien_high_pitch: "My frequency is beyond your hearing — can you detect it?",
	alien_echoey: "Transmitting from the unknown... can you hear the echo?",
	chinese_accent: "Greetings! I hope you enjoy this subtle Chinese tone.",
	monster_deep: "The transformation begins... I’m becoming something terrifying.",
	american_accent_casual: "Hey there! You got your coffee and bagel ready?",
	british_accent_formal: "Would you mind passing the water bottle, mate?",
	spanish_accent: "The rhythm of football flows through every Spanish heart."
};

// Function to play text-to-speech message
function playTTS(message) {
	try {
		if (synth.speaking) {
			synth.cancel();
		}
		const utterance = new SpeechSynthesisUtterance(message);
		utterance.pitch = 1;
		utterance.rate = 1;
		synth.speak(utterance);
	} catch (error) {
		alert("Error occurred while trying to play TTS: " + error);
	}
}

// Add hover event to sample voice divs to play TTS message
const divs = document.querySelectorAll('#testSounds > div');
divs.forEach(div => {
	div.addEventListener('mouseover', function() {
		const id = div.id;
		if (soundMessages[id]) {
			playTTS(soundMessages[id]);
		}
	});
	
	// Stop speech on mouse out to avoid overlap
	div.addEventListener('mouseout', function() {
		if (synth.speaking) {
			synth.cancel();
		}
	});
});

// Preload background images to improve UX
const backgroundImageUrls = [
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Fmale.png?alt=media&token=ab14d2d2-3513-4102-b9c5-7f569c69e0c1",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Fgirl.png?alt=media&token=4e7d94df-8370-4831-8ce2-ff4d06b15460",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Foldman.png?alt=media&token=85f99e5e-0031-4eaf-a6fc-72015a1db2be",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Frobot.png?alt=media&token=409bc16a-6131-4506-9b2b-cb9fb82598d5",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Frobot2.png?alt=media&token=5cbed1f6-d8d5-454b-9e9d-79d7553e7372",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Fvillian_deep.png?alt=media&token=663e79d9-837d-4a65-9c7e-2d98056cbc33",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Fvillian_senester.png?alt=media&token=24dd5bac-54d4-4f24-a368-7b17e9d8c5f6",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Ffairy%20soft.png?alt=media&token=9379e536-22ea-4777-8d32-6952746a4c86",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Falien.png?alt=media&token=d7056849-dd60-4da3-ab73-98584c6cf30f",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Falien_echo.png?alt=media&token=9e2683d5-09e9-4200-b1b2-b98cc19c45db",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Fchineseman.png?alt=media&token=2c5484d4-df1b-4e38-9ba3-43b47e5fc8bd",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Fmonster.png?alt=media&token=d63c4e23-341e-40ab-bd30-302a3fa10c78",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Famerican.png?alt=media&token=6c610594-d51d-4419-88be-fbbb94d12545",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Fukman.png?alt=media&token=7a74ff7f-fbcb-4801-8850-85a46a27cf4a",
	"https://firebasestorage.googleapis.com/v0/b/speechscribeapp.appspot.com/o/SpeechScribe%20images%2Fspanish.png?alt=media&token=defa16bd-5f72-4024-b7b9-de6c4c6dee17"
];