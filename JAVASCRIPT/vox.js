function openDialogue() {
    document.querySelector('.startSession').style.display="flex";
}
document.getElementById("cancel").onclick=function() {
    document.querySelector('.startSession').style.display="none";
}
const boxes = document.querySelectorAll('#selectable-box');
const nextBtn = document.getElementById('next');

boxes.forEach(box => {
  box.addEventListener('click', () => {
      
    boxes.forEach(b => b.classList.remove('selected')); // remove previous
    box.classList.add('selected');                      // add current
    nextBtn.disabled = false;                           // enable button
  });
});
const synth = window.speechSynthesis;

const soundMessages = {
    "neutral_male": "Today i have to go to work",
    "child_girl": "i am Liya! my mom calls me beautiful",
    "elderly_man": "Always trust an elderly man",
    "robot_ai": "I am a Robot AI",
    "robot_mechanical": "Wanna hear how a robot mechanical sounds like?",
    "villian_deep": "Realistic Villain deep voice",
    "villian_sinister": "i am Retro, the sinister Villain",
    "fairy": "Oh! mother Theresa, bless our magical wand",
    "alien_high_pitch": "you cant hear my pitch",
    "alien_echoey": "this is an alien echo",
    "chinese_accent": "Do you like the Chinese accent",
    "monster": "I do not want to turn into a monster",
    "american_accent": "The way american talks",
    "british_accent": "You just dropped your  bottle of water ",
    "spanish_accent": "Football is a spanish wonder"
};

function playTTS(message) {
    try {
        if (synth.speaking) {
            synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.pitch = 1; 
        utterance.rate = 0.5; 
        synth.speak(utterance);
    } catch (error) {
        alert("Error occurred while trying to play TTS:", error);
    }
}
const divs = document.querySelectorAll('#testSounds div');
divs.forEach(div => {
    div.addEventListener('mouseover', function() {
        const id = div.id;
        if (soundMessages[id]) {
            playTTS(soundMessages[id]); 
        }
    });
});
