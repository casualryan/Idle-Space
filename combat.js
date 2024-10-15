// combat.js

let currentLocation = null;
let enemy = null; // Initialize enemy as null
let combatInterval;
let playerAttackTimer = 0;
let enemyAttackTimer = 0;
let playerHasFled = false;
let combatRestartTimeout;
let isCombatActive = false; // Ensure this variable is defined
let lastCombatLoopTime;
let adventureStartCountdownInterval;


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

    // Start the countdown before starting combat
    const countdownElement = document.getElementById('next-enemy-countdown');
    const timerElement = document.getElementById('next-enemy-timer');
    let countdown = 3; // Number of seconds before combat starts

    timerElement.style.display = 'block';
    countdownElement.textContent = countdown;

    const countdownInterval = setInterval(() => {
        countdown -= 1;
        countdownElement.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            timerElement.style.display = 'none';
            startCombat();
        }
    }, 1000);

    // Store the interval so we can clear it if needed
    adventureStartCountdownInterval = countdownInterval;
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
    clearBuffs(player);
    if (enemy) {
        clearBuffs(enemy);
    }

    // Start combat loop
    lastCombatLoopTime = Date.now();
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
    enemy.effects = enemy.effects || []; // Initialize enemy effects array
    enemy.activeBuffs = []; // Initialize active buffs if needed

    // Add calculateStats method to enemy
    enemy.calculateStats = function () {
        let stats = JSON.parse(JSON.stringify(this));

        // Initialize base stats and modifiers
        stats.attackSpeedMultiplier = 1.0;
        stats.criticalMultiplierMultiplier = 1.0;
        stats.damageTypes = stats.damageTypes || {};
        stats.damageTypeModifiers = stats.damageTypeModifiers || {};
        stats.defenseTypes = stats.defenseTypes || {};
        stats.effects = this.effects || [];

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
                            stats.damageTypes[stat] = (stats.damageTypes[stat] || 0) + buff.statChanges[stat];
                        } else if (stats.defenseTypes[stat] !== undefined) {
                            stats.defenseTypes[stat] = (stats.defenseTypes[stat] || 0) + buff.statChanges[stat];
                        } else {
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
        stats.attackSpeed = Math.min(Math.max(stats.attackSpeed, 0.1), 10);

        // Apply critical multiplier modifications
        stats.criticalMultiplier *= stats.criticalMultiplierMultiplier;

        // Apply percentage modifiers to damage types
        for (let damageType in stats.damageTypes) {
            if (stats.damageTypeModifiers[damageType]) {
                stats.damageTypes[damageType] *= stats.damageTypeModifiers[damageType];
            }
            stats.damageTypes[damageType] = Math.round(stats.damageTypes[damageType]);
        }

        this.totalStats = stats;
    };

    // Add applyBuff method to enemy
    enemy.applyBuff = function (buffName) {
        // Find the buff definition by name
        const buffDef = buffs.find(b => b.name === buffName);
        if (!buffDef) {
            console.error(`Buff '${buffName}' not found.`);
            return;
        }

        // Create a deep copy of the buff to avoid modifying the original definition
        const buff = JSON.parse(JSON.stringify(buffDef));
        buff.remainingDuration = buff.duration; // Initialize remaining duration

        // Check if the buff already exists on the enemy
        const existingBuff = this.activeBuffs.find(b => b.name === buff.name);
        if (existingBuff) {
            // Refresh duration
            existingBuff.remainingDuration = buff.duration;
        } else {
            this.activeBuffs.push(buff);
        }

        console.log(`Applied buff to ${this.name}: ${buff.name}`);
        logMessage(`${this.name} gains buff: ${buff.name}`);

        // Recalculate stats to apply the buff immediately
        this.calculateStats();
    };

    enemy.calculateStats();

    // Log the enemy appearance
    logMessage(`A ${enemy.name} appears!`);

    updateEnemyStatsDisplay();
}

function updatePlayerStatsDisplay() {
    document.getElementById("player-name").textContent = player.name;
    document.getElementById("player-level").textContent = player.level || 1;
    document.getElementById("player-experience").textContent = player.experience || 0;
    document.getElementById("player-attack-speed").textContent = player.totalStats.attackSpeed.toFixed(2);
    document.getElementById("player-crit-chance").textContent = (player.totalStats.criticalChance * 100).toFixed(2) + "%";
    document.getElementById("player-crit-multiplier").textContent = player.totalStats.criticalMultiplier.toFixed(2);

    // Update HP text only (since the HP bar width is managed by animations)
    const playerHpText = document.getElementById('player-hp-text');
    playerHpText.textContent = `${Math.round(player.currentHealth)} / ${Math.round(player.totalStats.health)}`;

    // Update Energy Shield text only
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
    if (player.activeBuffs) {
        player.activeBuffs.forEach(buff => {
            const li = document.createElement('li');
            li.textContent = `${buff.name} (${(buff.remainingDuration / 1000).toFixed(1)}s)`;
            activeEffectsList.appendChild(li);
        });
    }
}


function updateEnemyStatsDisplay() {
    if (!enemy) {
        initializeEnemyStatsDisplay();
        return;
    }

    document.getElementById("enemy-name").textContent = enemy.name;
    document.getElementById("enemy-attack-speed").textContent = enemy.totalStats.attackSpeed.toFixed(2);
    document.getElementById("enemy-crit-chance").textContent = (enemy.totalStats.criticalChance * 100).toFixed(2) + "%";
    document.getElementById("enemy-crit-multiplier").textContent = enemy.totalStats.criticalMultiplier.toFixed(2);

    // Update HP bar
    const enemyHpBar = document.getElementById('enemy-hp-bar');
    const enemyHpPercentage = (enemy.currentHealth / enemy.totalStats.health) * 100;
    enemyHpBar.style.width = enemyHpPercentage + '%';

    // Update HP text
    const enemyHpText = document.getElementById('enemy-hp-text');
    enemyHpText.textContent = `${Math.round(enemy.currentHealth)} / ${Math.round(enemy.totalStats.health)}`;

    const enemyEsBar = document.getElementById('enemy-es-bar');
    const enemyEsPercentage = (enemy.currentShield / enemy.totalStats.energyShield) * 100 || 0;
    enemyEsBar.style.width = enemyEsPercentage + '%';

    // Update Energy Shield text
    const enemyEsText = document.getElementById('enemy-es-text');
    enemyEsText.textContent = `${Math.round(enemy.currentShield)} / ${Math.round(enemy.totalStats.energyShield)}`;

    // Update damage types
    const damageTypesList = document.getElementById('enemy-damage-types');
    damageTypesList.innerHTML = '';
    for (let type in enemy.totalStats.damageTypes) {
        const li = document.createElement('li');
        li.textContent = `${capitalize(type)}: ${enemy.totalStats.damageTypes[type]}`;
        damageTypesList.appendChild(li);
    }

    // Update defense types
    const defenseTypesList = document.getElementById('enemy-defense-types');
    defenseTypesList.innerHTML = '';
    for (let type in enemy.totalStats.defenseTypes) {
        const li = document.createElement('li');
        li.textContent = `${capitalize(type)}: ${enemy.totalStats.defenseTypes[type]}`;
        defenseTypesList.appendChild(li);
    }

    // Update active effects
    const activeEffectsList = document.getElementById('enemy-active-effects');
    activeEffectsList.innerHTML = '';
    enemy.activeBuffs.forEach(buff => {
        const li = document.createElement('li');
        li.textContent = `${buff.name} (${(buff.remainingDuration / 1000).toFixed(1)}s)`;
        activeEffectsList.appendChild(li);
    });
}

function resetPlayerStats() {
    player.totalStats = JSON.parse(JSON.stringify(player.baseStats));
    player.currentHealth = player.totalStats.health;
    player.currentShield = player.totalStats.energyShield;
    player.statusEffects = [];
    updatePlayerStatsDisplay();
    clearBuffs(player);
}

// Function to flee combat
function fleeCombat() {
    if (isCombatActive) {
        stopCombat('playerFled');
        logMessage("You have fled from combat.");
        currentLocation = null;
    } else {
        logMessage("You are not in combat.");
        // If not in combat, but a countdown is active, cancel it
        if (adventureStartCountdownInterval) {
            clearInterval(adventureStartCountdownInterval);
            adventureStartCountdownInterval = null;
            const timerElement = document.getElementById('next-enemy-timer');
            timerElement.style.display = 'none';
            logMessage("You have canceled the adventure.");
            currentLocation = null;
            displayAdventureLocations();
        }
    }

    // Update the adventure locations display
    displayAdventureLocations();
}



function combatLoop() {
    if (!isCombatActive) return;

    let now = Date.now();
    let deltaTime = (now - lastCombatLoopTime) / 1000; // Convert ms to seconds
    lastCombatLoopTime = now;

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
    const enemyAttackInterval = 3 / enemy.totalStats.attackSpeed; // Base attack time is now 3 seconds
    const enemyProgress = Math.min((enemyAttackTimer / enemyAttackInterval) * 100, 100);
    document.getElementById('enemy-attack-progress-bar').style.width = enemyProgress + '%';

    if (enemyAttackTimer >= enemyAttackInterval) {
        enemyAttack();
        enemyAttackTimer = 0;
    }

    // Process buffs
    processBuffs(player, deltaTime);
    if (enemy.activeBuffs) {
        processBuffs(enemy, deltaTime);
    }

    // Process status effects
    if (player.currentHealth > 0) {
        processStatusEffects(player, deltaTime);
    }
    if (enemy && enemy.currentHealth > 0) {
        processStatusEffects(enemy, deltaTime);
    }

    // Check for combat end
    if (player.currentHealth <= 0) {
        stopCombat('playerDefeated');
    } else if (enemy && enemy.currentHealth <= 0) {
        stopCombat('enemyDefeated');
    }

    updatePlayerStatsDisplay();
    updateEnemyStatsDisplay();
}

function clearBuffs(entity) {
    console.log(`clearBuffs called for ${entity.name} (clearbuffs)`);
    entity.activeBuffs = [];
    console.log(`${entity.name} activeBuffs length after clearing: ${entity.activeBuffs.length} (clearbuffs)`);
    entity.calculateStats();
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

    // Reset attack timers
    playerAttackTimer = 0;
    enemyAttackTimer = 0;
    document.getElementById('player-attack-progress-bar').style.width = '0%';
    document.getElementById('enemy-attack-progress-bar').style.width = '0%';
    document.getElementById('stop-combat').style.display = 'none';

    // Reset player's HP and shield
    player.currentHealth = player.totalStats.health;
    player.currentShield = player.totalStats.energyShield;
    

    const playerHpBar = document.getElementById('player-hp-bar');
    playerHpBar.style.width = '100%';

    const playerEsBar = document.getElementById('player-es-bar');
    playerEsBar.style.width = '100%';

    // Clear buffs for both player and enemy
    console.log("Clearing buffs for player and enemy. (stopCombat)");
    clearBuffs(player);
    if (enemy) {
        clearBuffs(enemy);
    }
    updatePlayerStatsDisplay();

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
            countdown -= 1;
            countdownElement.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                timerElement.style.display = 'none';
            }
        }, 1000);

        combatRestartTimeout = setTimeout(() => {
            startCombat();
        }, countdown * 1000);
    }
}



// Function for player attack
function playerAttack() {
    let totalDamage = calculateDamage(player, enemy);
    applyDamage(enemy, totalDamage, enemy.name);

    // Process attacker's effects with 'onHit' trigger
    processEffects(player, 'onHit', enemy);

    // Process defender's effects with 'whenHit' trigger
    processEffects(enemy, 'whenHit', player);
}

// Function for enemy attack
function enemyAttack() {
    let totalDamage = calculateDamage(enemy, player);
    applyDamage(player, totalDamage, "Player");

    // Process attacker's effects with 'onHit' trigger
    processEffects(enemy, 'onHit', player);

    // Process defender's effects with 'whenHit' trigger
    processEffects(player, 'whenHit', enemy);
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

function processEffects(entity, trigger, target) {
    if (!entity.effects) {
        console.log(`Entity ${entity.name} has no effects.`);
        return;
    }

    console.log(`Processing effects for ${entity.name} with trigger '${trigger}'`);

    entity.effects.forEach(effect => {
        if (effect.trigger === trigger) {
            console.log(`Effect found:`, effect);
            // Check if the effect activates based on chance
            if (Math.random() < effect.chance) {
                console.log(`Effect triggered:`, effect);
                executeEffectAction(effect, entity, target);
            } else {
                console.log(`Effect did not trigger due to chance.`);
            }
        }
    });
}

function processBuffs(entity, deltaTime) {
    let buffsChanged = false;
    for (let i = entity.activeBuffs.length - 1; i >= 0; i--) {
        const buff = entity.activeBuffs[i];
        buff.remainingDuration -= deltaTime * 1000; // Convert deltaTime to milliseconds
        if (buff.remainingDuration <= 0) {
            entity.activeBuffs.splice(i, 1);
            buffsChanged = true;
            logMessage(`${entity.name}'s buff ${buff.name} has expired.`);
        }
    }
    if (buffsChanged) {
        entity.calculateStats();
        if (entity === player) {
            updatePlayerStatsDisplay();
        } else if (entity === enemy) {
            updateEnemyStatsDisplay();
        }
    }
}


function executeEffectAction(effect, source, target) {
    const params = effect.parameters;

    switch (effect.action) {
        case 'dealDamage':
            let damage = params.amount;
            const damageType = params.damageType;
            const ignoreDefense = params.ignoreDefense || false;

            // Adjust damage by source's damage type modifiers
            if (source.totalStats.damageTypeModifiers && source.totalStats.damageTypeModifiers[damageType]) {
                const modifier = source.totalStats.damageTypeModifiers[damageType];
                damage *= modifier; // Modifiers are multiplicative
            }

            // Round the damage to avoid fractional damage
            damage = Math.round(damage);

            applyEffectDamage(target, damage, damageType, ignoreDefense);
            break;

        case 'heal':
            const healAmount = params.amount;
            healEntity(source, healAmount);
            break;

        case 'applyBuff':
            const buffName = params.buffName;
            source.applyBuff(buffName);
            break;

        case 'conditionalRestoreShield':
            const maxShieldThreshold = params.maxShieldThreshold;
            if (source.totalStats.energyShield <= maxShieldThreshold) {
                source.currentShield = source.totalStats.energyShield;
                logMessage(`${source.name}'s energy shield is fully restored!`);
                if (source === player) {
                    updatePlayerStatsDisplay();
                } else if (source === enemy) {
                    updateEnemyStatsDisplay();
                }
            }
            break;

        case 'conditionalRestoreHealth':
            const maxHealthThreshold = params.maxHealthThreshold;
            if (source.totalStats.health <= maxHealthThreshold) {
                source.currentHealth = source.totalStats.health;
                logMessage(`${source.name}'s health is fully restored!`);
                if (source === player) {
                    updatePlayerStatsDisplay();
                } else if (source === enemy) {
                    updateEnemyStatsDisplay();
                }
            }
            break;

        // Add more cases as needed

        default:
            console.warn(`Unknown effect action: ${effect.action}`);
    }
}


function applyEffectDamage(target, amount, damageType, ignoreDefense) {
    let actualDamage = amount;

    if (!ignoreDefense) {
        const defenseStat = matchDamageToDefense(damageType);
        const defenseValue = target.totalStats.defenseTypes[defenseStat] || 0;
        actualDamage = Math.max(0, amount - defenseValue);
    }

    applyDamage(target, actualDamage, target.name, { [damageType]: actualDamage });
}

function healEntity(entity, amount) {
    entity.currentHealth = Math.min(entity.totalStats.health, entity.currentHealth + amount);
    logMessage(`{green} ${entity.name} heals for ${amount} HP.{end}`);
    if (entity === player) {
        updatePlayerStatsDisplay();
    } else if (entity === enemy) {
        updateEnemyStatsDisplay();
    }
}

// Function to process status effects and buffs
function processStatusEffects(entity, deltaTime) {
    // Process status effects (e.g., debuffs)
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
        // Damage calculation as before
    }

    // Round damage to the nearest whole number
    damage = Math.round(damage);

    let totalDamage = damage; // Keep track of total damage before shield absorption

    let shieldAbsorbed = 0;

    if (target.currentShield > 0) {
        shieldAbsorbed = Math.min(target.currentShield, damage);
        target.currentShield -= shieldAbsorbed;
        damage -= shieldAbsorbed;

        // Animate shield bar chunk
        if (shieldAbsorbed > 0) {
            animateShieldBarChunk(target, shieldAbsorbed);
        }

        // Log shield absorption
        logMessage(`${targetName} absorbs ${shieldAbsorbed} damage with their shield.`);
    }

    if (damage > 0) {
        target.currentHealth = Math.max(0, target.currentHealth - damage);

        // Animate HP bar chunk
        animateHpBarChunk(target, damage);

        // Log damage taken
        logMessage(`${targetName} takes {red}${damage} damage.{end}`);
    }

    // Update stats displays
    if (target === enemy) {
        updateEnemyStatsDisplay();
    } else {
        updatePlayerStatsDisplay();
    }

    // Check for defeat
    if (target.currentHealth <= 0) {
        logMessage(`${targetName} has been defeated!`);
        target.statusEffects = [];
        if (target === enemy) {
            dropLoot(enemy);
            gainExperience(enemy.experienceValue || 0);
            updatePlayerStatsDisplay();
            stopCombat('enemyDefeated');
        } else if (target === player) {
            stopCombat('playerDefeated');
        }
    }
}



function animateHpBarChunk(target, damageAmount) {
    let hpBar, hpContainer, totalHp, currentHp;

    if (target === player) {
        hpBar = document.getElementById('player-hp-bar');
        hpContainer = hpBar.parentElement;
        totalHp = player.totalStats.health;
        currentHp = player.currentHealth;
    } else if (target === enemy) {
        hpBar = document.getElementById('enemy-hp-bar');
        hpContainer = hpBar.parentElement;
        totalHp = enemy.totalStats.health;
        currentHp = enemy.currentHealth;
    } else {
        console.error('Unknown target for HP bar animation.');
        return;
    }

    // Get container width in pixels
    const containerWidth = hpContainer.offsetWidth;

    // Get current HP width in pixels
    const currentWidth = hpBar.offsetWidth;

    // Calculate damage width in pixels
    const damageWidth = (damageAmount / totalHp) * containerWidth;

    // Calculate new HP width
    let newWidth = currentWidth - damageWidth;
    if (newWidth < 0) newWidth = 0;

    // Position for the slice (start at the new HP width)
    const slicePosition = newWidth;

    // Create the HP slice
    const slice = document.createElement('div');
    slice.classList.add('hp-slice');
    slice.style.width = `${damageWidth}px`;
    slice.style.left = `${slicePosition}px`; // Position the slice at the new HP level
    hpContainer.appendChild(slice);

    // Update the HP bar width
    hpBar.style.width = `${(currentHp / totalHp) * 100}%`;

    // Create the damage number
    const damageNumber = document.createElement('div');
    damageNumber.classList.add('damage-number');
    damageNumber.textContent = `-${Math.round(damageAmount)}`;
    damageNumber.style.left = `${slicePosition + damageWidth / 2 - 10}px`; // Center above the slice
    damageNumber.style.top = `-25px`; // Position above the HP bar
    hpContainer.appendChild(damageNumber);

    // Remove slice after animation completes
    slice.addEventListener('animationend', () => {
        hpContainer.removeChild(slice);
    });

    // Remove damage number after animation completes
    damageNumber.addEventListener('animationend', () => {
        hpContainer.removeChild(damageNumber);
    });
}

function animateShieldBarChunk(target, shieldDamageAmount) {
    let esBar, esContainer, totalEs, currentEs;

    if (target === player) {
        esBar = document.getElementById('player-es-bar');
        esContainer = esBar.parentElement;
        totalEs = player.totalStats.energyShield;
        currentEs = player.currentShield;
    } else if (target === enemy) {
        esBar = document.getElementById('enemy-es-bar');
        esContainer = esBar.parentElement;
        totalEs = enemy.totalStats.energyShield;
        currentEs = enemy.currentShield;
    } else {
        console.error('Unknown target for energy shield bar animation.');
        return;
    }

    // Get container width in pixels
    const containerWidth = esContainer.offsetWidth;

    // Get current ES width in pixels
    const currentWidth = esBar.offsetWidth;

    // Calculate damage width in pixels
    const damageWidth = (shieldDamageAmount / totalEs) * containerWidth;

    // Calculate new ES width
    let newWidth = currentWidth - damageWidth;
    if (newWidth < 0) newWidth = 0;

    // Position for the slice (start at the new ES width)
    const slicePosition = newWidth;

    // Create the ES slice
    const slice = document.createElement('div');
    slice.classList.add('es-slice');
    slice.style.width = `${damageWidth}px`;
    slice.style.left = `${slicePosition}px`; // Position the slice at the new ES level
    esContainer.appendChild(slice);

    // Update the ES bar width
    esBar.style.width = `${(currentEs / totalEs) * 100}%`;

    // Create the damage number
    const damageNumber = document.createElement('div');
    damageNumber.classList.add('damage-number');
    damageNumber.textContent = `-${Math.round(shieldDamageAmount)}`;
    damageNumber.style.left = `${slicePosition + damageWidth / 2 - 10}px`; // Center above the slice
    damageNumber.style.top = `-25px`; // Position above the shield bar
    esContainer.appendChild(damageNumber);

    // Remove slice after animation completes
    slice.addEventListener('animationend', () => {
        esContainer.removeChild(slice);
    });

    // Remove damage number after animation completes
    damageNumber.addEventListener('animationend', () => {
        esContainer.removeChild(damageNumber);
    });
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

                const lootMessage = `You received: {flashing}${droppedItem.name} x${droppedItem.quantity}{end}`;
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
