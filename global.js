window.currentScreen = '';

console.log('global.js loaded');
console.log('window.inventory at the start:', window.inventory);

// Function to apply item modifiers to stats
// Function to apply item modifiers to stats
function applyItemModifiers(stats, item) {
    // Apply flat damage types
    if (item.damageTypes) {
        for (let damageType in item.damageTypes) {
            if (!stats.damageTypes[damageType]) {
                stats.damageTypes[damageType] = 0;
            }
            stats.damageTypes[damageType] += item.damageTypes[damageType];
        }
    }

    // Apply percentage damage type modifiers
    if (item.statModifiers && item.statModifiers.damageTypes) {
        for (let damageType in item.statModifiers.damageTypes) {
            if (!stats.damageTypeModifiers[damageType]) {
                stats.damageTypeModifiers[damageType] = 1; // Start with a multiplier of 1
            }
            stats.damageTypeModifiers[damageType] *= (1 + item.statModifiers.damageTypes[damageType] / 100); // Convert percentage to multiplier
        }
    }

    // Apply defense types
    if (item.defenseTypes) {
        for (let defenseType in item.defenseTypes) {
            if (!stats.defenseTypes[defenseType]) {
                stats.defenseTypes[defenseType] = 0;
            }
            stats.defenseTypes[defenseType] += item.defenseTypes[defenseType];
        }
    }

    // Apply flat health bonus
    if (item.healthBonus !== undefined) {
        stats.healthBonus = (stats.healthBonus || 0) + item.healthBonus;
    }

    // Apply flat energy shield bonus
    if (item.energyShieldBonus !== undefined) {
        stats.energyShieldBonus = (stats.energyShieldBonus || 0) + item.energyShieldBonus;
    }

    // Apply percentage health bonus
    if (item.healthBonusPercent !== undefined) {
        stats.healthBonusPercent = (stats.healthBonusPercent || 0) + item.healthBonusPercent;
    }

    // Apply percentage energy shield bonus
    if (item.energyShieldBonusPercent !== undefined) {
        stats.energyShieldBonusPercent = (stats.energyShieldBonusPercent || 0) + item.energyShieldBonusPercent;
    }

    // Apply attack speed modifier
    if (item.attackSpeedModifier !== undefined) {
        stats.attackSpeedMultiplier = (stats.attackSpeedMultiplier || 1) * (1 + item.attackSpeedModifier); // Convert percentage to multiplier
    }

    // Apply critical chance modifier
    if (item.criticalChanceModifier !== undefined) {
        stats.criticalChance = (stats.criticalChance || 0) + item.criticalChanceModifier;
    }

    // Apply critical multiplier modifier
    if (item.criticalMultiplierModifier !== undefined) {
        stats.criticalMultiplier = (stats.criticalMultiplier || 1) * (1 + item.criticalMultiplierModifier);
    }

    // Apply effects
    if (item.effects) {
        stats.effects = stats.effects.concat(item.effects);
    }
}



// Function to update player stats display dynamically
function updatePlayerStatsDisplay() {
    player.calculateStats();  // Ensure stats are updated before display
    if (player.currentHealth === null || player.currentHealth === undefined) {
        player.currentHealth = player.totalStats.health;
    }
    if (player.currentShield === null || player.currentShield === undefined) {
        player.currentShield = player.totalStats.energyShield;
    }

    // Get the elements
    const attackSpeedElement = document.getElementById("player-attack-speed");
    const critChanceElement = document.getElementById("player-crit-chance");
    const critMultiplierElement = document.getElementById("player-crit-multiplier");

    // Ensure elements exist
    if (!attackSpeedElement || !critChanceElement || !critMultiplierElement) {
        console.error("One or more player stat elements not found in the DOM.");
        return;
    }

    attackSpeedElement.textContent = player.totalStats.attackSpeed.toFixed(2);
    critChanceElement.textContent = `${(player.totalStats.criticalChance * 100).toFixed(2)}%`;
    critMultiplierElement.textContent = player.totalStats.criticalMultiplier.toFixed(2);

    // Update HP bar
    const playerHpBar = document.getElementById('player-hp-bar');
    const playerHpPercentage = (player.currentHealth / player.totalStats.health) * 100;
    playerHpBar.style.width = playerHpPercentage + '%';

    // Update HP text
    const playerHpText = document.getElementById('player-hp-text');
    playerHpText.textContent = `${Math.round(player.currentHealth)} / ${Math.round(player.totalStats.health)}`;

    // Update Energy Shield bar
    const playerEsBar = document.getElementById('player-es-bar');
    const playerEsPercentage = (player.currentShield / player.totalStats.energyShield) * 100 || 0;
    playerEsBar.style.width = playerEsPercentage + '%';

    // Update Energy Shield text
    const playerEsText = document.getElementById('player-es-text');
    playerEsText.textContent = `${Math.round(player.currentShield)} / ${Math.round(player.totalStats.energyShield)}`;

    // Update damage types
    const damageTypesList = document.getElementById('player-damage-types');
    damageTypesList.innerHTML = '';
    for (let type in player.totalStats.damageTypes) {
        const li = document.createElement('li');
        li.textContent = `${capitalize(type)}: ${player.totalStats.damageTypes[type]}`;
        damageTypesList.appendChild(li);
    }

    // Update defense types
    const defenseTypesList = document.getElementById('player-defense-types');
    defenseTypesList.innerHTML = '';
    for (let type in player.totalStats.defenseTypes) {
        const li = document.createElement('li');
        li.textContent = `${capitalize(type)}: ${player.totalStats.defenseTypes[type]}`;
        defenseTypesList.appendChild(li);
    }

    // Update active effects
    const activeEffectsList = document.getElementById('player-active-effects');
    activeEffectsList.innerHTML = '';
    player.statusEffects.forEach(effect => {
        const li = document.createElement('li');
        li.textContent = `${effect.name} (${effect.remainingDuration.toFixed(1)}s)`;
        activeEffectsList.appendChild(li);
    });

    // Update level and experience
    const levelElement = document.getElementById("player-level");
    const experienceElement = document.getElementById("player-experience");

    // Ensure elements exist
    if (!levelElement || !experienceElement) {
        console.error("Level or experience elements not found in the DOM.");
        return;
    }

    levelElement.textContent = player.level;
    experienceElement.textContent = player.experience;
}

// Helper function to capitalize the first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Base stats for the player
let playerBaseStats = {
    health: 100,
    energyShield: 0,
    attackSpeed: 1.0, // Base attacks per 3 seconds
    attackSpeedModifier: 0.0, // Percentage modifier (e.g., 0.5 for +50%)
    criticalChance: 0,
    criticalMultiplier: 1.5,
    damageTypes: {
        kinetic: 0,
        mental: 0,
        pyro: 0,
        chemical: 0,
        magnetic: 0
    },
    defenseTypes: {
        toughness: 0,
        fortitude: 0,
        heatResistance: 0,
        immunity: 0,
        antimagnet: 0
    }
};

// Initialize player object
let player = {
    name: 'Player',
    level: 1,
    experience: 0,
    currentHealth: null,
    currentShield: null,
    baseStats: JSON.parse(JSON.stringify(playerBaseStats)),
    totalStats: {},
    statusEffects: [],
    equipment: {
        mainHand: null,
        offHand: null,
        head: null,
        chest: null,
        legs: null,
        feet: null,
        gloves: null,
        bionicSlots: [null, null, null, null],
    },
    gatheringSkills: {
        Mining: {
            level: 1,
            experience: 0,
        },
        Medtek: {
            level: 1,
            experience: 0,
        },
        // Add other skills as needed
    },
    activeBuffs: [], // Correctly defined as a property
    effects: [],     // Initialize effects array
    applyBuff: function(buffName) {
        // Find the buff definition by name
        const buffDef = buffs.find(b => b.name === buffName);
        if (!buffDef) {
            console.error(`Buff '${buffName}' not found.`);
            return;
        }
    
        // Create a deep copy of the buff to avoid modifying the original definition
        const buff = JSON.parse(JSON.stringify(buffDef));
        buff.remainingDuration = buff.duration; // Initialize remaining duration
    
        // Check if the buff already exists on the player
        const existingBuff = this.activeBuffs.find(b => b.name === buff.name);
        if (existingBuff) {
            // Refresh duration
            existingBuff.remainingDuration = buff.duration;
        } else {
            this.activeBuffs.push(buff);
        }
        updatePlayerStatsDisplay();
    
        console.log(`Applied buff: ${buff.name}`);
        logMessage(`${this.name} gains buff: ${buff.name}`);
    
        // Recalculate stats to apply the buff immediately
        this.calculateStats();
    },
    
    calculateStats: function() {
        let stats = JSON.parse(JSON.stringify(this.baseStats));
    
        // Initialize base stats and modifiers
        stats.attackSpeed = stats.attackSpeed || 1.0;
        stats.attackSpeedMultiplier = 1.0;
        stats.criticalChance = stats.criticalChance || 0;
        stats.criticalMultiplier = stats.criticalMultiplier || 1.5;
        stats.criticalMultiplierMultiplier = 1.0;
    
        stats.damageTypes = {};
        stats.damageTypeModifiers = {};
        stats.defenseTypes = {};
        stats.effects = [];
    
        stats.healthBonus = 0;
        stats.healthBonusPercent = 0;
        stats.energyShieldBonus = 0;
        stats.energyShieldBonusPercent = 0;
    
        // Apply all equipped items
        Object.keys(this.equipment).forEach(slot => {
            if (slot === 'bionicSlots') {  // Handle bionic slots
                this.equipment[slot].forEach(bionic => {
                    if (bionic) applyItemModifiers(stats, bionic);
                });
            } else if (this.equipment[slot]) {  // Handle other equipped slots
                applyItemModifiers(stats, this.equipment[slot]);
            }
        });
    
        // Apply active buffs
        if (this.activeBuffs) {
            this.activeBuffs.forEach(buff => {
                if (buff.statChanges) {
                    for (let stat in buff.statChanges) {
                        if (stat === 'attackSpeed') {
                            stats.attackSpeedMultiplier *= 1 + buff.statChanges[stat];
                        } else if (stat === 'criticalMultiplier') {
                            stats.criticalMultiplierMultiplier *= 1 + buff.statChanges[stat];
                        } else if (stat in stats) {
                            stats[stat] += buff.statChanges[stat];
                        } else if (stats.damageTypes[stat] !== undefined) {
                            // Damage types
                            stats.damageTypes[stat] = (stats.damageTypes[stat] || 0) + buff.statChanges[stat];
                        } else if (stats.defenseTypes[stat] !== undefined) {
                            // Defense types
                            stats.defenseTypes[stat] = (stats.defenseTypes[stat] || 0) + buff.statChanges[stat];
                        } else {
                            // Handle any other stats
                            stats[stat] = (stats[stat] || 0) + buff.statChanges[stat];
                        }
                    }
                }
                if (buff.effects) {
                    stats.effects = stats.effects.concat(buff.effects);
                }
            });
        }
    
        // Apply attack speed modifications
        stats.attackSpeed *= stats.attackSpeedMultiplier;
        stats.attackSpeed = Math.min(Math.max(stats.attackSpeed, 0.1), 10); // Cap attack speed between 0.1 and 10
    
        // Apply critical multiplier modifications
        stats.criticalMultiplier *= stats.criticalMultiplierMultiplier;
    
        // Apply percentage modifiers to damage types
        for (let damageType in stats.damageTypes) {
            if (stats.damageTypeModifiers[damageType]) {
                stats.damageTypes[damageType] *= stats.damageTypeModifiers[damageType];
            }
            stats.damageTypes[damageType] = Math.round(stats.damageTypes[damageType]);
        }
    
        // Apply health bonuses
        stats.health += stats.healthBonus;
        stats.health *= (1 + stats.healthBonusPercent);
        stats.health = Math.round(stats.health);
    
        // Apply energy shield bonuses
        stats.energyShield += stats.energyShieldBonus;
        stats.energyShield *= (1 + stats.energyShieldBonusPercent);
        stats.energyShield = Math.round(stats.energyShield);
    
        this.totalStats = stats;
    
        // Initialize current health and shield if null
        if (this.currentHealth === null || this.currentHealth === undefined) {
            this.currentHealth = this.totalStats.health;
        }
        if (this.currentShield === null || this.currentShield === undefined) {
            this.currentShield = this.totalStats.energyShield;
        }
    
        // Update effects array
        this.effects = stats.effects;
    },
}
    

// Function to log messages
function logMessage(message) {
    const logElement = document.getElementById("log-messages");
    const messageElement = document.createElement("div");

    // Process the message for color codes
    const processedMessage = processColorCodes(message);
    messageElement.innerHTML = processedMessage;

    logElement.appendChild(messageElement);

    // Auto-scroll to the bottom
    logElement.scrollTop = logElement.scrollHeight;
}

function processColorCodes(message) {
    // Define color codes and their corresponding HTML styles
    const colorStyles = {
        'red': 'color: red;',
        'blue': 'color: blue;',
        'green': 'color: green;',
        'yellow': 'color: yellow;',
        'flashing': 'animation: flash 1s infinite;',
        // Add more colors or styles as needed
    };

    // Regular expression to match color codes
    const regex = /\{([^\}]+)\}/g;

    let result;
    let lastIndex = 0;
    let finalMessage = '';

    while ((result = regex.exec(message)) !== null) {
        const [fullMatch, code] = result;
        const index = result.index;

        // Append the text before the code
        finalMessage += message.substring(lastIndex, index);

        // Check if the code is an end tag
        if (code === 'end') {
            finalMessage += '</span>';
        } else if (colorStyles[code]) {
            // Start a new span with the corresponding style
            finalMessage += `<span style="${colorStyles[code]}">`;
        } else if (code.startsWith('rainbow')) {
            // Handle rainbow or alternating colors
            const text = code.substring('rainbow '.length);
            finalMessage += applyRainbowText(text);
            // Since we consumed the text, move lastIndex forward
            lastIndex = regex.lastIndex + text.length + 1;
            regex.lastIndex = lastIndex;
            continue;
        } else {
            // If the code is not recognized, include it as plain text
            finalMessage += fullMatch;
        }

        lastIndex = regex.lastIndex;
    }

    // Append any remaining text after the last code
    finalMessage += message.substring(lastIndex);

    return finalMessage;
}

function applyRainbowText(text) {
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const color = colors[i % colors.length];
        result += `<span style="color: ${color};">${text[i]}</span>`;
    }
    return result;
}


// Function to gain experience and handle leveling up
function gainExperience(amount) {
    player.experience += amount;
    logMessage(`You gained ${amount} experience points.`);
    updatePlayerStatsDisplay(); // Update the experience display
    checkLevelUp(); // Check if the player leveled up
}

function checkLevelUp() {
    const xpForNextLevel = getXPForNextLevel(player.level);
    if (player.experience >= xpForNextLevel) {
        player.level += 1;
        player.experience -= xpForNextLevel;
        logMessage(`Congratulations! You've reached level ${player.level}!`);
        // Increase base stats upon leveling up (optional)
        updatePlayerStatsDisplay(); // Update the level display
    }
}

function getXPForNextLevel(level) {
    // Example formula: XP needed doubles each level
    return 100 * Math.pow(2, level - 1);
}

// Save game function
function saveGame(isAutoSave = false) {
    const gameState = {
        player: {
            baseStats: player.baseStats,
            currentHealth: player.currentHealth,
            currentShield: player.currentShield,
            experience: player.experience,
            level: player.level,
            gatheringSkills: player.gatheringSkills,
            statusEffects: player.statusEffects,
            activeBuffs: player.activeBuffs,
            equipment: player.equipment,
        },
        inventory: window.inventory.map(item => {
            return JSON.parse(JSON.stringify(item));
        }),
    };

    localStorage.setItem('idleCombatGameSave', JSON.stringify(gameState));
    console.log('Game saved successfully.');
    if (!isAutoSave) {
        logMessage('Game saved successfully.');
    }
}


// Load game function
function loadGame() {
    const savedState = localStorage.getItem('idleCombatGameSave');
    if (savedState) {
        try {
            const gameState = JSON.parse(savedState);

            // Restore player data
            player.baseStats = gameState.player.baseStats || JSON.parse(JSON.stringify(playerBaseStats));
            player.currentHealth = gameState.player.currentHealth;
            player.currentShield = gameState.player.currentShield;
            player.statusEffects = gameState.player.statusEffects || [];
            player.experience = gameState.player.experience;
            player.level = gameState.player.level;
            player.gatheringSkills = gameState.player.gatheringSkills || player.gatheringSkills;
            player.activeBuffs = gameState.player.activeBuffs || [];
            player.equipment = restoreEquipment(gameState.player.equipment);

            // Restore inventory
            window.inventory = gameState.inventory.map(savedItem => {
                return restoreItem(savedItem);
            });

            // Recalculate player stats and update displays
            player.calculateStats();
            updatePlayerStatsDisplay();
            updateInventoryDisplay();
            updateEquipmentDisplay();

            console.log('Game loaded successfully.');
            logMessage('Game loaded successfully.');
        } catch (error) {
            console.error('Error loading saved game:', error);
            logMessage('Failed to load saved game. Starting a new game.');
            resetGame(); // Optional: reset the game if loading fails
        }
    } else {
        console.log('No saved game found.');
        logMessage('No saved game found.');
    }
    const event = new Event('gameLoaded');
    window.dispatchEvent(event);
}




function restoreItem(savedItem) {
    // Find the item template
    const itemTemplate = items.find(item => item.name === savedItem.name);
    if (itemTemplate) {
        // Create a new item instance from the template
        const itemInstance = generateItemInstance(itemTemplate);

        // Copy over properties from the saved item
        Object.assign(itemInstance, savedItem);

        return itemInstance;
    } else {
        console.warn(`Item template not found for ${savedItem.name}`);
        return savedItem; // Return the saved item as is
    }
}

function restoreEquipment(savedEquipment) {
    const equipment = {};

    // Restore standard slots
    ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves'].forEach(slot => {
        if (savedEquipment[slot]) {
            equipment[slot] = restoreItem(savedEquipment[slot]);
        } else {
            equipment[slot] = null;
        }
    });

    // Restore bionic slots
    equipment.bionicSlots = [];
    if (Array.isArray(savedEquipment.bionicSlots)) {
        savedEquipment.bionicSlots.forEach(savedItem => {
            if (savedItem) {
                equipment.bionicSlots.push(restoreItem(savedItem));
            } else {
                equipment.bionicSlots.push(null);
            }
        });
    }

    return equipment;
}



// Reset game function
function resetGame() {
    if (confirm('Are you sure you want to reset your save? This action cannot be undone.')) {
        // Clear localStorage
        localStorage.removeItem('idleCombatGameSave');

        // Reset player, inventory, and equipped items to initial state
        player.baseStats = JSON.parse(JSON.stringify(playerBaseStats));
        player.totalStats = {};
        player.currentHealth = null;
        player.currentShield = null;
        player.statusEffects = [];
        player.activeBuffs = [];
        player.effects = [];
        player.experience = 0;
        player.level = 1;
        player.gatheringSkills = {
            Mining: { level: 1, experience: 0 },
            Medtek: { level: 1, experience: 0 },
            // Add other skills as needed
        };

        // Clear inventory
        window.inventory = []; // Start with an empty inventory

        // Add a starting item
        const startingItemTemplate = items.find(item => item.name === 'Broken Phase Sword');
        if (startingItemTemplate) {
            const startingItem = generateItemInstance(startingItemTemplate);
            window.inventory.push(startingItem);
        } else {
            console.warn('Starting item template not found.');
        }

        player.equipment = {
            mainHand: null,
            offHand: null,
            head: null,
            chest: null,
            legs: null,
            feet: null,
            gloves: null,
            bionicSlots: [null, null, null, null],
        };

        player.calculateStats();
        updatePlayerStatsDisplay();
        updateInventoryDisplay();
        updateEquipmentDisplay();

        console.log('Game reset successfully.');
        logMessage('Game reset successfully.');
    } else {
        console.log('Reset cancelled.');
        logMessage('Reset cancelled.');
    }
}


// Auto-save interval (saves every 5 seconds)
setInterval(() => saveGame(true), 5000); // Adjust the interval as needed

// Function to display adventure locations
function displayAdventureLocations() {
    const adventureDiv = document.getElementById('adventure-locations');

    // Ensure the adventure locations div exists
    if (!adventureDiv) {
        console.error("Adventure locations div not found in the DOM.");
        return;
    }

    adventureDiv.innerHTML = ''; // Clear existing content

    if (!isCombatActive) {
        // Display location buttons when not in combat
        locations.forEach(location => {
            const locationButton = document.createElement('button');
            locationButton.textContent = location.name;
            locationButton.title = location.description;
            locationButton.addEventListener('click', () => {
                startAdventure(location);
            });
            adventureDiv.appendChild(locationButton);
        });
    } else {
        // Display "Flee" button when in combat
        const fleeButton = document.createElement('button');
        fleeButton.textContent = 'Flee';
        fleeButton.addEventListener('click', () => {
            stopCombat();
        });
        adventureDiv.appendChild(fleeButton);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('save-game').addEventListener('click', () => saveGame(false));
    document.getElementById('load-game').addEventListener('click', loadGame);
    document.getElementById('reset-game').addEventListener('click', resetGame);
    document.addEventListener('DOMContentLoaded', () => {

        document.querySelectorAll('.sidebar-menu li').forEach(menuItem => {
            menuItem.addEventListener('click', () => {
                const screenId = menuItem.getAttribute('data-screen');
                const skillName = menuItem.getAttribute('data-skill');
    
                // Stop any ongoing activities
                if (isGathering) {
                    stopGatheringActivity();
                }
                if (isCombatActive) {
                    stopCombat();
                }
    
                if (screenId) {
                    showScreen(screenId);
                } else if (skillName) {
                    const skillScreenId = getSkillScreenId(skillName);
                    showScreen(skillScreenId);
    
                    if (skillName === 'Fabrication') {
                        displayFabricationRecipes(); // Function from fabrication.js
                    } else {
                        // Display activities for gathering skills
                        displaySkillActivities(skillName);
                    }
                }
            });
        });
    });
    function getSkillScreenId(skillName) {
        if (skillName === 'Fabrication') {
            return 'fabrication-screen';
        } else {
            return `${skillName.toLowerCase()}-screen`;
        }
    }

    // Event listener for settings button
    document.getElementById('settings-button').addEventListener('click', () => {
        // Open settings modal
        document.getElementById('settings-menu').style.display = 'block';
    });

    // Event listener for closing settings modal
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-menu').style.display = 'none';
    });

    // Automatically load the game when the page is loaded
    loadGame();

    // Initial display updates
    updatePlayerStatsDisplay();
    updateInventoryDisplay();
    updateEquipmentDisplay();
});


// Function to show the appropriate screen
// global.js

function showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    // Show the selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        window.currentScreen = screenId;
    } else {
        console.error(`Screen with ID ${screenId} not found.`);
        return;
    }
    if (screenId !== 'adventure-screen') {
        // Clear any pending combat restart
        if (combatRestartTimeout) {
            clearTimeout(combatRestartTimeout);
            combatRestartTimeout = null;
            console.log("Pending combat restart canceled due to screen change.");
        }
    }

    // Dispatch screenChanged event
    const event = new CustomEvent('screenChanged', { detail: { screenId } });
    window.dispatchEvent(event);

    // Stop any ongoing activities when switching screens
    if (isGathering) {
        stopGatheringActivity();
    }
    if (isFabricating) {
        stopFabrication();
    }
    if (isCombatActive && screenId !== 'adventure-screen') {
        stopCombat();
    }
    if (screenId === 'adventure-screen') {
        stopCombat();
        updatePlayerStatsDisplay();
        updateEnemyStatsDisplay();
    }
}


// Event listeners for sidebar menu items
document.querySelectorAll('.sidebar-menu li').forEach(menuItem => {
    menuItem.addEventListener('click', () => {
        const screenId = menuItem.getAttribute('data-screen');
        const skillName = menuItem.getAttribute('data-skill');

        if (screenId) {
            showScreen(screenId);
            // Stop gathering or combat if needed
            if (screenId === 'adventure-screen') {
                // Handle adventure screen setup
                if (isGathering) {
                    stopGatheringActivity();
                }
                displayAdventureLocations(); // Ensure locations are displayed
            } else {
                // For other screens, stop combat
                if (isCombatActive) {
                    stopCombat();
                }
                if (isGathering) {
                    stopGatheringActivity();
                }
            }
        } else if (skillName) {
            // Show the skill screen
            showScreen(`${skillName.toLowerCase()}-screen`);
            // Start gathering activity if applicable
            startSkillActivity(skillName);
        }
    });
});