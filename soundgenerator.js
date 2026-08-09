// ===============================
// Sci-Fi Sound Generator
// ===============================

// This script lets you generate sci-fi sound effects for your game
// Run this in your browser console to generate and download sound files

// Create an audio context
let ctx;
let isGenerating = false;
let totalSounds = 0;
let completedSounds = 0;

// Main function to start the generation process
function generateGameSounds() {
    if (isGenerating) {
        console.log("Sound generation already in progress...");
        return;
    }
    
    try {
        // Create audio context
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Check for MediaRecorder support
        if (!window.MediaRecorder || !ctx.destination.stream) {
            throw new Error("Your browser doesn't support MediaRecorder or AudioContext.destination.stream");
        }
        
        console.log("🎵 Starting sound generation...");
        console.log("You'll be prompted to save each sound file as it's generated.");
        
        isGenerating = true;
        
        // Generate UI sounds
        generateUIHoverSound();
        generateUIClickSound();
        generateUISelectSound();
        generateUIBackSound();
        generateUIErrorSound();
        
        console.log("Generation started! Please save each file when prompted.");
    } catch (err) {
        console.error("Sound generation error:", err.message);
        console.log("Try using Chrome or Firefox for better compatibility.");
    }
}

// Function to generate a sound and download it
function generateAndDownloadSound(options, filename) {
    totalSounds++;
    
    const { duration, type, frequency, sweep, volumeEnvelope, effects } = options;
    
    console.log(`Generating ${filename}...`);
    
    // Create oscillator
    const oscillator = ctx.createOscillator();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency || 440, ctx.currentTime);
    
    // Add frequency sweep if specified
    if (sweep) {
        oscillator.frequency.exponentialRampToValueAtTime(
            sweep.endFreq || 880, 
            ctx.currentTime + (sweep.duration || duration)
        );
    }
    
    // Create gain node for volume control
    const gainNode = ctx.createGain();
    
    // Set volume envelope
    if (volumeEnvelope) {
        const { attack, decay, sustain, release } = volumeEnvelope;
        const now = ctx.currentTime;
        
        // Attack
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volumeEnvelope.peak || 1, now + attack);
        
        // Decay & Sustain
        gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
        
        // Release
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
    } else {
        // Simple fade in/out if no envelope specified
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    }
    
    // Connect to destination
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Start recording
    const recorder = new MediaRecorder(ctx.destination.stream);
    const chunks = [];
    
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = filename;
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        completedSounds++;
        console.log(`✅ ${filename} generated (${completedSounds}/${totalSounds})`);
        
        if (completedSounds === totalSounds) {
            console.log("🎉 All sounds generated! Please save them to your 'sounds' directory.");
            isGenerating = false;
        }
    };
    
    // Start oscillator and recording
    oscillator.start();
    recorder.start();
    
    // Stop after duration
    setTimeout(() => {
        oscillator.stop();
        recorder.stop();
    }, duration * 1000);
}

// Generate UI hover sound (short subtle click)
function generateUIHoverSound() {
    generateAndDownloadSound({
        duration: 0.1,
        type: 'sine',
        frequency: 1200,
        sweep: { endFreq: 800, duration: 0.1 },
        volumeEnvelope: { attack: 0.01, decay: 0.02, sustain: 0.2, release: 0.07, peak: 0.3 }
    }, 'ui_hover.mp3');
}

// Generate UI click sound (short digital click)
function generateUIClickSound() {
    generateAndDownloadSound({
        duration: 0.15, 
        type: 'square',
        frequency: 800,
        sweep: { endFreq: 400, duration: 0.15 },
        volumeEnvelope: { attack: 0.01, decay: 0.05, sustain: 0.1, release: 0.09, peak: 0.5 }
    }, 'ui_click.mp3');
}

// Generate UI select sound (affirmative beep)
function generateUISelectSound() {
    generateAndDownloadSound({
        duration: 0.25,
        type: 'sine',
        frequency: 600,
        sweep: { endFreq: 900, duration: 0.25 },
        volumeEnvelope: { attack: 0.02, decay: 0.05, sustain: 0.4, release: 0.18, peak: 0.6 }
    }, 'ui_select.mp3');
}

// Generate UI back sound (negative beep)
function generateUIBackSound() {
    generateAndDownloadSound({
        duration: 0.2,
        type: 'sawtooth',
        frequency: 500,
        sweep: { endFreq: 300, duration: 0.2 },
        volumeEnvelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.14, peak: 0.4 }
    }, 'ui_back.mp3');
}

// Generate UI error sound (error buzz)
function generateUIErrorSound() {
    generateAndDownloadSound({
        duration: 0.3,
        type: 'sawtooth',
        frequency: 200,
        sweep: { endFreq: 100, duration: 0.3 },
        volumeEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.19, peak: 0.5 }
    }, 'ui_error.mp3');
}

// Print friendly usage instructions
console.log("Sci-Fi Sound Generator loaded! Run generateGameSounds() to start creating sounds.");
console.log("This will generate UI sound effects for your game.");
console.log("Make sure to save the sounds to your 'sounds' directory.");

// Automatically generate sounds if this script is loaded with eval
if (typeof generatorAutoRun !== 'undefined' && generatorAutoRun) {
    generateGameSounds();
} 