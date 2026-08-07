// ===============================
// SOUND SYSTEM
// ===============================

// Sound library
const SOUNDS = {
    // UI Sounds
    UI_HOVER: '/sounds/ui_hover.mp3',
    UI_CLICK: '/sounds/ui_click.mp3',
    UI_SELECT: '/sounds/ui_select.mp3',
    UI_BACK: '/sounds/ui_back.mp3',
    UI_ERROR: '/sounds/ui_error.mp3',
    
    // Combat Sounds
    ATTACK: '/sounds/attack.mp3',
    HIT: '/sounds/hit.mp3',
    CRIT: '/sounds/crit.mp3',
    PLAYER_HURT: '/sounds/player_hurt.mp3',
    ENEMY_HURT: '/sounds/enemy_hurt.mp3',
    ENEMY_DEATH: '/sounds/enemy_death.mp3',
    
    // Item Sounds
    ITEM_PICKUP: '/sounds/item_pickup.mp3',
    ITEM_EQUIP: '/sounds/item_equip.mp3',
    ITEM_DROP: '/sounds/item_drop.mp3',
    
    // System Sounds
    LEVEL_UP: '/sounds/level_up.mp3',
    SAVE_GAME: '/sounds/save_game.mp3'
};

// Audio context and audio elements cache
let audioContext = null;
const audioElements = {};
let soundEnabled = true;

// Initialize the audio system
function initAudioSystem() {
    try {
        // Create audio context
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // Pre-load UI sounds that will be used frequently
        preloadSound(SOUNDS.UI_HOVER);
        preloadSound(SOUNDS.UI_CLICK);
        
        console.log('Audio system initialized');
    } catch (e) {
        console.error('Web Audio API not supported:', e);
        soundEnabled = false;
    }
}

// Preload a sound to avoid delay when playing
function preloadSound(soundPath) {
    if (!soundEnabled) return;
    
    if (!audioElements[soundPath]) {
        const audio = new Audio(soundPath);
        audio.load();
        audioElements[soundPath] = audio;
    }
}

// Play a sound
function playSound(soundName, volume = 0.3) {
    if (!soundEnabled) return;
    
    const soundPath = SOUNDS[soundName];
    if (!soundPath) {
        console.error(`Sound "${soundName}" not found`);
        return;
    }
    
    try {
        // Use cached audio element if available
        if (audioElements[soundPath]) {
            const audio = audioElements[soundPath];
            audio.volume = volume;
            
            // Restart the sound if it's already playing
            audio.currentTime = 0;
            audio.play().catch(e => console.error('Error playing sound:', e));
        } else {
            // Create a new audio element
            const audio = new Audio(soundPath);
            audio.volume = volume;
            audio.play().catch(e => console.error('Error playing sound:', e));
            
            // Cache it for future use
            audioElements[soundPath] = audio;
        }
    } catch (e) {
        console.error('Error playing sound:', e);
    }
}

// Toggle sound on/off
function toggleSound() {
    soundEnabled = !soundEnabled;
    return soundEnabled;
}

// Set up UI sound events
function setupUISounds() {
    // Add sounds to all buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mouseenter', () => playSound('UI_HOVER', 0.1));
        button.addEventListener('click', () => playSound('UI_CLICK', 0.2));
    });
    
    // Add sounds to sidebar menu items
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.addEventListener('mouseenter', () => playSound('UI_HOVER', 0.1));
        item.addEventListener('click', () => playSound('UI_SELECT', 0.25));
    });
    
    // Add sounds to inventory items
    document.querySelectorAll('#inventory li, .equipment-slot').forEach(item => {
        item.addEventListener('mouseenter', () => playSound('UI_HOVER', 0.1));
        item.addEventListener('click', () => playSound('UI_SELECT', 0.2));
    });
}

// Initialize everything on page load
document.addEventListener('DOMContentLoaded', () => {
    initAudioSystem();
    
    // Wait a bit for the DOM to fully initialize before setting up UI sounds
    setTimeout(setupUISounds, 1000);
    
    const soundToggleBtn = document.getElementById('toggle-sound');
    if (soundToggleBtn) {
        soundToggleBtn.textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
        soundToggleBtn.addEventListener('click', () => {
            const isEnabled = toggleSound();
            soundToggleBtn.textContent = `Sound: ${isEnabled ? 'ON' : 'OFF'}`;
            playSound('UI_SELECT');
        });
    }
});

// Helper functions for common sound effects
function playSaveSound() {
    playSound('SAVE_GAME', 0.4);
}

function playEquipSound() {
    playSound('ITEM_EQUIP', 0.3);
}

function playPickupSound() {
    playSound('ITEM_PICKUP', 0.3);
}

function playLevelUpSound() {
    playSound('LEVEL_UP', 0.5);
}

// Expose functions
window.playSound = playSound;
window.toggleSound = toggleSound; 