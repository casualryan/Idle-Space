// combat.js

let currentLocation = null;
let enemy = null; // Initialize enemy as null
let combatInterval;
let playerAttackTimer = 0;
let enemyAttackTimer = 0;
let playerHasFled = false;
let combatRestartTimeout;


document.addEventListener('DOMContentLoaded', () => {
    // Initial stat displays
    updatePlayerStatsDisplay();
    initializeEnemyStatsDisplay();  // Set enemy stats to default before combat

    // Display adventure locations
    displayAdventureLocations();

    // Event listener for the "Stop Combat" button
    const stopCombatButton = document.getElementById('stop-combat');
    if (stopCombatButton) {
        stopCombatButton.addEventListener('click', () => {
            stopCombat();
        });
    } else {
        console.error("Stop Combat button not found in the DOM.");
    }
});

// Function to start an adventure
function startAdventure(location) {
    console.log(location.enemies);
    if (isCombatActive) {
        logMessage("You are already in combat!");
        return;
    }
    clearLog();
    currentLocation = location;
    playerHasFled = false;
    logMessage(`You arrive at ${location.name}.`);
    startCombat();
}

function clearLog() {
    const logElement = document.getElementById("log-messages");
    logElement.innerHTML = "";
}

function startCombat() {
    if (isCombatActive) {
        console.log("Combat already active");
        return;
    }

    if (!currentLocation) {
        console.error("No current location set. Cannot start combat.");
        return;
    }
    if (isGathering) {
        stopGatheringActivity();
    }

    isCombatActive = true;

    // Initialize enemy
    spawnEnemy();

    // Start combat loop
    combatInterval = setInterval(combatLoop, 100);
    console.log("Combat started.");

    document.getElementById('stop-combat').style.display = 'block';

    // Update the adventure locations display (e.g., change to 'Flee' button)
    displayAdventureLocations();
}


function spawnEnemy() {
    if (!currentLocation) {
        logMessage("No location selected.");
        stopCombat();
        return;
    }

    // Get the list of enemies for the current location
    const availableEnemies = currentLocation.enemies.map(enemyEntry => {
        const enemyData = enemies.find(e => e.name === enemyEntry.name);
        if (enemyData) {
            return { ...enemyData, spawnRate: enemyEntry.spawnRate };
        } else {
            console.warn(`Enemy data not found for ${enemyEntry.name}`);
            return null;
        }
    }).filter(e => e !== null);

    // Check if there are available enemies
    if (!availableEnemies || availableEnemies.length === 0) {
        console.error("No available enemies to spawn.");
        stopCombat();
        return;
    }

    // Calculate the total spawn rate
    const totalSpawnRate = availableEnemies.reduce((sum, enemy) => sum + enemy.spawnRate, 0);

    // Generate a random number between 0 and totalSpawnRate
    let randomValue = Math.random() * totalSpawnRate;

    // Select the enemy based on the random value
    let cumulativeRate = 0;
    for (let enemyData of availableEnemies) {
        cumulativeRate += enemyData.spawnRate;
        if (randomValue <= cumulativeRate) {
            enemy = JSON.parse(JSON.stringify(enemyData));
            break;
        }
    }

    if (!enemy) {
        console.error("Failed to spawn an enemy.");
        stopCombat();
        return;
    }

    enemy.currentHealth = enemy.health;
    enemy.currentShield = enemy.energyShield;
    enemy.statusEffects = [];

    // Add calculateStats method to enemy
    enemy.calculateStats = function() {
        this.totalStats = JSON.parse(JSON.stringify(this));
    };
    enemy.calculateStats();

    // Log the enemy appearance
    logMessage(`A ${enemy.name} appears!`);

    updateEnemyStatsDisplay();
}

function updateEnemyStatsDisplay() {
    if (!enemy) {
        initializeEnemyStatsDisplay();
        return;
    }

    document.getElementById("enemy-name").textContent = enemy.name;
    document.getElementById("enemy-attack-speed").textContent = enemy.attackSpeed.toFixed(2);
    document.getElementById("enemy-crit-chance").textContent = (enemy.criticalChance * 100).toFixed(2) + "%";
    document.getElementById("enemy-crit-multiplier").textContent = enemy.criticalMultiplier.toFixed(2);

    // Update HP bar
    const enemyHpBar = document.getElementById('enemy-hp-bar');
    const enemyHpPercentage = (enemy.currentHealth / enemy.health) * 100;
    enemyHpBar.style.width = enemyHpPercentage + '%';

    // Update HP text
    const enemyHpText = document.getElementById('enemy-hp-text');
    enemyHpText.textContent = `${Math.round(enemy.currentHealth)} / ${Math.round(enemy.health)}`;

    const enemyEsBar = document.getElementById('enemy-es-bar');
    const enemyEsPercentage = (enemy.currentShield / enemy.energyShield) * 100 || 0;
    enemyEsBar.style.width = enemyEsPercentage + '%';

    // Update Energy Shield text
    const enemyEsText = document.getElementById('enemy-es-text');
    enemyEsText.textContent = `${Math.round(enemy.currentShield)} / ${Math.round(enemy.energyShield)}`;

    // Update damage types
    const damageTypesList = document.getElementById('enemy-damage-types');
    damageTypesList.innerHTML = '';
    for (let type in enemy.damageTypes) {
        const li = document.createElement('li');
        li.textContent = `${capitalize(type)}: ${enemy.damageTypes[type]}`;
        damageTypesList.appendChild(li);
    }

    // Update defense types
    const defenseTypesList = document.getElementById('enemy-defense-types');
    defenseTypesList.innerHTML = '';
    for (let type in enemy.defenseTypes) {
        const li = document.createElement('li');
        li.textContent = `${capitalize(type)}: ${enemy.defenseTypes[type]}`;
        defenseTypesList.appendChild(li);
    }

    // Update active effects
    const activeEffectsList = document.getElementById('enemy-active-effects');
    activeEffectsList.innerHTML = '';
    enemy.statusEffects.forEach(effect => {
        const li = document.createElement('li');
        li.textContent = `${effect.name} (${effect.remainingDuration.toFixed(1)}s)`;
        activeEffectsList.appendChild(li);
    });
}

// Function to reset player stats
function resetPlayerStats() {
    player.totalStats = JSON.parse(JSON.stringify(player.baseStats));
    player.currentHealth = player.totalStats.health;
    player.currentShield = player.totalStats.energyShield;
    player.statusEffects = [];
    updatePlayerStatsDisplay();
}

// Function to flee combat
function fleeCombat() {
    if (isCombatActive) {
        stopCombat('playerFled');
        logMessage("You have fled from combat.");
        currentLocation = null;
    } else {
        logMessage("You are not in combat.");
    }

    // Clear any pending combat restart
    if (combatRestartTimeout) {
        clearTimeout(combatRestartTimeout);
        combatRestartTimeout = null;
        console.log("Pending combat restart canceled due to fleeing.");
    }
}



function combatLoop() {
    if (!isCombatActive) return;

    const deltaTime = 0.1; // 100ms in seconds

    // Update player attack progress
    playerAttackTimer += deltaTime;
    const playerAttackInterval = 3 / player.totalStats.attackSpeed; // Base attack time is now 3 seconds
    const playerProgress = Math.min((playerAttackTimer / playerAttackInterval) * 100, 100);
    document.getElementById('player-attack-progress-bar').style.width = playerProgress + '%';

    if (playerAttackTimer >= playerAttackInterval) {
        playerAttack();
        playerAttackTimer = 0;
    }

    // Update enemy attack progress
    enemyAttackTimer += deltaTime;
    const enemyAttackInterval = 3 / enemy.attackSpeed; // Base attack time is now 3 seconds
    const enemyProgress = Math.min((enemyAttackTimer / enemyAttackInterval) * 100, 100);
    document.getElementById('enemy-attack-progress-bar').style.width = enemyProgress + '%';

    if (enemyAttackTimer >= enemyAttackInterval) {
        enemyAttack();
        enemyAttackTimer = 0;
    }

    // Process status effects for player and enemy
    if (player.currentHealth > 0) {
        processStatusEffects(player, deltaTime);
    }
    if (enemy.currentHealth > 0) {
        processStatusEffects(enemy, deltaTime);
    }

    // Check for combat end
    if (player.currentHealth <= 0) {
        stopCombat('playerDefeated');
    } else if (enemy.currentHealth <= 0) {
        stopCombat('enemyDefeated');
    }
}

// Function to stop combat
function stopCombat(reason) {
        if (!isCombatActive) {
            console.log("Combat already inactive. stopCombat() aborted.");
            return;
        }

        isCombatActive = false;
        clearInterval(combatInterval);
        console.log("Combat interval cleared.");
        logMessage("Combat stopped due to: " + reason);

        // Reset player's HP and shield
        player.currentHealth = player.totalStats.health;
        player.currentShield = player.totalStats.energyShield;
        updatePlayerStatsDisplay();

        // Reset attack timers
        playerAttackTimer = 0;
        enemyAttackTimer = 0;
        document.getElementById('player-attack-progress-bar').style.width = '0%';
        document.getElementById('enemy-attack-progress-bar').style.width = '0%';
        document.getElementById('stop-combat').style.display = 'none';

        // Reset enemy
        enemy = null;
        updateEnemyStatsDisplay();

        // Clear enemy stats display
        initializeEnemyStatsDisplay();

        // Update the adventure locations display
        displayAdventureLocations();

        // Auto-restart combat only if the enemy was defeated
        if (reason === 'enemyDefeated' && window.currentScreen === 'adventure-screen') {
            const countdownElement = document.getElementById('next-enemy-countdown');
            const timerElement = document.getElementById('next-enemy-timer');
            let countdown = 3; // Number of seconds
        
            timerElement.style.display = 'block';
            countdownElement.textContent = countdown;
        
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    timerElement.style.display = 'none';
                } else {
                    countdownElement.textContent = countdown;
                }
            }, 1000);
        
            combatRestartTimeout = setTimeout(() => {
                if (window.currentScreen === 'adventure-screen') {
                    startCombat();
                }
                timerElement.style.display = 'none';
            }, countdown * 1000);
    }
}



// Function for player attack
function playerAttack() {
    let totalDamage = calculateDamage(player, enemy);
    applyDamage(enemy, totalDamage, enemy.name);

    // Apply special effects if available
    if (player.totalStats.specialEffects && player.totalStats.specialEffects.length > 0) {
        player.totalStats.specialEffects.forEach(effect => {
            if (Math.random() < effect.chance) {
                effect.applyEffect(enemy);
            }
        });
    }
}

// Function for enemy attack
function enemyAttack() {
    let totalDamage = calculateDamage(enemy, player);
    applyDamage(player, totalDamage, "Player");

    // Enemies can also have special effects
    if (enemy.specialEffect && Math.random() < enemy.specialEffect.chance) {
        enemy.specialEffect.applyEffect(player);
    }
}

function applyStatusEffect(target, effectName) {
    // Create the status effect instance using the factory function
    let effectFactory = statusEffects[effectName];
    if (effectFactory) {
        let effect = effectFactory(target);
        target.statusEffects.push(effect);
    } else {
        console.error(`Status effect '${effectName}' not found.`);
    }
}

// Function to calculate damage
function calculateDamage(attacker, defender) {
    let totalDamage = 0;
    let isCriticalHit = Math.random() < attacker.totalStats.criticalChance;

    // Check for status effects that affect critical hits
    if (defender.statusEffects.some(effect => effect.name === "Zapped")) {
        isCriticalHit = true; // Force a critical hit
        defender.statusEffects = defender.statusEffects.filter(effect => effect.name !== "Zapped");
        logMessage(`${defender === player ? "Player" : defender.name} was Zapped! The attack is a guaranteed critical hit!`);
    }

    if (isCriticalHit) {
        logMessage(`${attacker === player ? "Player" : attacker.name} lands a critical hit!`);
    }

    for (let damageType in attacker.totalStats.damageTypes) {
        let baseDamage = attacker.totalStats.damageTypes[damageType];

        // Apply weapon type modifiers if attacker is player
        if (attacker === player && player.equipment.mainHand) {
            const weapon = player.equipment.mainHand;
            const weaponType = weapon.weaponType;
            if (attacker.totalStats.weaponTypeModifiers && attacker.totalStats.weaponTypeModifiers[weaponType]) {
                const weaponTypeModifier = attacker.totalStats.weaponTypeModifiers[weaponType];
                baseDamage *= (1 + weaponTypeModifier);
            }
        }

        // Apply critical hit multiplier
        if (isCriticalHit) {
            baseDamage *= attacker.totalStats.criticalMultiplier;
        }

        // Apply defender's resistance
        let resistanceStat = matchDamageToDefense(damageType);
        let resistance = defender.totalStats.defenseTypes[resistanceStat] || 0;
        let reducedDamage = baseDamage * (1 - (resistance / 100));

        totalDamage += reducedDamage;
    }

    // Round total damage to nearest whole number
    totalDamage = Math.round(totalDamage);

    return totalDamage;
}

// Function to apply damage to target
function applyDamage(target, damage, targetName, damageTypes = null) {
    if (damageTypes) {
        // If specific damage types are provided, calculate damage accordingly
        let totalDamage = 0;
        for (let damageType in damageTypes) {
            let baseDamage = damageTypes[damageType];
            let resistanceStat = matchDamageToDefense(damageType);
            let resistance = target.totalStats.defenseTypes[resistanceStat] || 0;

            let reducedDamage = baseDamage * (1 - (resistance / 100)); // Reduce damage based on resistance

            totalDamage += reducedDamage;
        }
        damage = totalDamage;
    }

    // Round damage to the nearest whole number
    damage = Math.round(damage);

    if (target.currentShield > 0) {
        let shieldAbsorbed = Math.min(target.currentShield, damage);
        target.currentShield -= shieldAbsorbed;
        damage -= shieldAbsorbed;

        // Round shield absorbed to nearest whole number
        shieldAbsorbed = Math.round(shieldAbsorbed);

        logMessage(`${targetName} absorbs ${shieldAbsorbed} damage with their shield.`);

        // Display shield damage popup
        if (shieldAbsorbed > 0) {
            if (target === player) {
                displayDamagePopup(`Your shield absorbed ${shieldAbsorbed} damage`, true);
            } else {
                displayDamagePopup(`${targetName}'s shield absorbed ${shieldAbsorbed} damage`, false);
            }
        }
    }

    if (damage > 0) {
        target.currentHealth = Math.max(0, target.currentHealth - damage);
        logMessage(`${targetName} takes ${damage} damage.`);

        // Display damage popup
        if (target === player) {
            displayDamagePopup(`You have taken ${damage} damage`, true);
        } else {
            displayDamagePopup(`${targetName} has taken ${damage} damage`, false);
        }
    }

    if (target === enemy) {
        updateEnemyStatsDisplay();
    } else {
        updatePlayerStatsDisplay();
    }

    if (target.currentHealth <= 0) {
        logMessage(`${targetName} has been defeated!`);
        // Remove all status effects from the defeated entity
        target.statusEffects = [];
        if (target === enemy) {
            dropLoot(enemy);
            // Grant experience to the player
            gainExperience(enemy.experienceValue || 0);
            updatePlayerStatsDisplay();
            stopCombat('enemyDefeated');  // Stop combat on enemy defeat
        } else if (target === player) {
            stopCombat('playerDefeated');  // Stop combat on player defeat
        }
    }
}

// Function to process status effects
function processStatusEffects(entity, deltaTime) {
    for (let i = entity.statusEffects.length - 1; i >= 0; i--) {
        const effect = entity.statusEffects[i];
        if (effect.duration > 0) {
            effect.remainingDuration -= deltaTime;
            if (effect.onTick) effect.onTick(effect);

            if (effect.remainingDuration <= 0) {
                if (effect.onExpire) effect.onExpire(effect);
                entity.statusEffects.splice(i, 1); // Remove expired effect
            }
        }
    }
}

// Function to handle loot drops
function dropLoot(enemy) {
    logMessage(`${enemy.name} is dropping loot...`);
    let lootFound = false;

    enemy.lootTable.forEach(loot => {
        if (Math.random() < loot.dropRate) {
            if (typeof items === 'undefined') {
                console.error("The 'items' array is undefined. Ensure that 'items.js' is included before 'combat.js'.");
                return;
            }

            const itemTemplate = items.find(item => item.name === loot.itemName);
            if (itemTemplate) {
                // Calculate the quantity to drop
                const quantity = getRandomInt(loot.minQuantity, loot.maxQuantity);
                const droppedItem = generateItemInstance(itemTemplate);
                droppedItem.quantity = quantity;

                addItemToInventory(droppedItem);

                const lootMessage = `You received: ${droppedItem.name} x${droppedItem.quantity}`;
                logMessage(lootMessage);
                displayLootPopup(lootMessage); // Display loot popup
                updateInventoryDisplay();
                lootFound = true;
            } else {
                console.warn(`Item template not found for ${loot.itemName}`);
            }
        }
    });

    if (!lootFound) {
        logMessage("The enemy had nothing of value.");
    }
}



function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function displayLootPopup(message) {
    const container = document.getElementById('loot-popups-container');
    if (!container) {
        console.error('Loot popups container not found in the DOM.');
        return;
    }

    const popup = document.createElement('div');
    popup.classList.add('loot-popup');
    popup.textContent = message;

    // Add the popup to the container
    container.appendChild(popup);

    // Remove the popup after 3 seconds
    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transition = 'opacity 0.5s';
        // Remove the popup from the DOM after the transition
        setTimeout(() => {
            container.removeChild(popup);
        }, 500);
    }, 3000);
}

// Function to match damage types to defense stats
function matchDamageToDefense(damageType) {
    switch (damageType) {
        case 'kinetic': return 'toughness';
        case 'mental': return 'fortitude';
        case 'pyro': return 'heatResistance';
        case 'chemical': return 'immunity';
        case 'magnetic': return 'antimagnet';
        default: return '';
    }
}

// Function to display damage popup
function displayDamagePopup(message, isPlayer) {
    const container = document.getElementById('damage-popups-container');
    if (!container) {
        console.error('Damage popups container not found in the DOM.');
        return;
    }

    const popup = document.createElement('div');
    popup.classList.add('damage-popup');
    popup.textContent = message;

    // Add appropriate class based on who took damage
    if (isPlayer) {
        popup.classList.add('player-damage');
    } else {
        popup.classList.add('enemy-damage');
    }

    // Add the popup to the container
    container.appendChild(popup);

    // Remove the popup after 3 seconds
    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transition = 'opacity 0.5s';
        // Remove the popup from the DOM after the transition
        setTimeout(() => {
            container.removeChild(popup);
        }, 500);
    }, 3000);
}

function initializeEnemyStatsDisplay() {
    document.getElementById("enemy-name").textContent = "No Enemy";
    document.getElementById("enemy-attack-speed").textContent = "N/A";
    document.getElementById("enemy-crit-chance").textContent = "N/A";
    document.getElementById("enemy-crit-multiplier").textContent = "N/A";
    document.getElementById('enemy-attack-progress-bar').style.width = '0%';
    document.getElementById('enemy-hp-bar').style.width = '0%';
    document.getElementById('enemy-hp-text').textContent = '0 / 0';
    document.getElementById('enemy-es-bar').style.width = '0%';
    document.getElementById('enemy-es-text').textContent = '0 / 0';

    // Clear damage and defense types
    document.getElementById('enemy-damage-types').innerHTML = '';
    document.getElementById('enemy-defense-types').innerHTML = '';
    document.getElementById('enemy-active-effects').innerHTML = '';
}

// Helper function to capitalize the first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
