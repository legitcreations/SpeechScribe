function openDialogue() {
    var voiceDialogue = document.getElementById('voiceDialogue');
    voiceDialogue.classList.toggle('showDialogue');
}

// Create a SpeechSynthesis object
const synth = window.speechSynthesis;

// Mapping of each div ID to its custom message
const soundMessages = {
    "neutral_male": "Neutral male voice selected",
    "child_girl": "Little girl voice selected",
    "elderly_man": "Old man voice selected",
    "robot_ai": "Robot AI voice selected",
    "robot_mechanical": "Robot mechanical voice selected",
    "villian_deep": "Villain deep voice selected",
    "villian_sinister": "Villain sinister voice selected",
    "fairy": "Fairy voice selected",
    "alien_high_pitch": "Alien high pitch voice selected",
    "alien_echoey": "Alien Echo voice selected",
    "chinese_madarin": "Chinese voice selected",
    "monster_deep": "Monster deep voice selected",
    "american_accent_casual": "American accent casual voice selected",
    "british_accent_formal": "British accent formal voice selected",
    "spanish_accent": "Spanish accent voice selected"
};

// Function to play TTS based on the hovered element's ID
function playTTS(message) {
    try {
        // Check if speech synthesis is already speaking and cancel any ongoing speech
        if (synth.speaking) {
            synth.cancel(); // Stop any ongoing speech
        }

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.pitch = 1;  // Adjust pitch if needed
        utterance.rate = 1;   // Adjust speed if needed

        // Speak the message
        synth.speak(utterance);

        // Log the successful play
        console.log(`Speech played: ${message}`);
    } catch (error) {
        // Log any errors that occur during TTS
        alert("Error occurred while trying to play TTS:", error);
    }
}

// Attach the hover event to each of the divs within #testSounds
const divs = document.querySelectorAll('#testSounds div');
divs.forEach(div => {
    div.addEventListener('mouseover', function() {
        const id = div.id;
        if (soundMessages[id]) {
            playTTS(soundMessages[id]); // Trigger TTS based on the hovered div's ID
        }
    });
});
