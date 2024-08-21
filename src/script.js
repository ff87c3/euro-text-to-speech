import p5 from 'p5';
const Matter = require('matter-js');

const startRecordBtn = document.getElementById('speak');
const info = document.querySelector('#info p');
const languageSelector = document.getElementById('language-select')

const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const MouseConstraint = Matter.MouseConstraint;
const Mouse = Matter.Mouse;

let engine;
let ground, wallLeft, wallRight;
let words = [];
let mouseControl;
let mouse;

let recognition;
let audioContext;

// loader

window.addEventListener('load', function () {
    const loader = document.querySelector('.loader');
    loader.className += ' hidden';
});

// speech recognition not working with Firefox

if ('SpeechRecognition' in window) {
    recognition = new window.SpeechRecognition();
} else if ('webkitSpeechRecognition' in window) {
    recognition = new window.webkitSpeechRecognition();
} else {
    document.documentElement.style.setProperty('--yellow', 'rgb(255, 0, 0)');
    startRecordBtn.style.display = 'none';
    info.innerHTML = 'this browser does not support speech recognition, try Chrome instead.';
    languageSelector.style.display = 'none'
    document.querySelector('.loader img').style.filter = 'invert(76%) sepia(93%) saturate(600%) hue-rotate(0deg) brightness(100%) contrast(100%)';
}

recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

languageSelector.addEventListener('change', function () {
    recognition.lang = this.value;
});


new p5((p) => {

    // speech to text 

    startRecordBtn.addEventListener('click', function () {
        info.style.display = 'none';
        startRecordBtn.style.opacity = 0;

        recognition.start();

        setTimeout(function () {
            languageSelector.style.opacity = 0;
            const recordingTag = document.getElementById('recording-tag');
            recordingTag.classList.add('flicker');
        }, 500);

        // bug on mobile devices
        if (window.innerWidth > 768) {
            initializeAudioContext();
        }
    }
    );

    recognition.onresult = function (event) {
        const speechToText = event.results[0][0].transcript;
        const wordsToDisplay = speechToText.split(' ');

        for (let i = 0; i < wordsToDisplay.length; i++) {
            words.push(new Word(p.random(p.width), -200, wordsToDisplay[i]));
        }
    };

    recognition.onerror = function (event) {
        console.error('Speech recognition error', event);
    };

    recognition.onstart = function () {
        console.log('Speech recognition started');
    };

    recognition.onend = function () {
        const gradientElement = document.getElementById('gradient-mic');
        const recordingTag = document.getElementById('recording-tag');
        recordingTag.classList.remove('flicker');

        setTimeout(function () {
            startRecordBtn.style.opacity = 1;
            languageSelector.style.opacity = 1;
            gradientElement.style.background = `radial-gradient(
                circle,
                var(--blue) 0%,
                var(--yellow) 15%,
                var(--blue) 100%
            )`;

        }, 2000);

        audioContext.close();
        console.log('Speech recognition ended');
    };

    // sound volume recognition  

    function initializeAudioContext() {

        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;

        function adjustGradientBasedOnVolume(volume) {

            const maxGradientStop = 85;
            const minGradientStop = 15;

            const gradientStopPercentage = volume * (maxGradientStop - minGradientStop) + minGradientStop;

            const gradientElement = document.getElementById('gradient-mic');

            gradientElement.style.background = `radial-gradient(
                   circle,
                   var(--blue) 0%,
                   var(--yellow) ${gradientStopPercentage}%,
                   var(--blue) 100%
               )`;
        }

        function renderAudioVisualizer() {
            requestAnimationFrame(renderAudioVisualizer);

            const frequencyDataCount = analyserNode.frequencyBinCount;
            const frequencyDataArray = new Uint8Array(frequencyDataCount);
            analyserNode.getByteFrequencyData(frequencyDataArray);

            let averageVolume = frequencyDataArray.reduce((total, value) => total + value) / frequencyDataArray.length / 256;

            adjustGradientBasedOnVolume(averageVolume);
        }

        navigator.mediaDevices.getUserMedia({ audio: true }).then(audioStream => {
            const audioSource = audioContext.createMediaStreamSource(audioStream);
            audioSource.connect(analyserNode);
            renderAudioVisualizer();
        });
    }

    //  Matter.js setup 

    p.setup = function () {

        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);

        function windowResized() {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        }

        engine = Engine.create();

        mouse = Mouse.create(canvas.elt);

        mouse.pixelRatio = p.pixelDensity();

        mouseControl = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.1,
                render: {
                    visible: false
                }
            }
        });

        let ballRadius = p.width * 0.10;

        const ballCenter = Bodies.circle(p.width / 2, p.height / 2, ballRadius, {
            isStatic: true,
        })

        const WallOptions = {
            isStatic: true,
            render: {
                visible: false
            }
        }

        const ground = Bodies.rectangle(p.width / 2, p.height, p.width + 100, 25, WallOptions);
        const wallLeft = Bodies.rectangle(-50, p.height / 2, 100, p.height * 3, WallOptions);
        const wallRight = Bodies.rectangle(p.width + 50, p.height / 2, 100, p.height * 3, WallOptions);

        World.add(engine.world, [ground, wallLeft, wallRight, ballCenter, mouseControl]);

    }

    p.draw = function () {
        p.clear();
        Engine.update(engine);

        for (let word of words) {
            word.show()
        }
    }

    function getRandomNumber() {
        return Math.floor(Math.random() * 21) + 20;
    }

    class Word {
        constructor(x, y, word) {
            this.body = Bodies.rectangle(x, y, word.length * 17, 25);
            this.word = word
            this.size = getRandomNumber()
            World.add(engine.world, this.body);
        }

        show() {

            let pos = this.body.position;
            let angle = this.body.angle;

            p.push();
            p.translate(pos.x, pos.y);
            p.rotate(angle);
            p.fill('yellow');
            p.textSize(this.size);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(this.word, 0, 0);
            p.pop();
        }
    }
});
