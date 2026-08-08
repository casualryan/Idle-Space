// Combat dashboard rendering, log output, effects display, and animations.

// ============================================================================
// 6. UI & DISPLAY
// ============================================================================

function setFleeControlState({ visible, enabled = true } = {}) {
    const button = document.getElementById('stop-combat');
    if (!button) return;
    if (typeof visible === 'boolean') button.style.display = visible ? 'block' : 'none';
    button.disabled = !enabled;
}

function setAttackProgressBar(combatant, percent) {
    const bar = document.getElementById(`${combatant}-attack-progress-bar`);
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
}

function resetAttackProgressBars() {
    setAttackProgressBar('player', 0);
    setAttackProgressBar('enemy', 0);
}

function hideNextEnemyTimer() {
    const timer = document.getElementById('next-enemy-timer');
    if (timer) timer.style.display = 'none';
}

// Update the player stats display function to use the new HP/ES function
function updatePlayerStatsDisplay() {
    // Basic stats
    document.getElementById("player-name").textContent = player.name;
    document.getElementById("player-level").textContent = player.level || 1;

    // NEW: Show XP until next level with percentage
    const xpElement = document.getElementById('player-experience');
    if (xpElement) {
        const currentLevel = player.level;
        const currentXP = player.experience;
        const xpNeededForNext = getXPForNextLevel(currentLevel);
        const ratio = Math.min(currentXP / xpNeededForNext, 1);
        const percent = (ratio * 100).toFixed(1);

        if (currentLevel >= MAX_PLAYER_LEVEL) {
            xpElement.innerHTML = `<span style="color: #00ffcc; text-shadow: 0 0 5px rgba(0, 255, 204, 0.5);">Maximum Level</span>`;
        } else {
            xpElement.innerHTML = `<span style="color: #7fdbff;">${currentXP} / ${xpNeededForNext}</span> <span style="color: #00ffcc;">(${percent}%)</span>`;
        }
    }

    // Update HP and ES bars
    updateHPESBars(player, true);

    // Calculate total DPS (sum of all damage types * attack speed)
    let totalDamage = 0;
    for (let type in player.totalStats.damageTypes) {
        let baseDamage = player.totalStats.damageTypes[type];

        // Apply damage type modifier if available
        if (player.totalStats.damageTypeModifiers && player.totalStats.damageTypeModifiers[type]) {
            baseDamage *= player.totalStats.damageTypeModifiers[type];
        }

        totalDamage += baseDamage;
    }
    const totalDPS = totalDamage * player.totalStats.attackSpeed;

    // Create DPS display element if it doesn't exist
    let dpsElement = document.getElementById('player-total-dps');
    if (!dpsElement) {
        dpsElement = document.createElement('div');
        dpsElement.id = 'player-total-dps';
        dpsElement.style.margin = '10px 0';
        dpsElement.style.padding = '8px';
        dpsElement.style.borderRadius = '4px';
        dpsElement.style.background = 'linear-gradient(90deg, rgba(0, 40, 70, 0.7), rgba(0, 60, 100, 0.7))';
        dpsElement.style.boxShadow = '0 0 10px rgba(0, 255, 204, 0.3)';
        dpsElement.style.borderLeft = '3px solid #00ffcc';

        // Find the right place to insert it - after attack progress bar
        const progressBarContainer = document.querySelector('#player-stats .progress-container');
        if (progressBarContainer && progressBarContainer.nextSibling) {
            progressBarContainer.parentNode.insertBefore(dpsElement, progressBarContainer.nextSibling);
        }
    }

    // Update DPS content with flashy styling
    dpsElement.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 3px; color: #e0f2ff;">Total DPS:</div>
        <div style="font-size: 130%; color: #00ffcc; text-shadow: 0 0 8px rgba(0, 255, 204, 0.7);">
            ${totalDPS.toFixed(1)}
        </div>
    `;

    // Enhanced stat displays with sci-fi styling
    document.getElementById("player-attack-speed").innerHTML = `<span style="color: #ffd166; text-shadow: 0 0 3px rgba(255, 209, 102, 0.5);">${player.totalStats.attackSpeed.toFixed(2)}</span>`;
    document.getElementById("player-crit-chance").innerHTML = `<span style="color: #ff6b6b; text-shadow: 0 0 3px rgba(255, 107, 107, 0.5);">${(player.totalStats.criticalChance * 100).toFixed(2)}%</span>`;
    document.getElementById("player-crit-multiplier").innerHTML = `<span style="color: #ff6b6b; text-shadow: 0 0 3px rgba(255, 107, 107, 0.5);">${player.totalStats.criticalMultiplier.toFixed(2)}x</span>`;
    document.getElementById("player-precision").innerHTML = `<span style="color: #64dfdf;">${player.totalStats.precision || 0}</span>`;
    document.getElementById("player-deflection").innerHTML = `<span style="color: #64dfdf;">${player.totalStats.deflection || 0}</span>`;
    document.getElementById("player-health-regen").innerHTML = `<span style="color: #48bf91;">${player.totalStats.healthRegen.toFixed(2) || 0}</span>`;

    // New stats - Efficiency (ensure they're numbers)
    const armorEff = Number(player.totalStats.armorEfficiency || 0);
    const weaponEff = Number(player.totalStats.weaponEfficiency || 0);
    const bionicEff = Number(player.totalStats.bionicEfficiency || 0);
    const bionicSync = Number(player.totalStats.bionicSync || 0);
    const comboAttack = Number(player.totalStats.comboAttack || 0);
    const comboEffectiveness = Number(player.totalStats.comboEffectiveness || 0);
    const additionalCombo = Number(player.totalStats.additionalComboAttacks || 0);

    document.getElementById("player-armor-efficiency").innerHTML = `<span style="color: #a8e6cf;">${armorEff.toFixed(1)}</span>`;
    document.getElementById("player-weapon-efficiency").innerHTML = `<span style="color: #ffd3a5;">${weaponEff.toFixed(1)}</span>`;
    document.getElementById("player-bionic-efficiency").innerHTML = `<span style="color: #c5a3ff;">${bionicEff.toFixed(1)}</span>`;

    // Bionic Enhancement
    document.getElementById("player-bionic-sync").innerHTML = `<span style="color: #b19cd9;">${bionicSync.toFixed(1)}</span>`;

    // Combo System
    document.getElementById("player-combo-attack").innerHTML = `<span style="color: #ff9999;">${comboAttack.toFixed(1)}</span>`;
    document.getElementById("player-combo-effectiveness").innerHTML = `<span style="color: #ffb366;">${comboEffectiveness.toFixed(1)}</span>`;
    document.getElementById("player-additional-combo-attacks").innerHTML = `<span style="color: #ff6b6b;">${Math.floor(additionalCombo)}</span>`;

    // Mastery System
    const kineticMastery = Number(player.totalStats.kineticMastery || 0);
    const slashingMastery = Number(player.totalStats.slashingMastery || 0);
    document.getElementById("player-kinetic-mastery").innerHTML = `<span style="color: #ffa500;">${kineticMastery}</span>`;
    document.getElementById("player-slashing-mastery").innerHTML = `<span style="color: #dc143c;">${slashingMastery}</span>`;

    // Combat Mechanics
    const severedLimbChance = Number(player.totalStats.severedLimbChance || 0);
    const maxSeveredLimbs = Number(player.totalStats.maxSeveredLimbs || 1);
    document.getElementById("player-severed-limb-chance").innerHTML = `<span style="color: #8b0000;">${severedLimbChance.toFixed(1)}</span>`;
    document.getElementById("player-max-severed-limbs").innerHTML = `<span style="color: #8b0000;">${maxSeveredLimbs}</span>`;

    // Stylish damage types list
    const damageTypesList = document.getElementById('player-damage-types');
    damageTypesList.innerHTML = '';
    let hasDamageTypes = false;

    for (let type in player.totalStats.damageTypes) {
        hasDamageTypes = true;
        const li = document.createElement('li');
        li.style.padding = '4px 8px';
        li.style.margin = '3px 0';
        li.style.background = 'rgba(0, 15, 40, 0.5)';
        li.style.borderRadius = '3px';
        li.style.borderLeft = '2px solid #ff6b6b';

        // Use capitalize from stats.js if available
        let capType = typeof capitalize === 'function' ? capitalize(type) : type;
        li.innerHTML = `<span style="color: #ff6b6b; font-weight: bold;">${capType}:</span> <span style="color: #ffffff;">${player.totalStats.damageTypes[type]}</span>`;
        damageTypesList.appendChild(li);
    }

    if (!hasDamageTypes) {
        const li = document.createElement('li');
        li.style.padding = '4px 8px';
        li.style.color = '#888';
        li.style.fontStyle = 'italic';
        li.textContent = 'No damage types';
        damageTypesList.appendChild(li);
    }

    // Stylish damage modifiers
    const damageTypeModifiersList = document.getElementById('player-damage-type-modifiers');
    damageTypeModifiersList.innerHTML = '';
    let hasModifiers = false;

    for (let type in player.totalStats.damageTypeModifiers) {
        hasModifiers = true;
        const li = document.createElement('div');
        li.style.padding = '4px 8px';
        li.style.margin = '3px 0';
        li.style.background = 'rgba(0, 15, 40, 0.5)';
        li.style.borderRadius = '3px';
        li.style.borderLeft = '2px solid #ffd166';

        let modifier = (player.totalStats.damageTypeModifiers[type] - 1) * 100;
        // Use capitalize from stats.js if available
        let capType = typeof capitalize === 'function' ? capitalize(type) : type;
        li.innerHTML = `<span style="color: #ffd166; font-weight: bold;">${capType} Damage:</span> <span style="color: #ffffff;">+${modifier.toFixed(2)}%</span>`;
        damageTypeModifiersList.appendChild(li);
    }

    if (!hasModifiers) {
        const li = document.createElement('div');
        li.style.padding = '4px 8px';
        li.style.color = '#888';
        li.style.fontStyle = 'italic';
        li.textContent = 'No damage modifiers';
        damageTypeModifiersList.appendChild(li);
    }

    // Update Defense Types display
    const defenseTypesList = document.getElementById('player-defense-types');
    defenseTypesList.innerHTML = '';
    let hasDefenseTypes = false;

    // Check if defenseTypes object exists
    if (player.totalStats.defenseTypes) {
        // Add the three resistance types with proper descriptions
        const defenseMapping = {
            'physicalResistance': 'Physical Resistance',
            'elementalResistance': 'Elemental Resistance',
            'chemicalResistance': 'Chemical Resistance'
        };

        for (let type in defenseMapping) {
            const value = player.totalStats.defenseTypes[type] || 0;
            hasDefenseTypes = true;
            const li = document.createElement('li');
            li.innerHTML = `${defenseMapping[type]}: <span style="color: #ffffff;">${value}</span>`;
            defenseTypesList.appendChild(li);
        }
    }

    if (!hasDefenseTypes) {
        const li = document.createElement('li');
        li.textContent = 'None';
        defenseTypesList.appendChild(li);
    }

    // Effects bar (icons with countdown overlays)
    const playerEffectsBar = document.getElementById('player-effects-bar');
    if (playerEffectsBar) {
        const computeSecsLeft = (effect) => {
            // Buffs: remainingDuration in ms
            if (typeof effect.remainingDuration === 'number') {
                const ms = effect.remainingDuration;
                if (ms <= 0) return '';
                return Math.ceil(ms / 1000);
            }
            // Debuffs: duration in seconds + appliedTime timestamp
            if (typeof effect.duration === 'number' && effect.duration > 0 && typeof effect.appliedTime === 'number') {
                // Skip non-time-based hit counters
                if (typeof effect.hitsRemaining === 'number') return '';
                const secs = Math.ceil(effect.duration - ((Date.now() - effect.appliedTime) / 1000));
                return secs > 0 ? secs : '';
            }
            return '';
        };
        playerEffectsBar.innerHTML = '';
        const buffsArr = Array.isArray(player.activeBuffs) ? player.activeBuffs : [];
        const debuffsArr = Array.isArray(player.activeDebuffs) ? player.activeDebuffs : [];
        const effects = [...buffsArr, ...debuffsArr];
        effects.forEach(effect => {
            const el = document.createElement('div');
            el.className = 'effect-icon';
            const img = document.createElement('img');
            img.src = effect.icon || 'icons/default-icon.png';
            img.alt = effect.name || 'Effect';
            el.appendChild(img);
            const t = document.createElement('div');
            t.className = 'timer';
            const secs = computeSecsLeft(effect);
            t.textContent = secs;
            el.title = `${effect.name || 'Effect'}${effect.description ? (': ' + effect.description) : ''}`;
            el.appendChild(t);
            // Stack badge for stackable effects (show at 1+)
            if (typeof effect.stacks !== 'number') {
                effect.stacks = 1;
            }
            if (typeof effect.stacks === 'number' && effect.stacks >= 1) {
                const badge = document.createElement('div');
                badge.className = 'stack-badge';
                badge.textContent = effect.stacks;
                el.appendChild(badge);
            }
            playerEffectsBar.appendChild(el);
        });
    }

    // Debuffs UI moved to effect icons; no separate list update
}

function updateEnemyStatsDisplay() {
    if (!enemy) {
        console.log("updateEnemyStatsDisplay called but no enemy is defined.");
        return;
    }

    // Make enemy name visible
    document.getElementById("enemy-name").textContent = enemy.name || "Unknown";

    // Update HP and ES bars
    updateHPESBars(enemy, false);

    // Calculate total DPS (sum of all damage types * attack speed)
    let totalDamage = 0;
    for (let type in enemy.totalStats.damageTypes) {
        let baseDamage = enemy.totalStats.damageTypes[type];

        // Apply damage type modifier if available
        if (enemy.totalStats.damageTypeModifiers && enemy.totalStats.damageTypeModifiers[type]) {
            baseDamage *= enemy.totalStats.damageTypeModifiers[type];
        }

        totalDamage += baseDamage;
    }
    const totalDPS = totalDamage * enemy.totalStats.attackSpeed;

    // Create DPS display element if it doesn't exist
    let dpsElement = document.getElementById('enemy-total-dps');
    if (!dpsElement) {
        dpsElement = document.createElement('div');
        dpsElement.id = 'enemy-total-dps';
        dpsElement.style.margin = '10px 0';
        dpsElement.style.padding = '8px';
        dpsElement.style.borderRadius = '4px';
        dpsElement.style.background = 'linear-gradient(90deg, rgba(70, 20, 20, 0.7), rgba(100, 30, 30, 0.7))';
        dpsElement.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.3)';
        dpsElement.style.borderLeft = '3px solid #ff6b6b';

        // Find the right place to insert it - after attack progress bar
        const progressBarContainer = document.querySelector('#enemy-stats .progress-container');
        if (progressBarContainer && progressBarContainer.nextSibling) {
            progressBarContainer.parentNode.insertBefore(dpsElement, progressBarContainer.nextSibling);
        }
    }

    // Update DPS content with flashy styling
    dpsElement.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 3px; color: #e0f2ff;">Total DPS:</div>
        <div style="font-size: 130%; color: #ff6b6b; text-shadow: 0 0 8px rgba(255, 107, 107, 0.7);">
            ${totalDPS.toFixed(1)}
        </div>
    `;

    // Enhanced stat displays with sci-fi styling
    document.getElementById("enemy-attack-speed").innerHTML = `<span style="color: #ffd166; text-shadow: 0 0 3px rgba(255, 209, 102, 0.5);">${enemy.totalStats.attackSpeed.toFixed(2)}</span>`;
    document.getElementById("enemy-crit-chance").innerHTML = `<span style="color: #ff6b6b; text-shadow: 0 0 3px rgba(255, 107, 107, 0.5);">${(enemy.totalStats.criticalChance * 100).toFixed(2)}%</span>`;
    document.getElementById("enemy-crit-multiplier").innerHTML = `<span style="color: #ff6b6b; text-shadow: 0 0 3px rgba(255, 107, 107, 0.5);">${enemy.totalStats.criticalMultiplier.toFixed(2)}x</span>`;

    // Stylish damage types list
    const damageTypesList = document.getElementById('enemy-damage-types');
    damageTypesList.innerHTML = '';
    let hasDamageTypes = false;

    for (let type in enemy.totalStats.damageTypes) {
        hasDamageTypes = true;
        const li = document.createElement('li');
        li.style.padding = '4px 8px';
        li.style.margin = '3px 0';
        li.style.background = 'rgba(0, 15, 40, 0.5)';
        li.style.borderRadius = '3px';
        li.style.borderLeft = '2px solid #ff6b6b';

        // Use capitalize from stats.js if available
        let capType = typeof capitalize === 'function' ? capitalize(type) : type;
        li.innerHTML = `<span style="color: #ff6b6b; font-weight: bold;">${capType}:</span> <span style="color: #ffffff;">${enemy.totalStats.damageTypes[type]}</span>`;
        damageTypesList.appendChild(li);
    }

    if (!hasDamageTypes) {
        const li = document.createElement('li');
        li.style.padding = '4px 8px';
        li.style.color = '#888';
        li.style.fontStyle = 'italic';
        li.textContent = 'No damage types';
        damageTypesList.appendChild(li);
    }

    // Update Defense Types display
    const defenseTypesList = document.getElementById('enemy-defense-types');
    defenseTypesList.innerHTML = '';
    let hasDefenseTypes = false;

    // Check if enemy and its defense types exist
    if (enemy && enemy.totalStats && enemy.totalStats.defenseTypes) {
        // Add the three resistance types with proper descriptions
        const defenseMapping = {
            'physicalResistance': 'Physical Resistance',
            'elementalResistance': 'Elemental Resistance',
            'chemicalResistance': 'Chemical Resistance'
        };

        for (let type in defenseMapping) {
            const value = enemy.totalStats.defenseTypes[type] || 0;
            if (value > 0) {
                hasDefenseTypes = true;
                const li = document.createElement('li');
                li.innerHTML = `${defenseMapping[type]}: <span style="color: #ffffff;">${value}</span>`;
                defenseTypesList.appendChild(li);
            }
        }
    }

    if (!hasDefenseTypes) {
        const li = document.createElement('li');
        li.textContent = 'None';
        defenseTypesList.appendChild(li);
    }

    // Effects bar (icons with countdown overlays)
    const enemyEffectsBar = document.getElementById('enemy-effects-bar');
    if (enemyEffectsBar) {
        const computeSecsLeftE = (effect) => {
            if (typeof effect.remainingDuration === 'number') {
                const ms = effect.remainingDuration;
                if (ms <= 0) return '';
                return Math.ceil(ms / 1000);
            }
            if (typeof effect.duration === 'number' && effect.duration > 0 && typeof effect.appliedTime === 'number') {
                if (typeof effect.hitsRemaining === 'number') return '';
                const secs = Math.ceil(effect.duration - ((Date.now() - effect.appliedTime) / 1000));
                return secs > 0 ? secs : '';
            }
            return '';
        };
        enemyEffectsBar.innerHTML = '';
        const buffsArrE = Array.isArray(enemy.activeBuffs) ? enemy.activeBuffs : [];
        const debuffsArrE = Array.isArray(enemy.activeDebuffs) ? enemy.activeDebuffs : [];
        const effectsE = [...buffsArrE, ...debuffsArrE];
        effectsE.forEach(effect => {
            const el = document.createElement('div');
            el.className = 'effect-icon';
            const img = document.createElement('img');
            img.src = effect.icon || 'icons/default-icon.png';
            img.alt = effect.name || 'Effect';
            el.appendChild(img);
            const t = document.createElement('div');
            t.className = 'timer';
            const secs = computeSecsLeftE(effect);
            t.textContent = secs;
            el.title = `${effect.name || 'Effect'}${effect.description ? (': ' + effect.description) : ''}`;
            el.appendChild(t);
            // Normalize stacks to ensure proper counting on stacked re-applies
            if (typeof effect.stacks !== 'number') {
                effect.stacks = 1;
            }
            if (typeof effect.stacks === 'number' && effect.stacks >= 1) {
                const badge = document.createElement('div');
                badge.className = 'stack-badge';
                badge.textContent = effect.stacks;
                el.appendChild(badge);
            }
            enemyEffectsBar.appendChild(el);
        });
    }

    // Debuffs UI moved to effect icons; no separate list update
}

// Update the HP and ES bar display and formatting
function updateHPESBars(entity, isPlayer) {
    // First, make sure entity exists
    if (!entity) {
        console.warn(`updateHPESBars called with ${isPlayer ? 'player' : 'enemy'} entity that is null or undefined`);
        return;
    }

    // Get entity display values with safe defaults
    const currentHealth = Math.max(0, Math.round(entity.currentHealth || 0));
    const totalHealth = Math.max(1, Math.round((entity.totalStats?.health) || 100));
    const currentShield = Math.max(0, Math.round(entity.currentShield || 0));
    const totalShield = Math.max(0, Math.round((entity.totalStats?.energyShield) || 0));

    // Set prefix for DOM element IDs
    const prefix = isPlayer ? 'player' : 'enemy';

    // Update HP bar width and color
    const hpBar = document.getElementById(`${prefix}-hp-bar`);
    if (hpBar) {
        // Calculate HP percentage (capped between 0-100%)
        const hpPercent = Math.min(100, Math.max(0, (currentHealth / totalHealth) * 100)) || 0;

        // Update bar width
        hpBar.style.width = `${hpPercent}%`;

        // Update bar color based on health percentage
        if (hpPercent < 25) {
            hpBar.style.background = 'linear-gradient(90deg, #ff5959, #ff8080)';
        } else if (hpPercent < 50) {
            hpBar.style.background = 'linear-gradient(90deg, #ffaa5e, #ffc179)';
        } else {
            hpBar.style.background = 'linear-gradient(90deg, #48bf91, #64dfdf)';
        }
    }

    // Update HP text display
    const hpText = document.getElementById(`${prefix}-hp-text`);
    if (hpText) {
        hpText.textContent = `${currentHealth} / ${totalHealth}`;
    }

    // Update ES bar width
    const esBar = document.getElementById(`${prefix}-es-bar`);
    if (esBar) {
        // Calculate ES percentage (with safety checks)
        const esPercent = totalShield > 0 ? Math.min(100, Math.max(0, (currentShield / totalShield) * 100)) : 0;

        // Update bar width
        esBar.style.width = `${esPercent}%`;

        // Update bar color/effect
        esBar.style.background = 'linear-gradient(90deg, #5465ff, #788bff)';
    }

    // Update ES text display
    const esText = document.getElementById(`${prefix}-es-text`);
    if (esText) {
        esText.textContent = `${currentShield} / ${totalShield}`;
    }
}

function addToCombatLog(message, color = null, isBold = false) {
    let html = message || '';

    // Only modify plain text, not inside existing HTML tags
    const applyToTextOnly = (input, replacer) => input.split(/(<[^>]+>)/g).map(seg => seg.startsWith('<') ? seg : replacer(seg)).join('');
    const escapeRegExp = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    const playerName = (player && player.name) ? player.name : 'Player';
    const enemyName = (enemy && enemy.name) ? enemy.name : 'Enemy';

    // Keyword highlights
    const keywordHighlights = [
        { word: 'CRITICAL', style: 'font-weight: bold; color: #ffff00; text-shadow: 0 0 5px rgba(255, 255, 0, 0.7);' },
        { word: 'critical', style: 'font-weight: bold; color: #ffff00; text-shadow: 0 0 3px rgba(255, 255, 0, 0.5);' },
        { word: 'combo attack', style: 'font-weight: bold; color: #ff8800; text-shadow: 0 0 3px rgba(255, 136, 0, 0.7);' },
        { word: 'Combo hit', style: 'font-weight: bold; color: #ffaa44;' },
        { word: 'triggers', style: 'font-weight: bold; color: #66ffcc;' },
        { word: 'heals', style: 'font-weight: bold; color: #66ff88;' },
        { word: 'dies', style: 'font-weight: bold; color: #ff4444; text-shadow: 0 0 3px rgba(255, 68, 68, 0.7);' },
        { word: 'defeated', style: 'font-weight: bold; color: #ff4444; text-shadow: 0 0 3px rgba(255, 68, 68, 0.7);' }
    ];

    html = applyToTextOnly(html, txt => {
        keywordHighlights.forEach(h => {
            const rx = new RegExp(`\\b${h.word}\\b`, 'gi');
            txt = txt.replace(rx, (m) => `<span style="${h.style}">${m}</span>`);
        });
        return txt;
    });

    // Damage types
    const dmgColors = { kinetic:'#b8c1c1', slashing:'#c8a2c8', pyro:'#ff6b6b', electric:'#74c0fc', cryo:'#7dd3fc', corrosive:'#2eb82e', radiation:'#66ff99', chemical:'#2eb82e', physical:'#aab3b3' };
    html = applyToTextOnly(html, txt => {
        Object.keys(dmgColors).forEach(dt => {
            const rx = new RegExp(`\\b${dt}\\b`, 'gi');
            txt = txt.replace(rx, (m)=>`<span style=\"color:${dmgColors[dt]}; font-weight:bold;\">${m}</span>`);
        });
        return txt;
    });

    // Numbers (near damage/HP/ES/shield context)
    html = applyToTextOnly(html, txt => txt.replace(/(\\b\\d+\\b)(?=\\s*(damage|HP|ES|shield)\\b)?/gi, '<span style=\"color:#ffd166; font-weight:bold;\">$1</span>'));

    // Names
    html = applyToTextOnly(html, txt => txt.replace(new RegExp(escapeRegExp(playerName), 'g'), `<span style=\"color:#7df9ff; font-weight:bold; text-shadow:0 0 4px #7df9ff55;\">${playerName}</span>`));
    html = applyToTextOnly(html, txt => txt.replace(new RegExp(escapeRegExp(enemyName), 'g'), `<span style=\"color:#ff7f7f; font-weight:bold; text-shadow:0 0 4px #ff7f7f55;\">${enemyName}</span>`));

    if (color) html = `<span style=\"color: ${color};\">${html}</span>`;
    if (isBold) html = `<strong>${html}</strong>`;

    logMessage(html);
}
// Expose the function globally so it can be accessed from other scripts like debuffs.js
window.addToCombatLog = addToCombatLog;

function clearLog() {
    const logElement = document.getElementById("log-messages");
    logElement.innerHTML = "";
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
    const dps = document.getElementById('enemy-total-dps');
    if (dps) dps.innerHTML = '<div>Total DPS</div><div>—</div>';

    // Clear damage and defense types (guard if elements exist)
    const ed = document.getElementById('enemy-damage-types'); if (ed) ed.innerHTML = '';
    const ef = document.getElementById('enemy-defense-types'); if (ef) ef.innerHTML = '';
    const ea = document.getElementById('enemy-active-effects'); if (ea) ea.innerHTML = '';
}

// Function to update the player debuffs UI
function updatePlayerDebuffsUI() {
    const debuffsContainer = document.getElementById('player-debuffs');
    if (!debuffsContainer) return;

    // Clear existing debuffs
    debuffsContainer.innerHTML = '';

    // If player has no debuffs, exit
    if (!player || !player.activeDebuffs || player.activeDebuffs.length === 0) {
        debuffsContainer.style.display = 'none';
        return;
    }

    // Show the container
    debuffsContainer.style.display = 'flex';

    // Add each debuff icon
    player.activeDebuffs.forEach(debuff => {
        if (!debuff) return;

        const debuffElement = document.createElement('div');
        debuffElement.className = 'debuff-icon';

        // Set background color based on debuff type
        let bgColor = '#ff6b6b'; // Default red for harmful debuffs
        if (debuff.type === 'crowd_control') {
            bgColor = '#9775fa'; // Purple for CC
        } else if (debuff.type === 'damage_over_time') {
            bgColor = '#ff9966'; // Orange for DoT
        }

        debuffElement.style.backgroundColor = bgColor;

        // Add debuff name
        const nameSpan = document.createElement('span');
        // Use capitalize from stats.js if available
        let capName = typeof capitalize === 'function' ? capitalize(debuff.name) : debuff.name;
        nameSpan.textContent = capName.substring(0, 1); // Just the first letter for the icon
        debuffElement.appendChild(nameSpan);

        // Add tooltip with debuff info
        debuffElement.title = `${capName}: ${debuff.description || ''}`;

        // Add to container
        debuffsContainer.appendChild(debuffElement);
    });
}

// Function to update the enemy debuffs UI
function updateEnemyDebuffsUI() {
    const debuffsContainer = document.getElementById('enemy-debuffs');
    if (!debuffsContainer) return;

    // Clear existing debuffs
    debuffsContainer.innerHTML = '';

    // If enemy has no debuffs, exit
    if (!enemy || !enemy.activeDebuffs || enemy.activeDebuffs.length === 0) {
        debuffsContainer.style.display = 'none';
        return;
    }

    // Show the container
    debuffsContainer.style.display = 'flex';

    // Add each debuff icon
    enemy.activeDebuffs.forEach(debuff => {
        if (!debuff) return;

        const debuffElement = document.createElement('div');
        debuffElement.className = 'debuff-icon';

        // Set background color based on debuff type
        let bgColor = '#ff6b6b'; // Default red for harmful debuffs
        if (debuff.type === 'crowd_control') {
            bgColor = '#9775fa'; // Purple for CC
        } else if (debuff.type === 'damage_over_time') {
            bgColor = '#ff9966'; // Orange for DoT
        }

        debuffElement.style.backgroundColor = bgColor;

        // Add debuff name
        const nameSpan = document.createElement('span');
        // Use capitalize from stats.js if available
        let capName = typeof capitalize === 'function' ? capitalize(debuff.name) : debuff.name;
        nameSpan.textContent = capName.substring(0, 1); // Just the first letter for the icon
        debuffElement.appendChild(nameSpan);

        // Add tooltip with debuff info
        debuffElement.title = `${capName}: ${debuff.description || ''}`;

        // Add to container
        debuffsContainer.appendChild(debuffElement);
    });
}

// Make these functions available globally
window.updatePlayerDebuffsUI = updatePlayerDebuffsUI;
window.updateEnemyDebuffsUI = updateEnemyDebuffsUI;

function displayLootPopup(message) {
    // Remove any formatting codes like {flashing} and {end}
    // This regex removes any text enclosed in braces { ... }
    message = message.replace(/\{[^}]+\}/g, '');

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

function createShieldPulseAnimation() {
    // Check if the animation already exists
    if (!document.getElementById('shield-pulse-animation')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'shield-pulse-animation';
        styleElement.textContent = `
            @keyframes shieldPulse {
                0% { opacity: 0.8; }
                50% { opacity: 1; }
                100% { opacity: 0.8; }
            }
        `;
        document.head.appendChild(styleElement);
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
    let dmgText1 = `-${Math.round(damageAmount)}`;
    if (window.__lastIsCrit === true) {
        damageNumber.classList.add('dmg-crit');
        dmgText1 += '!';
    } else if (window.__lastIsDebuff === true) {
        damageNumber.classList.add('dmg-debuff');
    }
    damageNumber.textContent = dmgText1;
    const jitterX1 = (Math.random() * 34 - 17) | 0; // ~40% more: -17..17px
    damageNumber.style.left = `${slicePosition + damageWidth / 2 - 10 + jitterX1}px`; // Center with larger random offset
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
    let dmgText2 = `-${Math.round(shieldDamageAmount)}`;
    if (window.__lastIsCrit === true) {
        damageNumber.classList.add('dmg-crit');
        dmgText2 += '!';
    } else if (window.__lastIsDebuff === true) {
        damageNumber.classList.add('dmg-debuff');
    }
    damageNumber.textContent = dmgText2;
    const jitterX2 = (Math.random() * 34 - 17) | 0; // ~40% more: -17..17px
    damageNumber.style.left = `${slicePosition + damageWidth / 2 - 10 + jitterX2}px`; // Center with larger random offset
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


// Set up the detachable combat log without coupling bootstrap code to the DOM.
function initializeCombatLogPopout() {
    const btn = document.getElementById('combat-log-popout');
    if (btn) {
        let pop = null;
        // Preserve original logger to mirror into popout
        const originalLogMessage = window.logMessage;
        btn.addEventListener('click', () => {
            if (pop) { // Nest back into main log
                if (pop.parentNode) pop.parentNode.removeChild(pop); pop = null;
                const src = document.getElementById('log-messages');
                if (src) { src.innerHTML = ''; src.setAttribute('data-nested', 'false'); }
                btn.textContent = 'Pop Out';
                window.logMessage = originalLogMessage;
                return;
            }
            const src = document.getElementById('log-messages');
            if (!src) return;
            pop = document.createElement('div');
            pop.className = 'combat-log-popout';
            const baseCss = 'position:fixed; z-index:100001; background:rgba(0,15,35,0.95); border:1px solid #00ffcc; border-radius:6px; box-shadow:0 0 12px rgba(0,255,204,0.3); display:flex; flex-direction:column;';
            const saved = JSON.parse(localStorage.getItem('combatLogPopout') || 'null');
            const posCss = saved ? `top:${saved.top}px; left:${saved.left}px; width:${saved.width}px; height:${saved.height}px;` : 'top:80px; right:40px; width:380px; height:240px;';
            pop.style.cssText = baseCss + posCss;
            const header = document.createElement('div');
            header.style.cssText = 'cursor:move; padding:6px 8px; color:#00ffcc; background:linear-gradient(to right,#002244,#001122); border-bottom:1px solid rgba(0,255,204,0.3); display:flex; justify-content:space-between; align-items:center;';
            header.textContent = 'Combat Log';
            const close = document.createElement('button');
            close.textContent = '×';
            close.style.cssText = 'background:none; border:none; color:#00ffcc; font-size:16px; cursor:pointer;';
            close.onclick = () => {
                if (pop && pop.parentNode) pop.parentNode.removeChild(pop); pop = null;
                const src2 = document.getElementById('log-messages');
                if (src2) { src2.innerHTML = ''; src2.setAttribute('data-nested', 'false'); }
                btn.textContent = 'Pop Out';
                window.logMessage = originalLogMessage;
            };
            header.appendChild(close);
            pop.appendChild(header);
            const body = document.createElement('div');
            body.style.cssText = 'flex:1; overflow:auto; padding:8px; color:#e0f2ff; font-family: "Orbitron", sans-serif;';
            body.innerHTML = src.innerHTML;
            pop.appendChild(body);
            document.body.appendChild(pop);

            // Persist initial position/size immediately so a quick nest/re-pop restores
            try {
                const r0 = pop.getBoundingClientRect();
                localStorage.setItem('combatLogPopout', JSON.stringify({ top: r0.top, left: r0.left, width: r0.width, height: r0.height }));
            } catch (_) {}

            // Dragging to reposition; persist to localStorage
            let drag = { active:false, offsetX:0, offsetY:0 };
            header.addEventListener('mousedown', (e) => {
                drag.active = true;
                const rect = pop.getBoundingClientRect();
                drag.offsetX = e.clientX - rect.left;
                drag.offsetY = e.clientY - rect.top;
                e.preventDefault();
            });
            document.addEventListener('mousemove', (e) => {
                if (!drag.active || !pop) return;
                const left = Math.max(0, Math.min(window.innerWidth - pop.offsetWidth, e.clientX - drag.offsetX));
                const top = Math.max(0, Math.min(window.innerHeight - pop.offsetHeight, e.clientY - drag.offsetY));
                pop.style.left = left + 'px';
                pop.style.top = top + 'px';
                pop.style.right = '';
            });
            document.addEventListener('mouseup', () => {
                if (!pop) return;
                drag.active = false;
                const rect = pop.getBoundingClientRect();
                localStorage.setItem('combatLogPopout', JSON.stringify({ top: rect.top, left: rect.left, width: rect.width, height: rect.height }));
            });

            // Mirror subsequent log messages ONLY to the popout (suppress nested log updates)
            window.logMessage = function(msg) {
                if (!pop) { if (typeof originalLogMessage === 'function') originalLogMessage(msg); return; }
                const div = document.createElement('div');
                try {
                    if (typeof window.processColorCodes === 'function') {
                        div.innerHTML = window.processColorCodes(msg);
                    } else {
                        div.innerHTML = msg;
                    }
                } catch (_) { div.textContent = msg; }
                body.appendChild(div);
                body.scrollTop = body.scrollHeight;
                const rect = pop.getBoundingClientRect();
                localStorage.setItem('combatLogPopout', JSON.stringify({ top: rect.top, left: rect.left, width: rect.width, height: rect.height }));
            };

            // Mark nested state and change button
            src.innerHTML = '<div style="color:#99ccff; opacity:0.85; font-style:italic;">Currently popped out!</div>';
            src.setAttribute('data-nested', 'true');
            btn.textContent = 'Nest Log';

            // Resize handle
            const resize = document.createElement('div');
            resize.style.cssText = 'position:absolute; right:0; bottom:0; width:14px; height:14px; cursor:nwse-resize; background:rgba(0,255,204,0.25)';
            pop.appendChild(resize);
            let resizing=false, sw=0, sh=0, rx=0, ry=0;
            resize.addEventListener('mousedown', (e)=>{ resizing=true; sw=pop.offsetWidth; sh=pop.offsetHeight; rx=e.clientX; ry=e.clientY; e.stopPropagation(); e.preventDefault();});
            window.addEventListener('mousemove', (e)=>{ if(!resizing) return; const dw=e.clientX-rx, dh=e.clientY-ry; pop.style.width=(sw+dw)+'px'; pop.style.height=(sh+dh)+'px';});
            window.addEventListener('mouseup', ()=> { if(resizing){ resizing=false; const rect = pop.getBoundingClientRect(); localStorage.setItem('combatLogPopout', JSON.stringify({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })); }});
        });
    }
}
