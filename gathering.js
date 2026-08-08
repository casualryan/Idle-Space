let isGathering = false;
let currentActivity;
let gatheringProgress = 0;
let gatheringTimer = 0;
let lastMiningActivitySignature = 'idle';

const GATHERING_SKILL_MAX_LEVEL = { Mining: 30 };

function getEffectiveGatheringLevel(skillName, rawLevel) {
    const cap = GATHERING_SKILL_MAX_LEVEL[skillName];
    const level = Math.max(0, rawLevel || 0);
    return cap ? Math.min(level, cap) : level;
}

function getGatheringSkillMaxLevel(skillName) {
    return GATHERING_SKILL_MAX_LEVEL[skillName] || null;
}

function getMiningPermanentBonuses(miningLevel) {
    const level = getEffectiveGatheringLevel('Mining', miningLevel);
    return {
        flatHealth: level * 5,
        healthPercent: Math.floor(level / 3),
        healthPercentFraction: Math.floor(level / 3) * 0.01
    };
}

function getMiningMilestoneInfo(miningLevel) {
    const level = getEffectiveGatheringLevel('Mining', miningLevel);
    const maxLevel = GATHERING_SKILL_MAX_LEVEL.Mining;
    const nextLevel = level >= maxLevel ? null : level + 1;
    const nextPercentLevel = level >= maxLevel ? null : (Math.floor(level / 3) + 1) * 3;
    return { nextLevel, nextPercentLevel };
}

function normalizeGatheringSkills(playerObject) {
    if (!playerObject) return;
    if (!playerObject.gatheringSkills) {
        playerObject.gatheringSkills = {
            Mining: { level: 1, experience: 0 }
        };
    }

    // Retire disconnected legacy skills when loading older saves.
    delete playerObject.gatheringSkills.Medtek;
    delete playerObject.gatheringSkills.Foraging;

    if (!playerObject.gatheringSkills.Mining) {
        playerObject.gatheringSkills.Mining = { level: 1, experience: 0 };
    }

    const mining = playerObject.gatheringSkills.Mining;
    const maxLevel = GATHERING_SKILL_MAX_LEVEL.Mining;
    mining.level = Math.max(1, Math.min(mining.level || 1, maxLevel));

    if (mining.level >= maxLevel) {
        mining.level = maxLevel;
        mining.experience = 0;
    }
}

window.getEffectiveGatheringLevel = getEffectiveGatheringLevel;
window.getMiningPermanentBonuses = getMiningPermanentBonuses;
window.getMiningMilestoneInfo = getMiningMilestoneInfo;
window.normalizeGatheringSkills = normalizeGatheringSkills;
window.GATHERING_SKILL_MAX_LEVEL = GATHERING_SKILL_MAX_LEVEL;

function getGatheringSkillBonuses(skillLevel) {
    const level = skillLevel || 1;
    return {
        timeBonus: level === 1 ? 0 : (level - 1) * 0.5,
        yieldBonus: level === 1 ? 0 : (level - 1) * 0.1,
        rareFindBonus: level * 0.02
    };
}

function getModifiedActivityTime(activity, skillLevel) {
    const { timeBonus } = getGatheringSkillBonuses(skillLevel);
    return activity.time * (1 - timeBonus / 100);
}

function getActivityStartLabel(skillName) {
    return skillName === 'Mining' ? 'Start Mining' : 'Start Activity';
}

function getActivityStopLabel(skillName) {
    return skillName === 'Mining' ? 'Stop Mining' : 'Stop Activity';
}

function isMiningInProgress() {
    return isGathering &&
        currentActivity &&
        currentActivity.skillName === 'Mining';
}

function getManagerState() {
    if (!window.activityManager || typeof window.activityManager.getState !== 'function') {
        return null;
    }
    return window.activityManager.getState();
}

function syncGatheringStateFromManager(stateOverride = null) {
    const state = stateOverride || getManagerState();
    const active = state?.currentActivity;
    const isManagedGathering = Boolean(active && active.skill === 'Mining');

    if (!isManagedGathering) {
        isGathering = false;
        currentActivity = null;
        gatheringProgress = 0;
        gatheringTimer = 0;
        const miningBar = document.getElementById('mining-progress-bar');
        if (miningBar) miningBar.style.width = '0%';
        updateMiningActivePanel('Mining');
        highlightActiveMiningCard();
        return;
    }

    const activityDef = active?.context?.activity || null;
    const skillName = active?.context?.skillName || active.skill || 'Mining';

    isGathering = true;
    currentActivity = { skillName, activity: activityDef };
    gatheringProgress = Number(active.progressPercent || 0);
    gatheringTimer = Math.max(0, Number(active.progressMs || 0) / 1000);

    const progressElement = document.getElementById(`${skillName.toLowerCase()}-progress-bar`);
    if (progressElement) {
        progressElement.style.width = `${gatheringProgress}%`;
    }
    updateMiningActivePanel('Mining');
    highlightActiveMiningCard();
}

function updateMiningActivePanel(skillName) {
    const panel = document.getElementById('mining-active-panel');
    if (!panel || skillName !== 'Mining') return;

    const nameEl = document.getElementById('mining-active-name');
    const timeEl = document.getElementById('mining-active-time');
    const yieldEl = document.getElementById('mining-active-yield');
    const stopButton = document.getElementById('stop-mining');

    if (!isGathering || !currentActivity || currentActivity.skillName !== 'Mining') {
        panel.style.display = 'none';
        if (stopButton) stopButton.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    if (stopButton) stopButton.style.display = 'block';

    const activity = currentActivity.activity;
    const managerActivity = getManagerState()?.currentActivity;
    const remainingMs = managerActivity && managerActivity.skill === 'Mining'
        ? Number(managerActivity.timeRemainingMs || 0)
        : 0;
    const remaining = Math.max(0, remainingMs / 1000);

    if (nameEl) nameEl.textContent = activity.name;
    if (timeEl) timeEl.textContent = `${remaining.toFixed(1)}s remaining`;
    if (yieldEl) {
        yieldEl.textContent = `${activity.item.name} x${activity.item.quantity || 1}`;
    }
}

function highlightActiveMiningCard() {
    const miningBusy = isMiningInProgress();

    document.querySelectorAll('#mining-activities .activity-card').forEach(card => {
        card.classList.remove('active', 'mining-inactive');
    });

    if (!miningBusy) return;

    document.querySelectorAll('#mining-activities .activity-card').forEach(card => {
        const title = card.querySelector('.activity-name');
        const isActiveCard = title && title.textContent === currentActivity.activity.name;
        if (isActiveCard) {
            card.classList.add('active');
        } else {
            card.classList.add('mining-inactive');
        }
    });
}

function renderMiningProfile(skillLevel, skillXP) {
    const statsDiv = document.getElementById('mining-skill-stats');
    if (!statsDiv) return;

    const maxLevel = GATHERING_SKILL_MAX_LEVEL.Mining;
    const effectiveLevel = getEffectiveGatheringLevel('Mining', skillLevel);
    const atMax = effectiveLevel >= maxLevel;
    const xpForNextLevel = getGatheringXPForNextLevel(effectiveLevel);
    const progressPercent = atMax ? 100 : (skillXP / xpForNextLevel) * 100;
    const { timeBonus, yieldBonus, rareFindBonus } = getGatheringSkillBonuses(effectiveLevel);
    const permanentBonus = getMiningPermanentBonuses(effectiveLevel);
    const milestones = getMiningMilestoneInfo(effectiveLevel);

    statsDiv.className = 'mining-stats mining-profile-panel';
    statsDiv.innerHTML = `
        <h3>Mining Profile</h3>
        <div class="mining-profile-row">
            <span class="stat-name">Level</span>
            <span class="stat-value">${effectiveLevel} / ${maxLevel}</span>
        </div>
        <div class="mining-profile-row">
            <span class="stat-name">Experience</span>
            <span class="stat-value">${atMax ? 'MAX' : `${Math.floor(skillXP)} / ${Math.floor(xpForNextLevel)}`}</span>
        </div>
        <div class="mining-xp-progress progress-container">
            <div id="mining-level-progress-bar" class="progress-bar skill-progress-bar" style="width: ${Math.min(progressPercent, 100).toFixed(1)}%"></div>
        </div>
        <ul class="mining-profile-stats">
            <li><span class="stat-name">Time Bonus</span> <span class="stat-value">${timeBonus > 0 ? '-' : ''}${timeBonus.toFixed(1)}%</span></li>
            <li><span class="stat-name">Yield Bonus</span> <span class="stat-value">+${yieldBonus.toFixed(1)}%</span></li>
            <li><span class="stat-name">Rare Find Chance</span> <span class="stat-value">+${rareFindBonus.toFixed(2)}%</span></li>
        </ul>
        <div class="mining-permanent-bonus">
            <div class="mining-section-label">Permanent Bonus</div>
            <div class="stat-value">+${permanentBonus.flatHealth} Max Health, +${permanentBonus.healthPercent}% Max Health</div>
        </div>
        <div class="mining-milestones">
            <div class="mining-section-label">Next Milestones</div>
            ${milestones.nextLevel
                ? `<div class="milestone-line">Level ${milestones.nextLevel}: <span class="stat-value">+5 Max Health</span></div>`
                : '<div class="milestone-line">Maximum Mining level reached.</div>'}
            ${milestones.nextPercentLevel
                ? `<div class="milestone-line">Level ${milestones.nextPercentLevel}: <span class="stat-value">+1% Max Health</span></div>`
                : ''}
        </div>
    `;
}

function renderGenericSkillStats(skillName, skillLevel, skillXP) {
    const statsDiv = document.getElementById(`${skillName.toLowerCase()}-skill-stats`) ||
        document.getElementById('gathering-skill-stats');
    if (!statsDiv) return;

    const xpForNextLevel = getGatheringXPForNextLevel(skillLevel);
    const progressPercent = (skillXP / xpForNextLevel) * 100;
    const { timeBonus, yieldBonus, rareFindBonus } = getGatheringSkillBonuses(skillLevel);

    statsDiv.className = 'mining-stats';
    statsDiv.innerHTML = `
        <h3>${skillName} Stats</h3>
        <ul>
            <li><span class="stat-name">Current Level:</span> <span class="stat-value">${skillLevel}</span></li>
            <li><span class="stat-name">Experience:</span> <span class="stat-value">${skillXP} / ${xpForNextLevel} (${progressPercent.toFixed(1)}%)</span></li>
            <li><span class="stat-name">Time Bonus:</span> <span class="stat-value">${timeBonus > 0 ? '-' : ''}${timeBonus.toFixed(1)}%</span></li>
            <li><span class="stat-name">Yield Bonus:</span> <span class="stat-value">+${yieldBonus.toFixed(1)}%</span></li>
            <li><span class="stat-name">Rare Find:</span> <span class="stat-value">+${rareFindBonus.toFixed(2)}%</span></li>
        </ul>
    `;
}

window.addEventListener('screenChanged', function(event) {
    const screenId = event.detail.screenId;
    if (screenId === 'mining-screen') {
        displaySkillActivities('Mining');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    normalizeGatheringSkills(player);

    const stopButton = document.getElementById('stop-mining');
    if (stopButton) {
        stopButton.addEventListener('click', stopGatheringActivity);
    }
});

function startGatheringActivity(skillName, activity) {
    if (!window.activityManager) {
        console.error('activityManager is not available.');
        return;
    }
    if (isCombatActive || isDelveInProgress) {
        logMessage('Cannot start mining during combat or an active delve.');
        return;
    }

    const blockingReason = window.activityManager.getBlockingReason(skillName.toLowerCase());
    if (blockingReason) {
        logMessage('Another activity is already active.');
        return;
    }

    const startResult = window.activityManager.startActivity({
        id: `${skillName}:${activity.name}`,
        type: skillName.toLowerCase(),
        displayName: activity.name,
        rewards: [{ itemId: activity.item?.name || 'unknown', quantity: activity.item?.quantity || 1 }],
        skill: skillName,
        skillXp: activity.experience || 0,
        cancellable: true,
        repeat: true,
        blocks: ['nonCombatPrimary'],
        context: { skillName, activity },
        getDurationMs: () => {
            const skillLevel = player.gatheringSkills?.[skillName]?.level || 1;
            return getModifiedActivityTime(activity, skillLevel) * 1000;
        },
        onComplete: () => performGatheringAction(skillName, activity),
    });

    if (!startResult.ok) {
        logMessage(startResult.reason || 'Unable to start activity.');
        return;
    }

    syncGatheringStateFromManager();
    if (skillName === 'Mining') {
        updateMiningActivePanel(skillName);
        highlightActiveMiningCard();
    }
}

function restoreGatheringActivity(savedActivity) {
    if (!savedActivity || !window.activityManager) return false;
    const skillName = savedActivity.skill || savedActivity.context?.skillName;
    const activityName = savedActivity.context?.activity?.name || savedActivity.displayName;
    const activity = gatheringActivities.find(candidate =>
        candidate.skillType === skillName && candidate.name === activityName
    );
    if (!skillName || !activity) return false;

    const result = window.activityManager.startActivity({
        id: savedActivity.id || `${skillName}:${activity.name}`,
        type: skillName.toLowerCase(),
        displayName: activity.name,
        rewards: [{ itemId: activity.item?.name || 'unknown', quantity: activity.item?.quantity || 1 }],
        skill: skillName,
        skillXp: activity.experience || 0,
        cancellable: true,
        repeat: true,
        blocks: ['nonCombatPrimary'],
        context: { skillName, activity },
        progressMs: Math.min(Number(savedActivity.progressMs || 0), Number(savedActivity.durationMs || Infinity)),
        completedCycles: Number(savedActivity.completedCycles || 0),
        getDurationMs: () => {
            const skillLevel = player.gatheringSkills?.[skillName]?.level || 1;
            return getModifiedActivityTime(activity, skillLevel) * 1000;
        },
        onComplete: () => performGatheringAction(skillName, activity)
    });
    if (result.ok) syncGatheringStateFromManager();
    return result.ok;
}

window.restoreGatheringActivity = restoreGatheringActivity;

function stopGatheringActivity() {
    if (!window.activityManager) return;
    const state = window.activityManager.getState();
    const active = state?.currentActivity;
    const isMiningActivity = Boolean(
        active && (active.skill === 'Mining' || active.type === 'mining')
    );
    if (!isMiningActivity) return;

    const label = active.displayName || 'activity';
    window.activityManager.cancelActivity('manualStop');
    syncGatheringStateFromManager();
    updateGatheringSkillDisplay('Mining');
    displaySkillActivities('Mining');
    logMessage(`You stop ${label}.`);
}

function displayGatheringLootPopup(message) {
    const container = document.getElementById('loot-popups-container');
    if (!container) {
        console.error('Loot popups container not found in the DOM.');
        return;
    }

    const popup = document.createElement('div');
    popup.classList.add('loot-popup');
    popup.textContent = message;
    container.appendChild(popup);

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            if (popup.parentNode) container.removeChild(popup);
        }, 500);
    }, 3000);
}

function performGatheringAction(skillName, activity) {
    const skillLevel = player.gatheringSkills?.[skillName]?.level || 1;
    const { yieldBonus, rareFindBonus } = getGatheringSkillBonuses(skillLevel);

    const itemTemplate = items.find(i => i.name === activity.item.name);
    if (itemTemplate) {
        const gatheredItem = generateItemInstance(itemTemplate);
        let baseQuantity = activity.item.quantity || 1;

        const yieldRoll = Math.random() * 100;
        if (yieldRoll < yieldBonus) {
            baseQuantity *= 2;
            displayGatheringLootPopup('Yield Bonus! Double resources!');
        }

        gatheredItem.quantity = baseQuantity;
        const added = addItemToInventory(gatheredItem);
        if (!added) {
            logMessage('Inventory full. Mining activity stopped.');
            return {
                ok: false,
                reason: 'Inventory full',
                alertMessage: 'Inventory full. Mining stopped.',
                alertSeverity: 'danger'
            };
        }

        const totalQuantity = inventory
            .filter(item => item.name === activity.item.name)
            .reduce((sum, item) => sum + item.quantity, 0);

        displayGatheringLootPopup(`You gathered ${activity.item.name}. (${totalQuantity})`);
    } else {
        console.error(`Item template not found for ${activity.item.name}`);
        return { ok: false, reason: 'Missing item template' };
    }

    if (activity.rareFind) {
        const rareFindRoll = Math.random() * 100;
        if (rareFindRoll < rareFindBonus) {
            const rareItemTemplate = items.find(i => i.name === activity.rareFind.name);
            if (rareItemTemplate) {
                const rareItem = generateItemInstance(rareItemTemplate);
                rareItem.quantity = activity.rareFind.quantity || 1;
                const addedRare = addItemToInventory(rareItem);
                if (!addedRare) {
                    logMessage('Inventory full. Mining activity stopped.');
                    return {
                        ok: false,
                        reason: 'Inventory full',
                        alertMessage: 'Inventory full. Mining stopped.',
                        alertSeverity: 'danger'
                    };
                }
                displayGatheringLootPopup(`Rare Find! You discovered ${activity.rareFind.name}!`);
            } else {
                console.error(`Rare item template not found for ${activity.rareFind.name}`);
            }
        }
    }

    gainGatheringExperience(skillName, activity.experience);
    updateGatheringSkillDisplay(skillName);
    return { ok: true };
}

function displaySkillActivities(skillName) {
    const skillLevel = player.gatheringSkills?.[skillName]?.level || 1;
    const skillXP = player.gatheringSkills?.[skillName]?.experience || 0;

    const activitiesContainer = document.getElementById(`${skillName.toLowerCase()}-activities`) ||
        document.getElementById('gathering-activities');

    if (!activitiesContainer) {
        console.error(`Activities container not found for ${skillName}`);
        return;
    }

    activitiesContainer.innerHTML = '';

    const activities = gatheringActivities
        .filter(act => act.skillType === skillName)
        .sort((a, b) => {
            const levelDiff = (a.requiredLevel || 1) - (b.requiredLevel || 1);
            return levelDiff !== 0 ? levelDiff : a.name.localeCompare(b.name);
        });

    if (activities.length === 0) {
        console.error(`No activities found for skill ${skillName}`);
        return;
    }

    const startLabel = getActivityStartLabel(skillName);
    const stopLabel = getActivityStopLabel(skillName);
    const skillBusy = isGathering &&
        currentActivity &&
        currentActivity.skillName === skillName;

    activities.forEach(activity => {
        const unlocked = !activity.requiredLevel ||
            (player.gatheringSkills &&
                player.gatheringSkills[skillName] &&
                player.gatheringSkills[skillName].level >= activity.requiredLevel);

        const card = document.createElement('div');
        const isActive = skillBusy && currentActivity.activity.name === activity.name;
        const isBlackedOut = skillBusy && !isActive;
        card.className = `activity-card ${unlocked ? 'unlocked' : 'locked'}${isActive ? ' active' : ''}${isBlackedOut ? ' mining-inactive' : ''}`;

        const buttonLabel = isActive ? stopLabel : startLabel;
        const buttonClass = isActive ? 'start-activity-btn stop-activity-btn' : 'start-activity-btn';
        const buttonDisabled = !unlocked || isBlackedOut;

        card.innerHTML = `
            <div class="activity-name">${activity.name}</div>
            <div class="activity-level">Requires ${skillName} Level ${activity.requiredLevel || 1}</div>
            <div class="activity-time">Time: ${activity.time}s</div>
            <div class="activity-yield">Yield: ${activity.item.name} x${activity.item.quantity || 1}</div>
            ${!unlocked ? `<div class="activity-requirement">Locked — reach level ${activity.requiredLevel}</div>` : ''}
            <button class="${buttonClass}" ${buttonDisabled ? 'disabled' : ''}>${buttonLabel}</button>
        `;

        const actionButton = card.querySelector('.start-activity-btn');
        if (actionButton && !buttonDisabled) {
            if (isActive) {
                actionButton.addEventListener('click', () => {
                    stopGatheringActivity();
                    if (window.playSound) playSound('UI_SELECT');
                });
            } else {
                actionButton.addEventListener('click', () => {
                    startGatheringActivity(skillName, activity);
                    logMessage(`You start ${activity.name}.`);
                    displaySkillActivities(skillName);
                    if (window.playSound) playSound('UI_SELECT');
                });
            }
        }

        activitiesContainer.appendChild(card);
    });

    if (skillName === 'Mining') {
        renderMiningProfile(skillLevel, skillXP);
        updateMiningActivePanel('Mining');
    } else {
        renderGenericSkillStats(skillName, skillLevel, skillXP);
    }
}

function gainGatheringExperience(skillName, experience) {
    if (!player.gatheringSkills[skillName]) {
        player.gatheringSkills[skillName] = { level: 1, experience: 0 };
    }

    const skill = player.gatheringSkills[skillName];
    const maxLevel = getGatheringSkillMaxLevel(skillName);
    let leveledUp = false;

    if (maxLevel && skill.level >= maxLevel) {
        skill.level = maxLevel;
        skill.experience = 0;
        return;
    }

    skill.experience += experience;

    let xpForNextLevel = getGatheringXPForNextLevel(skill.level);
    while (skill.experience >= xpForNextLevel) {
        if (maxLevel && skill.level >= maxLevel) {
            skill.level = maxLevel;
            skill.experience = 0;
            break;
        }

        skill.experience -= xpForNextLevel;
        skill.level += 1;
        leveledUp = true;
        logMessage(`Your ${skillName} skill has reached level ${skill.level}!`);

        if (maxLevel && skill.level >= maxLevel) {
            skill.level = maxLevel;
            skill.experience = 0;
            break;
        }

        xpForNextLevel = getGatheringXPForNextLevel(skill.level);
    }

    if (leveledUp && skillName === 'Mining' && typeof player.calculateStats === 'function') {
        player.calculateStats();
        if (typeof updatePlayerStatsDisplay === 'function') {
            updatePlayerStatsDisplay();
        }
    }
}

function getGatheringXPForNextLevel(level) {
    return 50 * Math.pow(1.5, level - 1);
}

function updateGatheringSkillStats() {
    const statsDiv = document.getElementById('gathering-skill-stats');
    if (!statsDiv) return;
    statsDiv.innerHTML = '';

    for (let skillName in player.gatheringSkills) {
        const skill = player.gatheringSkills[skillName];
        const skillInfo = document.createElement('p');
        skillInfo.textContent = `${skillName} Level: ${skill.level}, Experience: ${skill.experience.toFixed(0)}`;
        statsDiv.appendChild(skillInfo);
    }
}

function updateGatheringSkillDisplay(skillName) {
    const skill = player.gatheringSkills?.[skillName];
    if (!skill) return;

    const skillLevel = skill.level || 1;
    const skillXP = skill.experience || 0;

    if (skillName === 'Mining') {
        renderMiningProfile(skillLevel, skillXP);
        updateMiningActivePanel('Mining');
        highlightActiveMiningCard();
    } else {
        renderGenericSkillStats(skillName, skillLevel, skillXP);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    normalizeGatheringSkills(player);
    if (typeof player.calculateStats === 'function') {
        player.calculateStats();
    }
    updateGatheringSkillStats();

    if (player && player.gatheringSkills) {
        Object.keys(player.gatheringSkills).forEach(skillName => {
            const stopButton = document.getElementById(`stop-${skillName.toLowerCase()}`);
            if (stopButton) {
                stopButton.addEventListener('click', stopGatheringActivity);
            }
            displaySkillActivities(skillName);
        });
    }

    if (window.activityManager && typeof window.activityManager.subscribe === 'function') {
        window.activityManager.subscribe((state) => {
            syncGatheringStateFromManager(state);
            if (window.currentScreen === 'mining-screen') {
                const active = state?.currentActivity;
                const miningSig = (state?.active && active && (active.skill === 'Mining' || active.type === 'mining'))
                    ? `${active.id || active.displayName || 'mining'}`
                    : 'idle';
                if (miningSig !== lastMiningActivitySignature) {
                    lastMiningActivitySignature = miningSig;
                    displaySkillActivities('Mining');
                } else {
                    updateMiningActivePanel('Mining');
                    highlightActiveMiningCard();
                }
            }
        });
    } else {
        syncGatheringStateFromManager();
    }
});
