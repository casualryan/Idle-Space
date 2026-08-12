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
    let bar = null;
    if (combatant === 'player' || combatant?.isPlayer) {
        bar = document.getElementById('player-attack-progress-bar');
    } else if (combatant && typeof combatant === 'object') {
        const card = [...document.querySelectorAll('.enemy-combat-card')]
            .find(candidate => candidate.dataset.combatId === combatant._combatId);
        bar = card?.querySelector('.enemy-attack-progress-bar') || null;
    }
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
}

function resetAttackProgressBars() {
    setAttackProgressBar('player', 0);
    document.querySelectorAll('.enemy-attack-progress-bar').forEach(bar => { bar.style.width = '0%'; });
}

function hideNextEnemyTimer() {
    const timer = document.getElementById('next-enemy-timer');
    if (timer) timer.style.display = 'none';
}

function getEffectSecondsLeft(effect) {
    if (typeof effect?.remainingDuration === 'number') return effect.remainingDuration > 0 ? Math.ceil(effect.remainingDuration / 1000) : '';
    if (typeof effect?.duration === 'number' && effect.duration > 0 && typeof effect.appliedTime === 'number' && typeof effect.hitsRemaining !== 'number') {
        const seconds = Math.ceil(effect.duration - ((Date.now() - effect.appliedTime) / 1000));
        return seconds > 0 ? seconds : '';
    }
    return '';
}

function renderCombatEffects(container, combatant) {
    if (!container) return;
    const effects = [...(combatant?.activeBuffs || []), ...(combatant?.activeDebuffs || [])];
    const signature = effects.map(effect => `${effect.name}:${effect.stacks || 1}:${getEffectSecondsLeft(effect)}`).join('|');
    if (container.dataset.signature === signature) return;
    container.dataset.signature = signature;
    container.innerHTML = '';
    for (const effect of effects) {
        const icon = document.createElement('span');
        icon.className = 'combat-effect-icon';
        icon.title = `${effect.name || 'Effect'}${effect.description ? `: ${effect.description}` : ''}`;
        const image = document.createElement('img');
        image.src = effect.icon || 'icons/default-icon.png';
        image.alt = '';
        icon.appendChild(image);
        const counter = document.createElement('span');
        counter.textContent = getEffectSecondsLeft(effect) || (Number(effect.stacks) > 1 ? effect.stacks : '');
        icon.appendChild(counter);
        container.appendChild(icon);
    }
}

function updatePlayerStatsDisplay() {
    if (!player) return;
    const name = document.getElementById('player-name');
    if (name) name.textContent = player.name || 'Player';
    updateHPESBars(player, true);
    renderCombatEffects(document.getElementById('player-effects-bar'), player);
}

function updateEnemyStatsDisplay() {
    const grid = document.getElementById('enemy-combat-grid');
    if (!grid) return;
    if (grid.children.length !== 6) {
        grid.innerHTML = '';
        for (let slot = 0; slot < 6; slot++) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'enemy-combat-card empty';
            card.dataset.slotIndex = String(slot);
            card.innerHTML = `
                <span class="enemy-target-state" aria-hidden="true"></span>
                <span class="combat-card-portrait"><img alt=""><span class="combat-card-effects"></span></span>
                <strong class="enemy-card-name">Empty Contact</strong>
                <span class="compact-resource"><span class="compact-resource-label"><span>Integrity</span><span data-resource-text="health">0 / 0</span></span><span class="hp-bar-container"><span class="hp-bar"></span></span></span>
                <span class="compact-resource"><span class="compact-resource-label"><span>Energy Shield</span><span data-resource-text="shield">0 / 0</span></span><span class="es-bar-container"><span class="es-bar"></span></span></span>
                <span class="compact-resource attack-cycle"><span class="compact-resource-label"><span>Attack Time</span></span><span class="progress-container"><span class="progress-bar attack-bar enemy-attack-progress-bar"></span></span></span>
            `;
            card.addEventListener('click', () => {
                const combatId = card.dataset.combatId;
                if (combatId && typeof selectEnemyTarget === 'function') selectEnemyTarget(combatId);
            });
            grid.appendChild(card);
        }
    }

    const activeEnemies = Array.isArray(encounterEnemies) ? encounterEnemies : [];
    for (let slot = 0; slot < 6; slot++) {
        const card = grid.children[slot];
        const candidate = activeEnemies.find(item => Number(item?._slotIndex) === slot) || null;
        if (!candidate) {
            card.className = 'enemy-combat-card empty';
            card.disabled = true;
            card.dataset.combatId = '';
            card.querySelector('.enemy-card-name').textContent = 'Empty Contact';
            card.querySelector('.combat-card-portrait img').removeAttribute('src');
            card.querySelector('.combat-card-portrait img').alt = '';
            card.querySelector('[data-resource-text="health"]').textContent = '0 / 0';
            card.querySelector('[data-resource-text="shield"]').textContent = '0 / 0';
            card.querySelector('.hp-bar').style.width = '0%';
            card.querySelector('.es-bar').style.width = '0%';
            card.querySelector('.enemy-attack-progress-bar').style.width = '0%';
            card.querySelector('.enemy-target-state').textContent = '';
            renderCombatEffects(card.querySelector('.combat-card-effects'), null);
            continue;
        }

        const selected = candidate._combatId === selectedEnemyId;
        const forced = tauntOverride?.enemyId === candidate._combatId && Number(tauntOverride.expiresAt) > Date.now();
        card.className = [
            'enemy-combat-card',
            selected ? 'selected' : '',
            forced ? 'taunting' : '',
            candidate.currentHealth <= 0 ? 'defeated' : '',
            candidate.isEmpowered ? 'empowered' : ''
        ].filter(Boolean).join(' ');
        card.disabled = candidate.currentHealth <= 0;
        card.dataset.combatId = candidate._combatId;
        card.title = selected
            ? `${candidate.name} is your selected target.`
            : `Target ${candidate.name}`;
        card.querySelector('.enemy-card-name').textContent = candidate.name;
        const portrait = card.querySelector('.combat-card-portrait img');
        if (portrait.getAttribute('src') !== candidate.portrait) portrait.src = candidate.portrait || 'icons/default-icon.png';
        portrait.alt = `${candidate.name} portrait`;
        card.querySelector('.enemy-target-state').textContent = forced ? 'TAUNTING' : (selected ? 'TARGET' : '');
        if (candidate.currentHealth <= 0) card.querySelector('.enemy-attack-progress-bar').style.width = '0%';
        renderCombatEffects(card.querySelector('.combat-card-effects'), candidate);
        updateHPESBars(candidate, false);
    }
}

// Update the HP and ES bar display and formatting
function getCombatResourceElements(entity, isPlayer) {
    if (isPlayer) {
        return {
            hpBar: document.getElementById('player-hp-bar'),
            hpText: document.getElementById('player-hp-text'),
            esBar: document.getElementById('player-es-bar'),
            esText: document.getElementById('player-es-text')
        };
    }
    const card = [...document.querySelectorAll('.enemy-combat-card')]
        .find(candidate => candidate.dataset.combatId === entity?._combatId);
    return {
        hpBar: card?.querySelector('.hp-bar') || null,
        hpText: card?.querySelector('[data-resource-text="health"]') || null,
        esBar: card?.querySelector('.es-bar') || null,
        esText: card?.querySelector('[data-resource-text="shield"]') || null
    };
}

function updateHPESBars(entity, isPlayer) {
    if (!entity) return;
    const currentHealth = Math.max(0, Math.round(entity.currentHealth || 0));
    const totalHealth = Math.max(1, Math.round((entity.totalStats?.health) || 100));
    const currentShield = Math.max(0, Math.round(entity.currentShield || 0));
    const totalShield = Math.max(0, Math.round((entity.totalStats?.energyShield) || 0));
    const { hpBar, hpText, esBar, esText } = getCombatResourceElements(entity, isPlayer);
    if (hpBar) {
        const hpPercent = Math.min(100, Math.max(0, (currentHealth / totalHealth) * 100)) || 0;
        hpBar.style.width = `${hpPercent}%`;
        if (hpPercent < 25) {
            hpBar.style.background = 'linear-gradient(90deg, #ff5959, #ff8080)';
        } else if (hpPercent < 50) {
            hpBar.style.background = 'linear-gradient(90deg, #ffaa5e, #ffc179)';
        } else {
            hpBar.style.background = 'linear-gradient(90deg, #48bf91, #64dfdf)';
        }
    }
    if (hpText) hpText.textContent = `${currentHealth} / ${totalHealth}`;
    if (esBar) {
        const esPercent = totalShield > 0 ? Math.min(100, Math.max(0, (currentShield / totalShield) * 100)) : 0;
        esBar.style.width = `${esPercent}%`;
        esBar.style.background = 'linear-gradient(90deg, #5465ff, #788bff)';
    }
    if (esText) esText.textContent = `${currentShield} / ${totalShield}`;
}

function addToCombatLog(message, color = null, isBold = false) {
    let html = message || '';

    // Only modify plain text, not inside existing HTML tags
    const applyToTextOnly = (input, replacer) => input.split(/(<[^>]+>)/g).map(seg => seg.startsWith('<') ? seg : replacer(seg)).join('');
    const escapeRegExp = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    const playerName = (player && player.name) ? player.name : 'Player';
    const enemyNames = (Array.isArray(encounterEnemies) ? encounterEnemies : [])
        .map(candidate => candidate?.name)
        .filter(Boolean);

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
    html = applyToTextOnly(html, txt => {
        enemyNames.sort((a, b) => b.length - a.length).forEach(enemyName => {
            txt = txt.replace(new RegExp(escapeRegExp(enemyName), 'g'), `<span style=\"color:#ff7f7f; font-weight:bold; text-shadow:0 0 4px #ff7f7f55;\">${enemyName}</span>`);
        });
        return txt;
    });

    if (color) html = `<span style=\"color: ${color};\">${html}</span>`;
    if (isBold) html = `<strong>${html}</strong>`;

    logMessage(html);
}
// Expose the function globally so it can be accessed from other scripts like debuffs.js
window.addToCombatLog = addToCombatLog;

function clearLog() {
    const logElement = document.getElementById("log-messages");
    if (logElement) logElement.innerHTML = "";
}

function initializeEnemyStatsDisplay() {
    updateEnemyStatsDisplay();
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

function animateHpBarChunk(target, damageAmount, isCritical = false, isDebuff = false) {
    const hpBar = getCombatResourceElements(target, target === player).hpBar;
    if (!hpBar) return;
    const hpContainer = hpBar.parentElement;
    const totalHp = Math.max(1, Number(target.totalStats?.health) || 1);
    const currentHp = Math.max(0, Number(target.currentHealth) || 0);

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
    if (isCritical) {
        damageNumber.classList.add('dmg-crit');
        dmgText1 += '!';
    } else if (isDebuff) {
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

function animateShieldBarChunk(target, shieldDamageAmount, isCritical = false, isDebuff = false) {
    const esBar = getCombatResourceElements(target, target === player).esBar;
    if (!esBar) return;
    const esContainer = esBar.parentElement;
    const totalEs = Math.max(1, Number(target.totalStats?.energyShield) || 1);
    const currentEs = Math.max(0, Number(target.currentShield) || 0);

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
    if (isCritical) {
        damageNumber.classList.add('dmg-crit');
        dmgText2 += '!';
    } else if (isDebuff) {
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


function setCombatDrawerOpen(drawerId, open) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) return;
    drawer.classList.toggle('open', Boolean(open));
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    const toggleId = drawerId === 'delve-bag-drawer' ? 'delve-bag-toggle' : 'combat-log-toggle';
    const toggle = document.getElementById(toggleId);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeCombatDrawers() {
    setCombatDrawerOpen('delve-bag-drawer', false);
    setCombatDrawerOpen('combat-log-drawer', false);
}

function setDelveCombatUIActive(active) {
    const stage = document.getElementById('delve-combat-stage');
    const locations = document.getElementById('adventure-locations');
    const heading = document.getElementById('delve-locations-heading');
    if (stage) {
        stage.classList.toggle('hidden', !active);
        stage.setAttribute('aria-hidden', active ? 'false' : 'true');
    }
    if (locations) locations.classList.toggle('hidden', Boolean(active));
    if (heading) heading.classList.toggle('hidden', Boolean(active));
    if (!active) closeCombatDrawers();
}

// Initialize the closed combat-log and Delve Bag drawers.
function initializeCombatLogPopout() {
    const bindings = [
        ['delve-bag-toggle', 'delve-bag-drawer'],
        ['combat-log-toggle', 'combat-log-drawer']
    ];
    for (const [toggleId, drawerId] of bindings) {
        const toggle = document.getElementById(toggleId);
        toggle?.addEventListener('click', () => {
            const drawer = document.getElementById(drawerId);
            const open = !drawer?.classList.contains('open');
            closeCombatDrawers();
            setCombatDrawerOpen(drawerId, open);
        });
    }
    document.querySelectorAll('[data-close-combat-drawer]').forEach(button => {
        button.addEventListener('click', () => setCombatDrawerOpen(button.dataset.closeCombatDrawer, false));
    });
    closeCombatDrawers();
}

window.setDelveCombatUIActive = setDelveCombatUIActive;
