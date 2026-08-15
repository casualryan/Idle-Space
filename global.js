window.currentScreen = '';

console.log('global.js loaded');
console.log('window.inventory at the start:', window.inventory);

const STARTING_FEED = 1000;
let playerFeed = STARTING_FEED;

function updateFeed(amount) {
    playerFeed = Math.max(0, playerFeed + Math.floor(Number(amount) || 0));
    renderGlobalStatusBanner();
    return playerFeed;
}

// Compatibility for legacy extensions that still call the old reward helper.
function updateCurrency(amount) {
    return updateFeed(amount);
}

// Add this near the top of the file with other constants
const MAX_PLAYER_LEVEL = 50;
const saveProfiles = window.coreboundSaveProfiles;
const saveCoordinator = window.coreboundSaveCoordinator || null;
let saveRuntimeReady = false;
let lastSaveFailure = null;
let mainMenuView = 'root';
let exitAutosaveAttempted = false;

// Helper function to cleanly remove and reapply all passive bonuses from gear
function resetGearPassiveBonuses() {
    player.gearPassiveBonuses = {};

    const addBonuses = item => {
        if (!item?.passiveBonuses) return;
        Object.entries(item.passiveBonuses).forEach(([reference, rawValue]) => {
            const node = typeof getPassiveNode === 'function' ? getPassiveNode(reference) : null;
            const value = Number(rawValue);
            if (!node?.gearScalable || !Number.isFinite(value) || value <= 0) return;
            player.gearPassiveBonuses[node.id] = (player.gearPassiveBonuses[node.id] || 0) + value;
        });
    };

    ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves']
        .forEach(slot => addBonuses(player.equipment[slot]));
    (player.equipment.bionicSlots || []).forEach(addBonuses);
}

// applyItemModifiers function moved to stats.js

// Helper function to capitalize the first letter moved to stats.js
// function capitalize(str) {
//     return str.charAt(0).toUpperCase() + str.slice(1);
// }

// Updated playerBaseStats (removed inherent attackSpeed)
const playerBaseStats = {
    level: 1,
    maxHealth: 100,
    maxEnergyShield: 0,
    healthRegen: 0, // Health regenerated per second
    attackSpeed: 1,
    criticalChance: 0.00,
    criticalMultiplier: 1,
    precision: 0,
    deflection: 0,
    // Efficiency stats - increase proc effect chances
    armorEfficiency: 0,     // Affects armor slot proc effects
    weaponEfficiency: 0,    // Affects weapon and offhand proc effects
    bionicEfficiency: 0,    // Affects bionic slot proc effects
    // Bionic enhancement
    bionicSync: 0,          // Increases stats gained from bionics
    // Combo attack system
    comboAttack: 0,         // % chance to strike additional time after initial hit
    comboEffectiveness: 0,  // Increases damage dealt by combo attacks (base 20%)
    additionalComboAttacks: 0, // Number of additional combo hits beyond the first
    propagationTargets: 0, // Additional targets beyond each weapon family's intrinsic target
    // Mastery system - increases damage for specific damage types
    kineticMastery: 0,      // Increases kinetic damage
    slashingMastery: 0,     // Increases slashing damage
    // Severed limb system
    severedLimbChance: 0,   // % chance to sever limbs on critical strikes
    maxSeveredLimbs: 1,     // Maximum limbs that can be severed on opponent
    maxSeepingWoundStacks: 5,
    damageTypes: {
        
    },
    // Resistance types (percentage reduction)
    defenseTypes: {
        physicalResistance: 0,   // Counters Physical damage (kinetic, slashing)
        elementalResistance: 0,  // Counters Elemental damage (pyro, cryo, electric)
        chemicalResistance: 0    // Counters Chemical damage (corrosive, radiation)
    }
};

let player = {
    isPlayer: true,
    name: 'Player',
    level: 1,
    experience: 0,
    currentHealth: null,
    currentShield: null,
    baseStats: JSON.parse(JSON.stringify(playerBaseStats)),
    totalStats: {},
    effects: [],
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
        }
    },
    activeBuffs: [],
    // This property holds the cumulative passive bonus (e.g., 0.30 for +30%)
    passiveAttackSpeedBonus: 0,
    passiveAllocations: {},
    passivePoints: 2,
    passiveTreeVersion: PASSIVE_TREE_VERSION,
    gearPassiveBonuses: {},
    passiveBonuses: createEmptyPassiveBonuses(),
    // Combat style tree system
    equippedSkillId: window.DEFAULT_COMBAT_STYLE_ID || 'balancedStyle',
    unlockedSkillIds: (window.combatStyles || []).map(style => style.id),
    combatStyleAllocations: {},
    combatStyleVersion: window.COMBAT_STYLE_VERSION || 2,
    // Legacy skill fields kept inert for backward compatibility with old saves.
    skillPoints: 0,
    skillModAllocations: {},
    // Inventory management
    maxInventorySlots: 30,

    applyBuff: function (buffName) {
        const buffDef = buffs.find(b => b.name === buffName);
        if (!buffDef) {
            console.error(`Buff '${buffName}' not found.`);
            return;
        }
        const buff = JSON.parse(JSON.stringify(buffDef));
        buff.remainingDuration = buff.duration;
        const existingBuff = this.activeBuffs.find(b => b.name === buff.name);
        if (existingBuff) {
            existingBuff.remainingDuration = buff.duration;
        } else {
            this.activeBuffs.push(buff);
        }
        updatePlayerStatsDisplay();
        console.log(`Applied buff: ${buff.name}`);
        logMessage(`${this.name} gains buff: ${buff.name}`);
        this.calculateStats();
    },

    // calculateStats implementation moved to stats.js
    calculateStats: function() {
        // Call the centralized function from stats.js
        // It will modify this.totalStats, this.currentHealth, this.currentShield directly
        if (typeof calculatePlayerStats === 'function') {
            calculatePlayerStats(this);
        } else {
            console.error("calculatePlayerStats function not found! Make sure stats.js is loaded.");
        }
        // Return the calculated stats (optional, as the function modifies 'this')
        return this.totalStats;
    },
};

window.player = player;




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
    if (player.level >= MAX_PLAYER_LEVEL) {
        player.level = MAX_PLAYER_LEVEL;
        player.experience = 0;
        updatePlayerStatsDisplay();
        return;
    }
    player.experience += amount;
    logMessage(`You gained ${amount} experience points.`);
    updatePlayerStatsDisplay(); // Update the experience display
    checkLevelUp(); // Check if the player leveled up
}

function checkLevelUp() {
    // Don't level up if already at max level
    if (player.level >= MAX_PLAYER_LEVEL) {
        player.level = MAX_PLAYER_LEVEL;
        player.experience = 0;
        return;
    }
    
    const xpForNextLevel = getXPForNextLevel(player.level);
    
    if (player.experience >= xpForNextLevel) {
        player.level++;
        player.experience -= xpForNextLevel;
        player.passivePoints = (player.passivePoints || 0) + 2;
        
        // Play level up sound
        if (window.playSound) {
            playSound('LEVEL_UP', 0.5);
        }
        
        logMessage(`Congratulations! You've reached level ${player.level} and gained 2 passive points!`);
        
        // If we've reached max level, cap experience and show a message
        if (player.level >= MAX_PLAYER_LEVEL) {
            player.experience = 0;
            logMessage(`You've reached the maximum level of ${MAX_PLAYER_LEVEL}!`);
        }
        
        // Increase base stats upon leveling up (optional)
        updatePlayerStatsDisplay(); // Update the level display
        
        // Check for more level ups
        checkLevelUp();
    }
}


function getXPForNextLevel(level) {
    // If level is 1, next level requires 100 XP
    if (level <= 1) {
        return 100;
    }
    // Recursively get XP for (level - 1), then apply the formula
    const prevReq = getXPForNextLevel(level - 1);
    return Math.round((prevReq + 15) * 1.15);
}

function sanitizeSaveSlotIndex(slotIndex) {
    return saveProfiles ? saveProfiles.sanitizeSlot(slotIndex) : 1;
}

function getAutosaveTargetSlot() {
    return saveProfiles.getActiveSlot();
}

function setAutosaveTargetSlot(slotIndex) {
    return saveProfiles.setActiveSlot(slotIndex);
}

function ownsSaveWriterLease() {
    return !saveCoordinator || saveCoordinator.isWriter();
}

function setSaveFailure(error, isAutoSave) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown save error');
    const signature = `${isAutoSave ? 'auto' : 'manual'}:${message}`;
    const shouldLog = lastSaveFailure?.signature !== signature;
    lastSaveFailure = { message, isAutoSave: Boolean(isAutoSave), signature, failedAt: Date.now() };
    if (shouldLog) {
        logMessage(`${isAutoSave ? 'Autosave' : 'Save'} failed: ${message}`);
    }
    renderSaveProtectionState();
}

function clearSaveFailure() {
    if (!lastSaveFailure) return;
    lastSaveFailure = null;
    renderSaveProtectionState();
}

function renderSaveProtectionState() {
    const ownsLease = ownsSaveWriterLease();
    const overlay = document.getElementById('save-owner-overlay');
    if (overlay) overlay.hidden = ownsLease;

    const errorAlert = document.getElementById('save-error-alert');
    if (errorAlert) {
        errorAlert.hidden = !lastSaveFailure || !ownsLease;
        if (lastSaveFailure && ownsLease) {
            errorAlert.textContent = `Saving has stopped: ${lastSaveFailure.message}. Your current progress is not safely stored.`;
        }
    }

    const status = document.getElementById('save-system-status');
    if (!status) return;
    status.classList.remove('is-healthy', 'is-error', 'is-blocked');
    if (!ownsLease) {
        status.classList.add('is-blocked');
        status.textContent = 'Read-only duplicate tab · Saving is blocked';
    } else if (lastSaveFailure) {
        status.classList.add('is-error');
        status.textContent = `Saving stopped · ${lastSaveFailure.message}`;
    } else if (!saveRuntimeReady) {
        status.classList.add('is-healthy');
        status.textContent = 'No profile is active · Autosave is paused';
    } else {
        status.classList.add('is-healthy');
        status.textContent = `Protected autosave active · Profile ${getAutosaveTargetSlot()}`;
    }
}

function takeSaveControlAndReload() {
    if (!saveCoordinator?.takeControl()) {
        setSaveFailure(new Error('Could not acquire save ownership.'), false);
        return { ok: false, reason: 'ownership_failed' };
    }

    if (saveRuntimeReady) {
        const targetSlot = getAutosaveTargetSlot();
        const result = loadGame(targetSlot, 'autosave');
        if (!result.ok) {
            saveRuntimeReady = false;
            showMainMenu('load');
            setMainMenuStatus(`Profile ${targetSlot}'s autosave could not be loaded. Its manual save is still available.`, 'error');
            return result;
        }
    }

    clearSaveFailure();
    renderSaveProtectionState();
    renderMainMenu(mainMenuView);
    return { ok: true };
}

function formatFeedValue(value) {
    try {
        return Number(value || 0).toLocaleString();
    } catch (_) {
        return '0';
    }
}

const SETTINGS_PANEL_LABELS = {
    main: 'Settings',
    save: 'Save & Session',
    gameplay: 'Gameplay',
    keybinds: 'Keybinds',
    dev: 'Dev Tools',
};

let settingsNavWired = false;

function openSettingsMenu() {
    const menu = document.getElementById('settings-menu');
    if (!menu) return;
    menu.classList.add('is-open');
    showSettingsPanel('main');
}

function closeSettingsMenu() {
    const menu = document.getElementById('settings-menu');
    if (!menu) return;
    menu.classList.remove('is-open');
}

function showSettingsPanel(panelId) {
    const safeId = panelId === 'main' ? 'main' : panelId;
    document.querySelectorAll('.settings-panel').forEach((panel) => {
        const isTarget = panel.id === `settings-panel-${safeId}`;
        panel.hidden = !isTarget;
    });
    const backBtn = document.getElementById('settings-back');
    const title = document.getElementById('settings-title');
    if (backBtn) backBtn.hidden = safeId === 'main';
    if (title) title.textContent = SETTINGS_PANEL_LABELS[safeId] || 'Settings';
    if (safeId === 'save') renderSaveProtectionState();
}

function wireSettingsNavigation() {
    if (settingsNavWired) return;
    settingsNavWired = true;
    document.querySelectorAll('[data-settings-panel]').forEach((btn) => {
        btn.addEventListener('click', () => {
            showSettingsPanel(btn.getAttribute('data-settings-panel'));
        });
    });
    const backBtn = document.getElementById('settings-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => showSettingsPanel('main'));
    }
}

function formatSnapshotPreview(preview) {
    if (preview.state === 'corrupt') return 'Unreadable snapshot';
    if (preview.state === 'empty') return 'No snapshot';
    const dateLabel = preview.savedAt ? new Date(preview.savedAt).toLocaleString() : 'Unknown time';
    return `Level ${preview.level} · ${formatFeedValue(preview.feed)} Feed · ${dateLabel}`;
}

function setMainMenuStatus(message = '', tone = '') {
    const status = document.getElementById('main-menu-status');
    if (!status) return;
    status.textContent = message;
    status.className = `main-menu-status${tone ? ` is-${tone}` : ''}`;
    status.hidden = !message;
}

function renderMainMenu(view = mainMenuView) {
    mainMenuView = ['root', 'new', 'load'].includes(view) ? view : 'root';
    const rootPanel = document.getElementById('main-menu-root');
    const slotPanel = document.getElementById('main-menu-slots');
    const list = document.getElementById('main-menu-slot-list');
    const title = document.getElementById('main-menu-slot-title');
    const description = document.getElementById('main-menu-slot-description');
    const continueButton = document.getElementById('main-menu-continue');
    if (!rootPanel || !slotPanel || !list) return;

    const continueChoice = saveProfiles.getContinueChoice();
    if (continueButton) {
        continueButton.disabled = !continueChoice || !ownsSaveWriterLease();
        continueButton.dataset.slot = continueChoice?.slot || '';
        continueButton.dataset.kind = continueChoice?.kind || '';
        const detail = continueChoice ? `Profile ${continueChoice.slot} · ${formatSnapshotPreview(continueChoice)}` : 'No playable profile found';
        const detailElement = continueButton.querySelector('.main-menu-button-detail');
        if (detailElement) detailElement.textContent = detail;
    }

    rootPanel.hidden = mainMenuView !== 'root';
    slotPanel.hidden = mainMenuView === 'root';
    if (mainMenuView === 'root') return;

    const profiles = saveProfiles.listProfiles();
    const canWrite = ownsSaveWriterLease();
    if (mainMenuView === 'new') {
        title.textContent = 'New Game';
        description.textContent = profiles.every(profile => profile.occupied)
            ? 'All profiles are full. Delete one before creating a new game.'
            : 'Choose an empty profile. Existing profiles must be deleted before reuse.';
        list.innerHTML = profiles.map(profile => {
            const best = profile.autosave.state !== 'empty' ? profile.autosave : profile.manual;
            const summary = profile.occupied ? formatSnapshotPreview(best) : 'Empty profile';
            return `
                <article class="profile-slot-row ${profile.occupied ? 'is-occupied' : 'is-empty'}">
                    <div class="profile-slot-copy">
                        <strong>Profile ${profile.slot}</strong>
                        <span>${summary}</span>
                    </div>
                    ${profile.occupied
                        ? `<button type="button" class="profile-delete-button" data-menu-action="delete" data-slot="${profile.slot}" ${canWrite ? '' : 'disabled'}>Delete</button>`
                        : `<button type="button" class="profile-primary-button" data-menu-action="new" data-slot="${profile.slot}" ${canWrite ? '' : 'disabled'}>Start New Game</button>`}
                </article>`;
        }).join('');
        return;
    }

    title.textContent = 'Load Game';
    description.textContent = 'Choose a profile, then load its autosave or its independent manual save.';
    list.innerHTML = profiles.map(profile => {
        const snapshotButton = (preview, label) => {
            const disabled = preview.state !== 'ok' || !ownsSaveWriterLease();
            return `
                <button type="button" class="snapshot-load-button ${preview.state === 'corrupt' ? 'is-corrupt' : ''}"
                    data-menu-action="load" data-slot="${profile.slot}" data-kind="${preview.kind}" ${disabled ? 'disabled' : ''}>
                    <strong>${label}</strong>
                    <span>${formatSnapshotPreview(preview)}</span>
                </button>`;
        };
        return `
            <article class="profile-load-row">
                <header>
                    <strong>Profile ${profile.slot}</strong>
                    ${profile.occupied ? `<button type="button" class="profile-delete-button" data-menu-action="delete" data-slot="${profile.slot}" ${canWrite ? '' : 'disabled'}>Delete Profile</button>` : ''}
                </header>
                <div class="profile-snapshot-grid">
                    ${snapshotButton(profile.autosave, 'Autosave')}
                    ${snapshotButton(profile.manual, 'Manual Save')}
                </div>
            </article>`;
    }).join('');
}

function showMainMenu(view = 'root') {
    saveRuntimeReady = false;
    const overlay = document.getElementById('main-menu-overlay');
    if (overlay) overlay.hidden = false;
    document.body.classList.add('at-main-menu');
    closeSettingsMenu();
    setMainMenuStatus('');
    renderMainMenu(view);
    renderSaveProtectionState();
}

function hideMainMenu() {
    const overlay = document.getElementById('main-menu-overlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('at-main-menu');
}

function showManualSaveConfirmation(slotIndex) {
    const toast = document.getElementById('manual-save-toast');
    if (!toast) return;
    toast.textContent = `Manual save complete · Profile ${sanitizeSaveSlotIndex(slotIndex)}`;
    toast.hidden = false;
    toast.classList.remove('is-visible');
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(showManualSaveConfirmation.timer);
    showManualSaveConfirmation.timer = setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => { toast.hidden = true; }, 180);
    }, 2400);
}

function buildGameStateSnapshot() {
    const managerState = (window.activityManager && typeof window.activityManager.getState === 'function')
        ? window.activityManager.getState()
        : { active: false, currentActivity: null };
    return {
        player: {
            baseStats: player.baseStats,
            currentHealth: player.currentHealth,
            currentShield: player.currentShield,
            experience: player.experience,
            level: player.level,
            gatheringSkills: player.gatheringSkills,
            activeBuffs: player.activeBuffs,
            equipment: player.equipment,
            feed: playerFeed,
            maxInventorySlots: player.maxInventorySlots,
            passives: {
                allocations: player.passiveAllocations,
                points: player.passivePoints,
                treeVersion: player.passiveTreeVersion
            },
            combatStyles: {
                equipped: player.equippedSkillId,
                unlocked: player.unlockedSkillIds,
                allocations: player.combatStyleAllocations || {},
                version: player.combatStyleVersion || window.COMBAT_STYLE_VERSION || 2
            }
        },
        inventory: window.inventory,
        materialInventory: normalizeMaterialStorage(window.materialInventory),
        coreInventory: normalizeCoreInventory(window.coreInventory),
        cacheInventory: normalizeCacheInventory(window.cacheInventory),
        pendingCacheResolution: window.pendingCacheResolution,
        componentDropCounts: window.componentDropCounts || {},
        isDelveInProgress: (typeof isDelveInProgress !== 'undefined') ? isDelveInProgress : false,
        currentDelveLocation: (typeof currentDelveLocation !== 'undefined') ? currentDelveLocation : null,
        currentMonsterIndex: (typeof currentMonsterIndex !== 'undefined') ? currentMonsterIndex : 0,
        delveBag: (typeof delveBag !== 'undefined') ? delveBag : { items: [], feed: 0 },
        delveClaimCache: (typeof delveClaimCache !== 'undefined') ? delveClaimCache : { items: [], feed: 0 },
        currentRunMode: (typeof currentRunMode !== 'undefined') ? currentRunMode : null,
        operationState: (typeof operationState !== 'undefined') ? operationState : null,
        operationBoard: (typeof operationBoard !== 'undefined') ? operationBoard : { version: 2, generation: 0, playerLevel: player.level, offers: [] },
        completedOperationSeeds: (typeof completedOperationSeeds !== 'undefined') ? completedOperationSeeds : [],
        completedOperationCount: (typeof completedOperationCount !== 'undefined') ? completedOperationCount : 0,
        completedDelveLocations: (typeof completedDelveLocations !== 'undefined') ? completedDelveLocations : {},
        activityState: {
            active: Boolean(managerState.active),
            currentActivity: managerState.currentActivity || null
        },
        fabricationState: (typeof window.getFabricationState === 'function')
            ? window.getFabricationState()
            : [],
        meta: {
            savedAt: Date.now(),
            version: COREBOUND_SAVE_VERSION
        }
    };
}

// Save game function
function saveGame(isAutoSave = false, slotIndex = null) {
    const targetSlot = slotIndex == null ? getAutosaveTargetSlot() : sanitizeSaveSlotIndex(slotIndex);
    const saveKind = isAutoSave ? 'autosave' : 'manual';
    if (!saveRuntimeReady) {
        return { ok: false, reason: 'no_active_profile', slot: targetSlot, kind: saveKind };
    }
    if (!ownsSaveWriterLease()) {
        const error = new Error('Another Corebound tab owns saving.');
        if (!isAutoSave) setSaveFailure(error, false);
        return { ok: false, reason: 'duplicate_tab', slot: targetSlot, kind: saveKind };
    }

    try {
        const gameState = buildGameStateSnapshot();
        assertGameStateSnapshot(gameState, {
            knownItemNames: new Set((window.items || []).map(item => item.name))
        });

        const previousSnapshot = saveProfiles.readSnapshot(targetSlot, saveKind);
        const previousRaw = previousSnapshot.raw;
        if (previousRaw && saveCoordinator) {
            try {
                saveCoordinator.backupCurrentSave(targetSlot, previousRaw, {
                    force: !isAutoSave,
                    saveKind
                });
            } catch (backupError) {
                console.warn(`Could not update ${saveKind} recovery saves for profile ${targetSlot}:`, backupError);
            }
        }
        saveProfiles.writeSnapshot(targetSlot, saveKind, JSON.stringify(gameState));
        console.log(`${isAutoSave ? 'Autosave' : 'Manual save'} completed for profile ${targetSlot}.`);
        clearSaveFailure();
        
        // Play save sound unless it's an auto-save
        if (window.playSound && !isAutoSave) {
            playSound('SAVE_GAME', 0.3);
        }
        
        // Only show the message if it's a manual save
        return { ok: true, slot: targetSlot, kind: saveKind, savedAt: gameState.meta.savedAt };
    } catch (e) {
        console.error('Error saving game:', e);
        setSaveFailure(e, isAutoSave);
        return { ok: false, reason: 'save_error', slot: targetSlot, kind: saveKind, error: e };
    }
}

function loadGame(slotIndex = null, saveKind = 'autosave') {
    const targetSlot = slotIndex == null ? getAutosaveTargetSlot() : sanitizeSaveSlotIndex(slotIndex);
    const kind = saveProfiles.sanitizeKind(saveKind);
    const snapshot = saveProfiles.readSnapshot(targetSlot, kind);
    const savedState = snapshot.raw;

    if (!savedState) {
        console.log(`No ${kind} found in profile ${targetSlot}.`);
        const event = new CustomEvent('gameLoaded', { detail: { slot: targetSlot, kind, loaded: false } });
        window.dispatchEvent(event);
        return { ok: false, reason: 'empty_slot' };
    }

    try {
        const parsedState = JSON.parse(savedState);
        const migration = migrateGameStateSnapshot(parsedState);
        const gameState = migration.state;
        const saveValidation = assertGameStateSnapshot(gameState, {
            knownItemNames: new Set((window.items || []).map(item => item.name))
        });
        saveValidation.warnings.forEach(warning => console.warn(`Save warning: ${warning}`));

        // Stop any active systems before loading
        if (typeof stopCombat === 'function' && (isCombatActive || isDelveInProgress)) {
            stopCombat('gameLoad');
        }
        if (window.activityManager && typeof window.activityManager.clearActivityOnLoad === 'function') {
            window.activityManager.clearActivityOnLoad();
        } else if (isGathering && typeof stopGatheringActivity === 'function') {
            stopGatheringActivity();
        }
        if (typeof window.clearFabricationsOnLoad === 'function') {
            window.clearFabricationsOnLoad();
        }

        const savedPlayer = gameState.player;
        const restoredBaseStats = savedPlayer.baseStats || JSON.parse(JSON.stringify(playerBaseStats));
        const restoredEquipment = restoreEquipment(savedPlayer.equipment);
        const restoredInventory = Array.isArray(gameState.inventory)
            ? gameState.inventory.map(savedItem => restoreItem(savedItem))
            : [];

        const defaultUnlockedStyles = (window.combatStyles || []).map(style => style.id);
        const defaultStyleId = window.DEFAULT_COMBAT_STYLE_ID || defaultUnlockedStyles[0] || 'balancedStyle';
        const legacySkillIds = new Set(window.LEGACY_SKILL_IDS || []);

        let restoredEquippedStyle = defaultStyleId;
        let restoredUnlockedStyles = defaultUnlockedStyles;
        let restoredAllocations = {};
        let restoredCombatStyleVersion = window.COMBAT_STYLE_VERSION || 2;

        if (savedPlayer.combatStyles && typeof savedPlayer.combatStyles === 'object') {
            restoredEquippedStyle = savedPlayer.combatStyles.equipped || defaultStyleId;
            restoredUnlockedStyles = Array.isArray(savedPlayer.combatStyles.unlocked)
                ? savedPlayer.combatStyles.unlocked
                : defaultUnlockedStyles;
            restoredAllocations = savedPlayer.combatStyles.allocations || {};
            restoredCombatStyleVersion = savedPlayer.combatStyles.version || restoredCombatStyleVersion;
        } else if (savedPlayer.skills && typeof savedPlayer.skills === 'object') {
            // Legacy saves are tolerated; deprecated IDs are remapped to default style.
            const legacyEquipped = savedPlayer.skills.equipped;
            restoredEquippedStyle = legacySkillIds.has(legacyEquipped) ? defaultStyleId : (legacyEquipped || defaultStyleId);
            restoredUnlockedStyles = defaultUnlockedStyles;
            restoredAllocations = {};
        }

        // Apply restored data only after successful parsing of all pieces.
        player.baseStats = restoredBaseStats;

        player.currentHealth = savedPlayer.currentHealth;
        player.currentShield = savedPlayer.currentShield;
        player.level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(Number(savedPlayer.level) || 1)));
        player.experience = player.level >= MAX_PLAYER_LEVEL
            ? 0
            : Math.max(0, Number(savedPlayer.experience) || 0);
        player.gatheringSkills = savedPlayer.gatheringSkills || player.gatheringSkills;
        if (typeof normalizeGatheringSkills === 'function') {
            normalizeGatheringSkills(player);
        }
        player.activeBuffs = savedPlayer.activeBuffs || [];
        player.equipment = restoredEquipment;
        playerFeed = (typeof savedPlayer.feed === 'number') ? savedPlayer.feed : playerFeed;
        player.maxInventorySlots = savedPlayer.maxInventorySlots || 30;

        if (savedPlayer.passives) {
            player.passiveAllocations = savedPlayer.passives.allocations || {};
            player.passivePoints = savedPlayer.passives.points || 0;
            player.passiveTreeVersion = savedPlayer.passives.treeVersion || PASSIVE_TREE_VERSION;
        } else {
            player.passiveAllocations = {};
            player.passivePoints = 2;
            player.passiveTreeVersion = PASSIVE_TREE_VERSION;
        }

        player.equippedSkillId = restoredEquippedStyle;
        player.unlockedSkillIds = restoredUnlockedStyles;
        player.combatStyleAllocations = restoredAllocations;
        player.combatStyleVersion = restoredCombatStyleVersion;
        player.skillPoints = 0;
        player.skillModAllocations = {};
        if (typeof normalizeCombatStylesState === 'function') {
            normalizeCombatStylesState(player);
        }

        window.materialInventory = normalizeMaterialStorage(gameState.materialInventory);
        window.coreInventory = normalizeCoreInventory(gameState.coreInventory);
        window.cacheInventory = normalizeCacheInventory(gameState.cacheInventory);
        window.pendingCacheResolution = gameState.pendingCacheResolution && typeof gameState.pendingCacheResolution === 'object'
            ? gameState.pendingCacheResolution
            : null;
        window.inventory = migrateLooseMaterialsToStorage(restoredInventory);
        window.componentDropCounts = gameState.componentDropCounts && typeof gameState.componentDropCounts === 'object'
            ? { ...gameState.componentDropCounts }
            : {};

        if (typeof isDelveInProgress !== 'undefined') {
            isDelveInProgress = Boolean(gameState.isDelveInProgress);
        }
        if (typeof currentDelveLocation !== 'undefined') {
            currentDelveLocation = gameState.currentDelveLocation || null;
        }
        if (typeof currentMonsterIndex !== 'undefined') {
            currentMonsterIndex = Number(gameState.currentMonsterIndex || 0);
        }
        if (typeof delveBag !== 'undefined') {
            delveBag = gameState.delveBag || { items: [], feed: 0 };
        }
        if (typeof delveClaimCache !== 'undefined') {
            const savedCache = gameState.delveClaimCache || { items: [], feed: 0 };
            delveClaimCache = {
                items: Array.isArray(savedCache.items)
                    ? savedCache.items.map(savedItem => restoreItem(savedItem))
                    : [],
                feed: Math.max(0, Number(savedCache.feed) || 0)
            };
        }
        if (typeof currentRunMode !== 'undefined') currentRunMode = gameState.currentRunMode || (isDelveInProgress ? 'operation' : null);
        if (typeof operationState !== 'undefined') {
            operationState = currentRunMode === 'operation' ? normalizeOperationState(gameState.operationState) : null;
        }
        if (typeof operationBoard !== 'undefined') {
            operationBoard = typeof normalizeOperationBoard === 'function'
                ? normalizeOperationBoard(gameState.operationBoard)
                : (gameState.operationBoard || { version: 2, generation: 0, playerLevel: player.level, offers: [] });
        }
        if (typeof completedOperationSeeds !== 'undefined') {
            completedOperationSeeds = Array.isArray(gameState.completedOperationSeeds)
                ? gameState.completedOperationSeeds.filter(seed => typeof seed === 'string' && seed).slice(-10)
                : [];
        }
        if (typeof completedOperationCount !== 'undefined') {
            completedOperationCount = Math.max(0, Math.floor(Number(gameState.completedOperationCount) || 0));
        }
        if (typeof completedDelveLocations !== 'undefined') {
            completedDelveLocations = gameState.completedDelveLocations && typeof gameState.completedDelveLocations === 'object'
                ? Object.fromEntries(Object.entries(gameState.completedDelveLocations)
                    .map(([name, count]) => [name, Math.max(0, Math.floor(Number(count) || 0))]))
                : {};
        }

        if (typeof window.restoreFabricationState === 'function') {
            window.restoreFabricationState(gameState.fabricationState || []);
        }

        if (!isDelveInProgress && gameState.activityState?.active && typeof window.restoreGatheringActivity === 'function') {
            window.restoreGatheringActivity(gameState.activityState.currentActivity);
        }

        resetGearPassiveBonuses();
        applyAllPassivesToPlayer();
        if (typeof window.recomputePlayerEffects === 'function') window.recomputePlayerEffects();
        updatePlayerStatsDisplay();
        updateInventoryDisplay();
        updateEquipmentDisplay();
        renderGlobalStatusBanner();

        if (isDelveInProgress && currentDelveLocation && typeof beginNextMonsterInSequence === 'function') {
            // Loading restarts the current encounter with a fresh instance while
            // preserving the delve index and exact contents of the delve bag.
            clearBuffs(player);
            setTimeout(() => {
                currentLocation = currentDelveLocation;
                beginNextMonsterInSequence();
            }, 0);
        }

        setAutosaveTargetSlot(targetSlot);

        if (migration.appliedVersions.length > 0) {
            console.log(`Save slot ${targetSlot} migrated from version ${migration.fromVersion} to ${migration.toVersion}.`);
        }
        console.log(`Game loaded successfully from profile ${targetSlot} ${kind}.`);
        logMessage(`Loaded Profile ${targetSlot} ${kind === 'manual' ? 'manual save' : 'autosave'}.`);
        const event = new CustomEvent('gameLoaded', { detail: { slot: targetSlot, kind, loaded: true } });
        window.dispatchEvent(event);
        return {
            ok: true,
            slot: targetSlot,
            kind,
            legacy: snapshot.legacy,
            migratedFrom: migration.appliedVersions.length > 0 ? migration.fromVersion : null,
            version: migration.toVersion,
            warnings: saveValidation.warnings
        };
    } catch (error) {
        console.error(`Error loading profile ${targetSlot} ${kind}:`, error);
        const event = new CustomEvent('gameLoaded', { detail: { slot: targetSlot, kind, loaded: false, error: true } });
        window.dispatchEvent(event);
        return { ok: false, reason: 'load_error', slot: targetSlot, kind, error };
    }
}

function restoreItem(savedItem) {
    if (!savedItem) return null;
    const normalizedItem = normalizeSavedItemData(savedItem);
    console.log(`Trying to restore item: ${normalizedItem.name}`);
    
    // Generated chassis weapons have unique display names, so restore them
    // through their stable chassis template instead of treating them as retired.
    const itemTemplate = window.coreboundSaveSchema?.findSavedItemTemplate
        ? window.coreboundSaveSchema.findSavedItemTemplate(normalizedItem, window.items)
        : window.items.find(item => item.name === normalizedItem.name);
    
    if (itemTemplate) {
        console.log(`Template found for ${normalizedItem.name}, type: ${itemTemplate.type}`);

        // Preserve saved generated values exactly (avoid reroll drift on load)
        const itemInstance = JSON.parse(JSON.stringify(normalizedItem));

        // Keep selected template metadata current without altering rolled stats
        if (itemTemplate.icon) {
            itemInstance.icon = itemTemplate.icon;
        }
        if (itemTemplate.effects && !itemInstance.effects) {
            itemInstance.effects = JSON.parse(JSON.stringify(itemTemplate.effects));
        }

        for (const key of ['type', 'slot', 'weaponType', 'levelRequirement', 'stackable', 'color']) {
            if (itemInstance[key] === undefined && itemTemplate[key] !== undefined) {
                itemInstance[key] = JSON.parse(JSON.stringify(itemTemplate[key]));
            }
        }
        if (typeof validateItemContent === 'function') {
            const validation = validateItemContent(itemInstance, 'restored item', { allowInstanceFields: true });
            if (!validation.valid) {
                throw new TypeError(`Invalid restored item ${itemInstance.name}: ${validation.errors.join('; ')}`);
            }
            validation.warnings.forEach(warning => console.warn(`Restored item warning for ${itemInstance.name}: ${warning}`));
        }

        return itemInstance;
    } else {
        console.warn(`Item template not found for ${normalizedItem.name}`);
        console.log(`Available weapons: ${window.weapons ? window.weapons.length : 'no weapons'}`);
        if (window.weapons && window.weapons.length > 0) {
            console.log(`First few weapon names: ${window.weapons.slice(0, 3).map(w => w.name).join(', ')}`);
            // Check if the name exists but has a slight mismatch
            const similarWeapon = window.weapons.find(w => 
                w.name.toLowerCase().includes(normalizedItem.name.toLowerCase()) ||
                normalizedItem.name.toLowerCase().includes(w.name.toLowerCase())
            );
            if (similarWeapon) {
                console.log(`Found similar weapon name: "${similarWeapon.name}" vs "${normalizedItem.name}"`);
            }
        }
        return normalizedItem;
    }
}

function restoreEquipment(savedEquipment) {
    if (!savedEquipment) return {
        mainHand: null,
        offHand: null,
        head: null,
        chest: null,
        legs: null,
        feet: null,
        gloves: null,
        bionicSlots: [null, null, null, null],
    };
    
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
        savedEquipment.bionicSlots.slice(0, 4).forEach(savedItem => {
            if (savedItem) {
                equipment.bionicSlots.push(restoreItem(savedItem));
            } else {
                equipment.bionicSlots.push(null);
            }
        });
    }
    while (equipment.bionicSlots.length < 4) equipment.bionicSlots.push(null);
    
    return equipment;
}

function initializeNewCharacterState() {
    if (typeof stopCombat === 'function' && (
        (typeof isCombatActive !== 'undefined' && isCombatActive) ||
        (typeof isDelveInProgress !== 'undefined' && isDelveInProgress)
    )) {
        stopCombat('newGame');
    }
    if (window.activityManager && typeof window.activityManager.clearActivityOnLoad === 'function') {
        window.activityManager.clearActivityOnLoad();
    }
    if (typeof window.clearFabricationsOnLoad === 'function') window.clearFabricationsOnLoad();

    player.baseStats = JSON.parse(JSON.stringify(playerBaseStats));
    player.totalStats = {};
    player.currentHealth = null;
    player.currentShield = null;
    player.activeBuffs = [];
    player.effects = [];
    player.experience = 0;
    player.level = 1;
    player.maxInventorySlots = 30;
    player.passivePoints = 2;
    player.passiveAllocations = {};
    player.passiveTreeVersion = PASSIVE_TREE_VERSION;
    player.gearPassiveBonuses = {};
    player.passiveAttackSpeedBonus = 0;
    player.equippedSkillId = window.DEFAULT_COMBAT_STYLE_ID || 'balancedStyle';
    player.unlockedSkillIds = (window.combatStyles || []).map(style => style.id);
    player.combatStyleAllocations = {};
    player.combatStyleVersion = window.COMBAT_STYLE_VERSION || 2;
    player.skillPoints = 0;
    player.skillModAllocations = {};
    player.gatheringSkills = { Mining: { level: 1, experience: 0 } };
    player.equipment = {
        mainHand: null,
        offHand: null,
        head: null,
        chest: null,
        legs: null,
        feet: null,
        gloves: null,
        bionicSlots: [null, null, null, null]
    };
    if (typeof normalizeCombatStylesState === 'function') normalizeCombatStylesState(player);

    window.inventory = [];
    window.materialInventory = {};
    window.coreInventory = {};
    window.cacheInventory = {};
    window.pendingCacheResolution = null;
    window.componentDropCounts = {};
    if (typeof delveClaimCache !== 'undefined') delveClaimCache = { items: [], feed: 0 };
    if (typeof completedDelveLocations !== 'undefined') completedDelveLocations = {};
    if (typeof operationBoard !== 'undefined') operationBoard = { version: 2, generation: 0, playerLevel: 1, offers: [] };
    if (typeof completedOperationSeeds !== 'undefined') completedOperationSeeds = [];
    if (typeof completedOperationCount !== 'undefined') completedOperationCount = 0;
    if (typeof isDelveInProgress !== 'undefined') isDelveInProgress = false;
    if (typeof currentDelveLocation !== 'undefined') currentDelveLocation = null;
    if (typeof currentMonsterIndex !== 'undefined') currentMonsterIndex = 0;
    if (typeof delveBag !== 'undefined') delveBag = { items: [], feed: 0 };
    if (typeof currentRunMode !== 'undefined') currentRunMode = null;
    if (typeof operationState !== 'undefined') operationState = null;
    if (typeof currentLocation !== 'undefined') currentLocation = null;
    if (typeof closeDelveClaimCachePopup === 'function') closeDelveClaimCachePopup();

    const startingItemTemplate = items.find(item => item.name === 'Broken Phase Sword');
    if (startingItemTemplate) window.inventory.push(generateItemInstance(startingItemTemplate));
    else console.warn('Starting item template not found.');

    playerFeed = STARTING_FEED;
    player.calculateStats();
    player.currentHealth = player.totalStats.health;
    player.currentShield = player.totalStats.energyShield;
    updateInventoryDisplay();
    updateEquipmentDisplay();
    updatePlayerStatsDisplay();
    displayPassivesScreen();
    initializeEquipmentSlots();
    showScreen('inventory-screen');
}

function startNewGameInProfile(slotIndex) {
    const slot = sanitizeSaveSlotIndex(slotIndex);
    if (!ownsSaveWriterLease()) {
        setMainMenuStatus('This tab is read-only because Corebound is active in another tab.', 'error');
        return { ok: false, reason: 'duplicate_tab' };
    }
    if (saveProfiles.getProfile(slot).occupied) {
        setMainMenuStatus(`Profile ${slot} is not empty. Delete it before starting a new game there.`, 'error');
        return { ok: false, reason: 'occupied', slot };
    }

    initializeNewCharacterState();
    setAutosaveTargetSlot(slot);
    saveRuntimeReady = true;
    const result = saveGame(true, slot);
    if (!result.ok) {
        saveRuntimeReady = false;
        setMainMenuStatus(`Profile ${slot} could not be created because its first autosave failed.`, 'error');
        return result;
    }
    clearSaveFailure();
    hideMainMenu();
    logMessage(`New game started in Profile ${slot}.`);
    renderSaveProtectionState();
    return result;
}

function loadProfileSnapshot(slotIndex, saveKind) {
    const slot = sanitizeSaveSlotIndex(slotIndex);
    const kind = saveProfiles.sanitizeKind(saveKind);
    saveRuntimeReady = false;
    const result = loadGame(slot, kind);
    if (!result.ok) {
        showMainMenu('load');
        setMainMenuStatus(`Profile ${slot}'s ${kind === 'manual' ? 'manual save' : 'autosave'} could not be loaded. Nothing was overwritten.`, 'error');
        return result;
    }
    clearSaveFailure();
    saveRuntimeReady = true;
    hideMainMenu();
    renderSaveProtectionState();
    return result;
}

function deleteSaveProfile(slotIndex) {
    const slot = sanitizeSaveSlotIndex(slotIndex);
    if (!ownsSaveWriterLease()) {
        setMainMenuStatus('This tab is read-only because Corebound is active in another tab.', 'error');
        return { ok: false, reason: 'duplicate_tab', slot };
    }
    if (!confirm(`Delete Profile ${slot}, including its autosave and manual save? This cannot be undone.`)) {
        return { ok: false, reason: 'cancelled', slot };
    }
    saveProfiles.deleteProfile(slot);
    if (saveCoordinator) saveCoordinator.clearBackups(slot);
    renderMainMenu(mainMenuView);
    setMainMenuStatus(`Profile ${slot} deleted.`, 'success');
    return { ok: true, slot };
}

function logOutToMainMenu() {
    const slot = getAutosaveTargetSlot();
    const result = saveGame(true, slot);
    if (!result.ok) {
        setSaveFailure(result.error || new Error('The final autosave did not complete.'), true);
        return result;
    }
    saveRuntimeReady = false;
    closeSettingsMenu();
    window.location.reload();
    return result;
}


// Auto-save interval (saves every 5 seconds). Only the active tab may write.
setInterval(() => {
    if (!saveRuntimeReady || !ownsSaveWriterLease()) return;
    saveGame(true, getAutosaveTargetSlot());
}, 5000);

if (saveCoordinator) {
    saveCoordinator.onOwnershipChange(() => {
        renderSaveProtectionState();
        renderMainMenu(mainMenuView);
    });
}

function forceExitAutosave() {
    if (!exitAutosaveAttempted && saveRuntimeReady && ownsSaveWriterLease()) {
        exitAutosaveAttempted = true;
        saveGame(true, getAutosaveTargetSlot());
    }
}

window.addEventListener('pagehide', forceExitAutosave);
window.addEventListener('pageshow', () => {
    // A page restored from the browser's back/forward cache must be allowed to
    // perform another final autosave the next time it exits.
    exitAutosaveAttempted = false;
});
window.addEventListener('beforeunload', () => {
    forceExitAutosave();
    if (saveCoordinator) saveCoordinator.relinquishOwnership();
});

// Event listeners
window.registerCoreboundInitializer(() => {
    const developerMode = Boolean(window.coreboundConfig?.developerMode);
    const devNav = document.querySelector('[data-settings-panel="dev"]');
    const devPanel = document.getElementById('settings-panel-dev');
    if (devNav) devNav.hidden = !developerMode;
    if (devPanel && !developerMode) devPanel.hidden = true;
    
    document.getElementById('save-game').addEventListener('click', () => {
        const slot = getAutosaveTargetSlot();
        const result = saveGame(false, slot);
        if (result.ok) {
            showManualSaveConfirmation(slot);
            logMessage(`Manual save completed for Profile ${slot}.`);
        }
    });
    document.getElementById('logout-to-main-menu').addEventListener('click', logOutToMainMenu);
    document.getElementById('save-owner-takeover').addEventListener('click', () => {
        takeSaveControlAndReload();
    });

    document.getElementById('main-menu-new').addEventListener('click', () => {
        setMainMenuStatus('');
        renderMainMenu('new');
    });
    document.getElementById('main-menu-load').addEventListener('click', () => {
        setMainMenuStatus('');
        renderMainMenu('load');
    });
    document.getElementById('main-menu-back').addEventListener('click', () => {
        setMainMenuStatus('');
        renderMainMenu('root');
    });
    document.getElementById('main-menu-continue').addEventListener('click', (event) => {
        const button = event.currentTarget;
        if (button.dataset.slot && button.dataset.kind) {
            loadProfileSnapshot(button.dataset.slot, button.dataset.kind);
        }
    });
    document.getElementById('main-menu-slot-list').addEventListener('click', (event) => {
        const button = event.target.closest('[data-menu-action]');
        if (!button || button.disabled) return;
        const action = button.dataset.menuAction;
        if (action === 'new') startNewGameInProfile(button.dataset.slot);
        else if (action === 'load') loadProfileSnapshot(button.dataset.slot, button.dataset.kind);
        else if (action === 'delete') deleteSaveProfile(button.dataset.slot);
    });
    wireSidebarNavigation();

    wireSettingsNavigation();

    // Event listener for settings button
    document.getElementById('settings-button').addEventListener('click', () => {
        const menu = document.getElementById('settings-menu');
        openSettingsMenu();
        // Close settings on overlay click or ESC
        const overlayClose = (e) => {
            if (e.target === menu) {
                closeSettingsMenu();
                window.removeEventListener('click', overlayClose);
                document.removeEventListener('keydown', escClose);
            }
        };
        const escClose = (e) => {
            if (e.key === 'Escape') {
                closeSettingsMenu();
                window.removeEventListener('click', overlayClose);
                document.removeEventListener('keydown', escClose);
            }
        };
        window.addEventListener('click', overlayClose);
        document.addEventListener('keydown', escClose);

        // Keybinds: load saved keys into inputs
        const defaultBinds = { inventory:'I', equipment:'E', passives:'P', adventure:'A', settings:'S' };
        const saved = JSON.parse(localStorage.getItem('keybinds') || 'null') || defaultBinds;
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = (v||'').toUpperCase(); };
        setVal('kb-inventory', saved.inventory);
        setVal('kb-equipment', saved.equipment);
        setVal('kb-passives', saved.passives);
        setVal('kb-adventure', saved.adventure);
        setVal('kb-settings', saved.settings);


		// Gameplay settings: Sell confirmation toggle
		const sellToggle = document.getElementById('setting-disable-sell-confirm');
		if (sellToggle) {
			const savedPref = localStorage.getItem('disableSellConfirm') === 'true';
			sellToggle.checked = savedPref;
			sellToggle.onchange = () => {
				localStorage.setItem('disableSellConfirm', sellToggle.checked ? 'true' : 'false');
				logMessage(`Sell confirmation ${sellToggle.checked ? 'disabled' : 'enabled'}.`);
			};
		}

		// Save/reset buttons
        const saveBtn = document.getElementById('kb-save');
        const resetBtn = document.getElementById('kb-reset');
        if (saveBtn) saveBtn.onclick = () => {
            const cleaned = (v) => (v||'').trim().slice(0,1).toUpperCase();
            const binds = {
                inventory: cleaned(document.getElementById('kb-inventory')?.value),
                equipment: cleaned(document.getElementById('kb-equipment')?.value),
                passives: cleaned(document.getElementById('kb-passives')?.value),
                adventure: cleaned(document.getElementById('kb-adventure')?.value),
                settings: cleaned(document.getElementById('kb-settings')?.value)
            };
            localStorage.setItem('keybinds', JSON.stringify(binds));
            logMessage('Keybinds saved.');
        };
        if (resetBtn) resetBtn.onclick = () => {
            localStorage.removeItem('keybinds');
            setVal('kb-inventory', defaultBinds.inventory);
            setVal('kb-equipment', defaultBinds.equipment);
            setVal('kb-passives', defaultBinds.passives);
            setVal('kb-adventure', defaultBinds.adventure);
            setVal('kb-settings', defaultBinds.settings);
            logMessage('Keybinds reset to defaults.');
        };

        // Dev tools: add +1 level and +1,000,000 Feed
        const addLvlBtn = document.getElementById('dev-add-level');
        if (addLvlBtn) {
            addLvlBtn.onclick = () => {
                if (player.level >= MAX_PLAYER_LEVEL) {
                    logMessage(`You are already at the maximum level (${MAX_PLAYER_LEVEL}).`);
                    return;
                }
                // Grant exactly enough XP to level once using current level requirement
                const req = getXPForNextLevel(player.level);
                gainExperience(req);
                updatePlayerStatsDisplay();
            };
        }
        const addCredBtn = document.getElementById('dev-add-credits');
        if (addCredBtn) {
            addCredBtn.onclick = () => {
                playerFeed = (playerFeed || 0) + 1000000;
                logMessage('Added 1,000,000 Feed.');
                updateInventoryDisplay();
            };
        }
    });

    // Wire bulk actions (Sell All / Disassemble All) in inventory toolbar
    const invSellAll = document.getElementById('inv-sell-all');
    if (invSellAll) invSellAll.onclick = () => sellAllInInventory();
    const invDisAll = document.getElementById('inv-disassemble-all');
    if (invDisAll) invDisAll.onclick = () => disassembleAllInInventory();

    // Event listener for closing settings modal
    document.getElementById('close-settings').addEventListener('click', () => {
        closeSettingsMenu();
    });

    // A profile must be explicitly created or successfully loaded before any save may write.
    saveRuntimeReady = false;
    renderSaveProtectionState();
    showMainMenu('root');
    startGlobalStatusBannerUpdates();

    // Initial display updates
    updatePlayerStatsDisplay();
    updateInventoryDisplay();
    updateEquipmentDisplay();
    // Sidebar collapse toggle hookup with persistence
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse-toggle');
    if (sidebar && collapseBtn) {
        // Restore persisted state
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved === 'true') {
            sidebar.classList.add('collapsed');
            collapseBtn.textContent = '›';
        }
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            const collapsed = sidebar.classList.contains('collapsed');
            collapseBtn.textContent = collapsed ? '›' : '‹';
            localStorage.setItem('sidebarCollapsed', collapsed ? 'true' : 'false');
        });
    }
});

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('main-menu-overlay')?.hidden) return;
    if (['INPUT','TEXTAREA'].includes((e.target && e.target.tagName) || '')) return;
    const binds = JSON.parse(localStorage.getItem('keybinds') || 'null') || { inventory:'I', equipment:'E', passives:'P', adventure:'A', settings:'S' };
    const key = (e.key||'').toUpperCase();
    if (key === binds.inventory) { showScreen('inventory-screen'); e.preventDefault(); }
    else if (key === binds.equipment) { showScreen('equipment-screen'); e.preventDefault(); }
    else if (key === binds.passives) {
        if (typeof window.openPassivesScreen === 'function') {
            window.openPassivesScreen();
        } else {
            showScreen('passives-screen');
        }
        e.preventDefault();
    }
    else if (key === binds.adventure) { showScreen('adventure-screen'); e.preventDefault(); }
    else if (key === binds.settings) {
        if (document.getElementById('settings-menu')) {
            openSettingsMenu();
            e.preventDefault();
        }
    }
});

// Lightweight global warning popup
function showWarningPopup(message) {
    const overlayId = 'warning-overlay';
    const existing = document.getElementById(overlayId);
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100000; display:flex; align-items:center; justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:linear-gradient(to bottom,#2b2b2b,#151515); border:2px solid #ff6464; border-radius:8px; padding:16px 18px; color:#fff; max-width:420px; text-align:center; box-shadow:0 0 20px rgba(255,100,100,0.25)';
    box.innerHTML = `<div style="font-family: 'Orbitron', sans-serif; color:#ffb3b3; font-weight:bold; margin-bottom:8px;">Warning</div>
                     <div style="margin-bottom:12px; color:#ffdede;">${message}</div>`;
    const ok = document.createElement('button');
    ok.textContent = 'OK';
    ok.style.cssText = 'background:linear-gradient(to bottom,#663333,#441111); color:#fff; border:1px solid #ff6464; border-radius:4px; padding:8px 14px; cursor:pointer;';
    ok.addEventListener('click', () => overlay.remove());
    box.appendChild(ok);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}


// Function to show the appropriate screen
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
        // Only trigger inventory entrance animation when actually opening the screen
        const inv = document.getElementById('inventory-screen');
        if (inv) {
            if (screenId === 'inventory-screen') {
                inv.classList.add('play-animate');
                // Compute total animation duration based on items and their stagger delay
                // Base anim 500ms + (index * 50ms) stagger + small buffer
                const scheduleRemoval = () => {
                    const count = document.querySelectorAll('#inventory li').length;
                    const totalMs = 170 + Math.max(0, count - 1) * 15 + 120;
                    setTimeout(() => inv.classList.remove('play-animate'), totalMs);
                };
                // Defer to next frame so DOM has rendered the list
                if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(scheduleRemoval);
                } else {
                    setTimeout(scheduleRemoval, 0);
                }
            } else {
                inv.classList.remove('play-animate');
            }
        }
        window.currentScreen = screenId;
        
        // Update sidebar menu to show active item
        updateSidebarActiveItem(screenId);
        if (screenId === 'passives-screen' && typeof window.refreshPassivesScreen === 'function') {
            window.refreshPassivesScreen();
        }
        if (screenId === 'skills-screen' && typeof window.refreshCombatStylesScreen === 'function') {
            window.refreshCombatStylesScreen();
        }
    } else {
        console.error(`Screen with ID ${screenId} not found.`);
        return;
    }
    
    // Dispatch screenChanged event
    const event = new CustomEvent('screenChanged', { detail: { screenId } });
    window.dispatchEvent(event);
    if (screenId === 'adventure-screen') {
        if (typeof displayAdventureLocations === 'function') {
            displayAdventureLocations();
        }
        updatePlayerStatsDisplay();
        updateEnemyStatsDisplay();
    }
    renderGlobalStatusBanner();
}

// Function to update the active sidebar menu item
function updateSidebarActiveItem(screenId) {
    // Remove active class from all menu items
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to the matching menu item
    const menuItem = document.querySelector(`.sidebar-menu li[data-screen="${screenId}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    } else {
        // Handle skill screens (convert mining-screen to Mining skill)
        const skillName = screenId.replace('-screen', '');
        const skillItem = document.querySelector(`.sidebar-menu li[data-skill="${skillName.charAt(0).toUpperCase() + skillName.slice(1)}"]`);
        if (skillItem) {
            skillItem.classList.add('active');
        }
    }
}

let globalStatusBannerInterval = null;

function getSkillScreenId(skillName) {
    if (skillName === 'Fabrication') {
        return 'fabrication-screen';
    }
    return `${skillName.toLowerCase()}-screen`;
}

function formatBannerTimeRemaining(ms) {
    const totalSeconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderGlobalStatusBanner() {
    const banner = document.getElementById('global-status-banner');
    if (!banner) return;

    const level = Number(player?.level || 1);
    const xp = Math.max(0, Math.floor(Number(player?.experience || 0)));
    const xpNext = Math.max(1, Math.floor(getXPForNextLevel(level) || 1));
    const feed = Math.max(0, Math.floor(Number(playerFeed || 0))).toLocaleString();
    const leftText = `Level ${level} · XP ${xp}/${xpNext} · Feed ${feed}`;

    let activityText = 'Activity: Idle';
    let activityPercent = 0;
    let activityAlert = null;
    const activityState = (window.activityManager && typeof window.activityManager.getState === 'function')
        ? window.activityManager.getState()
        : null;
    const activeActivity = activityState?.currentActivity;
    if (activityState?.active && activeActivity) {
        const typeLabel = activeActivity.type ? `${activeActivity.type.charAt(0).toUpperCase()}${activeActivity.type.slice(1)}` : 'Activity';
        activityPercent = Math.max(0, Math.min(100, Number(activeActivity.progressPercent || 0)));
        activityText = `${typeLabel}: ${activeActivity.displayName} · ${Math.round(activityPercent)}% · ${formatBannerTimeRemaining(activeActivity.timeRemainingMs)}`;
    } else if (typeof isCombatActive !== 'undefined' && isCombatActive) {
        const livingCount = typeof getLivingEnemies === 'function' ? getLivingEnemies().length : 1;
        const enemyName = (typeof enemy !== 'undefined' && enemy?.name) ? enemy.name : 'Enemy';
        activityText = `Activity: Combat · ${livingCount} hostile${livingCount === 1 ? '' : 's'} · Target ${enemyName}`;
    } else if (typeof isDelveInProgress !== 'undefined' && isDelveInProgress) {
        const locationName = (typeof currentDelveLocation !== 'undefined' && currentDelveLocation?.name)
            ? currentDelveLocation.name
            : 'Deployment';
        const fightNumber = (typeof currentMonsterIndex !== 'undefined' ? currentMonsterIndex + 1 : 1);
        const runLabel = typeof currentRunMode !== 'undefined' && currentRunMode === 'patrol' ? 'Patrol' : 'Operation';
        activityText = `Activity: ${runLabel} · ${locationName} · Encounter ${fightNumber}`;
    }
    if (activityState?.alert?.message) {
        activityAlert = activityState.alert;
    }
    const chipState = typeof getEquippedChipState === 'function'
        ? getEquippedChipState(player)
        : null;
    const conflictMessage = chipState?.hasBlackConflict
        ? `${chipState.blackCount} Black Chips are equipped. Every Black Chip is disabled until only one remains.`
        : '';
    ['inventory-chip-warning', 'equipment-chip-warning', 'delve-chip-warning'].forEach(id => {
        const warning = document.getElementById(id);
        if (!warning) return;
        warning.textContent = conflictMessage;
        warning.style.display = conflictMessage ? 'block' : 'none';
    });
    if (chipState?.hasBlackConflict) {
        activityAlert = {
            severity: 'danger',
            message: `BLACK CHIP CONFLICT: all ${chipState.blackCount} Black Chips are disabled`
        };
    }

    let combatText = 'Combat: Inactive';
    let combatClass = '';
    if (typeof isCombatActive !== 'undefined' && isCombatActive && typeof enemy !== 'undefined' && enemy) {
        const livingCount = typeof getLivingEnemies === 'function' ? getLivingEnemies().length : 1;
        const playerMax = Math.max(1, Number(player?.totalStats?.health || player?.baseStats?.maxHealth || 1));
        const playerHp = Math.max(0, Math.floor(Number(player?.currentHealth || 0)));
        const enemyMax = Math.max(1, Math.floor(Number(enemy?.totalStats?.health || enemy?.currentHealth || 1)));
        const enemyHp = Math.max(0, Math.floor(Number(enemy?.currentHealth || 0)));
        const playerPct = (playerHp / playerMax) * 100;
        if (playerPct < 15) {
            combatClass = 'danger-strong';
        } else if (playerPct < 30) {
            combatClass = 'danger';
        }
        const enemyName = enemy?.name || 'Enemy';
        combatText = `Combat: ${livingCount} hostile${livingCount === 1 ? '' : 's'} · Target ${enemyName} ${enemyHp}/${enemyMax} HP · You ${playerHp}/${Math.floor(playerMax)} HP`;
    } else if (typeof isDelveInProgress !== 'undefined' && isDelveInProgress) {
        const locationName = (typeof currentDelveLocation !== 'undefined' && currentDelveLocation?.name)
            ? currentDelveLocation.name
            : 'Deployment';
        const fightNumber = (typeof currentMonsterIndex !== 'undefined' ? currentMonsterIndex + 1 : 1);
        const runLabel = typeof currentRunMode !== 'undefined' && currentRunMode === 'patrol' ? 'Patrol' : 'Operation';
        combatText = `${runLabel} · ${locationName} · Encounter ${fightNumber}`;
    }

    const rightText = activityAlert
        ? activityAlert.message
        : (combatClass ? 'LOW HP' : 'Status OK');
    const rightClass = activityAlert
        ? `alert-${activityAlert.severity || 'info'}`
        : combatClass;

    banner.innerHTML = `
        <div class="global-status-left">${leftText}</div>
        <div class="global-status-center">
            <div class="global-status-activity-line">${activityText}</div>
            <div class="global-status-progress-track"><div class="global-status-progress-fill" style="width:${activityPercent.toFixed(1)}%"></div></div>
        </div>
        <div class="global-status-right ${rightClass}">${combatText}<span class="global-status-tag">${rightText}</span></div>
    `;
}

function startGlobalStatusBannerUpdates() {
    if (globalStatusBannerInterval) {
        clearInterval(globalStatusBannerInterval);
    }
    renderGlobalStatusBanner();
    globalStatusBannerInterval = setInterval(renderGlobalStatusBanner, 200);
}

function handleSidebarNavigation(menuItem) {
    const screenId = menuItem.getAttribute('data-screen');
    const skillName = menuItem.getAttribute('data-skill');
    if (screenId) {
        if (screenId === 'passives-screen' && typeof window.openPassivesScreen === 'function') {
            window.openPassivesScreen();
        } else {
            showScreen(screenId);
        }
        return;
    }

    if (!skillName) return;
    const skillScreenId = getSkillScreenId(skillName);
    showScreen(skillScreenId);

    if (skillName === 'Fabrication') {
        if (typeof displayFabricationRecipes === 'function') {
            displayFabricationRecipes();
        }
        return;
    }

    if (typeof displaySkillActivities === 'function') {
        displaySkillActivities(skillName);
    }
}

function wireSidebarNavigation() {
    document.querySelectorAll('.sidebar-menu li').forEach((menuItem) => {
        menuItem.addEventListener('click', () => handleSidebarNavigation(menuItem));
    });
}
