// passivesUI.js

// Ensure the player's passive allocations exist
if (!player.passiveAllocations) {
    player.passiveAllocations = {};
}
if (typeof player.passivePoints === 'undefined') {
    player.passivePoints = 1;
}
const TIER_UNLOCK_THRESHOLD_INCREMENT = 3;
const MAX_PASSIVE_RANK = 4; // Maximum number of points that can be manually allocated

function getPassiveMaxEffectiveRank(passive) {
    const authoredCaps = [];
    for (const changes of Object.values(passive?.statChanges || {})) {
        if (Array.isArray(changes)) {
            authoredCaps.push(changes.length - 1);
            continue;
        }
        for (const nestedChanges of Object.values(changes || {})) {
            if (Array.isArray(nestedChanges)) authoredCaps.push(nestedChanges.length - 1);
        }
    }
    return authoredCaps.length ? Math.max(0, Math.min(...authoredCaps)) : MAX_PASSIVE_RANK;
}

function getInvestedPassivePointsBelowTier(tierNumber) {
    const tiersByName = new Map(passives.map(passive => [passive.name, passive.passiveTier]));
    return Object.entries(player.passiveAllocations || {}).reduce((total, [name, points]) => {
        return total + (Number(tiersByName.get(name)) < tierNumber ? Math.max(0, Number(points) || 0) : 0);
    }, 0);
}

// Initialize gear bonuses if they don't exist
if (!player.gearPassiveBonuses) {
    player.gearPassiveBonuses = {};
}

// Initialize passive bonus tracking objects if they don't exist
if (!player.passiveBonuses) {
    player.passiveBonuses = {
        // Percentage bonuses
        attackSpeed: 0,
        damageTypes: {},
        healthPercent: 0,
        energyShieldPercent: 0,
        criticalChance: 0,
        criticalMultiplier: 0,
        
        // Flat bonuses
        flatDamageTypes: {},
        flatHealth: 0,
        flatEnergyShield: 0,
        healthRegen: 0,
        precision: 0,
        deflection: 0,
        defenseTypes: {},
        damageGroups: {} // Add damage groups
    };
}

function getPassiveTooltipContent(passive) {
    const allocatedRank = player.passiveAllocations[passive.name] || 0;
    const gearBonus = player.gearPassiveBonuses[passive.name] || 0;
    const effectiveRank = allocatedRank + gearBonus;
    const maxEffectiveRank = getPassiveMaxEffectiveRank(passive);
    const wasted = Math.max(0, effectiveRank - maxEffectiveRank);
    
    let tip = `<div style="color: #e0f2ff; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 5px rgba(0, 255, 204, 0.5); max-width: 300px; white-space: normal;">`;
    
    // Passive name with gradient background
    tip += `<div style="background: linear-gradient(to right, #00306e, #003f8f); padding: 5px; margin-bottom: 6px; border-left: 3px solid #00ffcc; border-radius: 2px;">
            <strong style="font-size: 110%; color: #ffffff;">${passive.name}</strong>
            </div>`;
    
    // Description with styling
    tip += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">
            <em style="color: #7fdbff;">${passive.description}</em>
            </div>`;
    
    // Allocation info with styling
    tip += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">
            <span style="color: #56cfe1;">Allocated:</span> ${allocatedRank}/${MAX_PASSIVE_RANK}`;
    
    if (gearBonus > 0) {
        tip += ` <span style="color:#00ffcc">(+${gearBonus} from gear)</span>`;
    }
    tip += `</div>`;
    
    // Overcap note
    if (wasted > 0) {
        tip += `<div style="background: rgba(60, 0, 20, 0.45); padding: 4px; margin-bottom: 6px; border-radius: 2px; border-left: 2px solid #ff6b6b; color:#ffd6d9;">` +
               `Overcap: +${wasted} provides no additional benefit (cap ${maxEffectiveRank}).` +
               `</div>`;
    }
    
    // Current bonus with styling
    tip += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
    tip += `<span style="color: #ffd166;">Current Bonus:</span>`;
    
    // Display different bonus types differently
    let hasAddedStats = false;
    for (const statCategory in passive.statChanges) {
        if (hasAddedStats) tip += `<br>`;
        hasAddedStats = true;
        
        const changes = passive.statChanges[statCategory];
        
        switch (statCategory) {
            case 'attackSpeed':
                const speedValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${speedValue}% Attack Speed</span></div>`;
                break;
                
            case 'criticalChance':
                const critChanceValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${critChanceValue}% Critical Strike Chance</span></div>`;
                break;
                
            case 'criticalMultiplier':
                const critMultValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${critMultValue.toFixed(2)} Critical Strike Multiplier</span></div>`;
                break;
                
            case 'healthPercent':
                const healthPercentValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${healthPercentValue}% Maximum Health</span></div>`;
                break;
                
            case 'energyShieldPercent':
                const shieldPercentValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${shieldPercentValue}% Maximum Energy Shield</span></div>`;
                break;
                
            case 'flatHealth':
                const healthValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${healthValue} Maximum Health</span></div>`;
                break;
                
            case 'flatEnergyShield':
                const shieldValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${shieldValue} Maximum Energy Shield</span></div>`;
                break;
                
            case 'healthRegen':
                const regenValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${regenValue.toFixed(1)} Health Regeneration per Second</span></div>`;
                break;
                
            case 'precision':
                const precisionValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${precisionValue} Precision</span></div>`;
                break;
                
            case 'deflection':
                const deflectionValue = changes[Math.min(effectiveRank, changes.length - 1)];
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${deflectionValue} Deflection</span></div>`;
                break;
                
            case 'damageTypes':
                for (const damageType in changes) {
                    const damageValue = changes[damageType][Math.min(effectiveRank, changes[damageType].length - 1)];
                    tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${damageValue}% ${capitalize(damageType)} Damage</span></div>`;
                }
                break;
                
            case 'flatDamageTypes':
                for (const damageType in changes) {
                    const damageValue = changes[damageType][Math.min(effectiveRank, changes[damageType].length - 1)];
                    tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${damageValue} ${capitalize(damageType)} Damage</span></div>`;
                }
                break;
                
            case 'defenseTypes':
                for (const defenseType in changes) {
                    const defenseValue = changes[defenseType][Math.min(effectiveRank, changes[defenseType].length - 1)];
                    tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${defenseValue} ${formatDefenseTypeLabel(defenseType)}</span></div>`;
                }
                break;
                
            case 'damageGroups':
                for (const groupType in changes) {
                    const groupIndex = Math.min(effectiveRank, changes[groupType].length - 1);
                    const groupValue = changes[groupType][groupIndex];
                    tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${groupValue}% ${capitalize(groupType)} Damage</span></div>`;
                }
                break;
                
            default:
                tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">Unknown stat: ${statCategory}</span></div>`;
                break;
        }
    }
    
    // Show next level bonus if available
    const nextRank = effectiveRank + 1;
    let hasNextLevel = false;
    
    for (const statCategory in passive.statChanges) {
        const changes = passive.statChanges[statCategory];
        
        if (typeof changes === 'object' && Array.isArray(changes)) {
            if (nextRank < changes.length) {
                hasNextLevel = true;
            }
        } else if (typeof changes === 'object') {
            // For nested objects like damageTypes
            for (const subType in changes) {
                if (nextRank < changes[subType].length) {
                    hasNextLevel = true;
                    break;
                }
            }
        }
    }
    
    if (hasNextLevel && effectiveRank < maxEffectiveRank) {
        tip += `</div><div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
        tip += `<span style="color: #00ffcc;">Next Level Bonus:</span>`;
        
        let hasAddedNextStats = false;
        for (const statCategory in passive.statChanges) {
            const changes = passive.statChanges[statCategory];
            
            switch (statCategory) {
                case 'attackSpeed':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue}% Attack Speed</span></div>`;
                    }
                    break;
                    
                case 'criticalChance':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue}% Critical Strike Chance</span></div>`;
                    }
                    break;
                    
                case 'criticalMultiplier':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue.toFixed(2)} Critical Strike Multiplier</span></div>`;
                    }
                    break;
                    
                case 'healthPercent':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue}% Maximum Health</span></div>`;
                    }
                    break;
                    
                case 'energyShieldPercent':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue}% Maximum Energy Shield</span></div>`;
                    }
                    break;
                    
                case 'flatHealth':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue} Maximum Health</span></div>`;
                    }
                    break;
                    
                case 'flatEnergyShield':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue} Maximum Energy Shield</span></div>`;
                    }
                    break;
                    
                case 'healthRegen':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue.toFixed(1)} Health Regeneration per Second</span></div>`;
                    }
                    break;
                    
                case 'precision':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue} Precision</span></div>`;
                    }
                    break;
                    
                case 'deflection':
                    if (nextRank < changes.length) {
                        if (hasAddedNextStats) tip += `<br>`;
                        hasAddedNextStats = true;
                        const nextValue = changes[nextRank];
                        tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue} Deflection</span></div>`;
                    }
                    break;
                    
                case 'damageTypes':
                    for (const damageType in changes) {
                        if (nextRank < changes[damageType].length) {
                            if (hasAddedNextStats) tip += `<br>`;
                            hasAddedNextStats = true;
                            const nextValue = changes[damageType][nextRank];
                            tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue}% ${capitalize(damageType)} Damage</span></div>`;
                        }
                    }
                    break;
                    
                case 'flatDamageTypes':
                    for (const damageType in changes) {
                        if (nextRank < changes[damageType].length) {
                            if (hasAddedNextStats) tip += `<br>`;
                            hasAddedNextStats = true;
                            const nextValue = changes[damageType][nextRank];
                            tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue} ${capitalize(damageType)} Damage</span></div>`;
                        }
                    }
                    break;
                    
                case 'defenseTypes':
                    for (const defenseType in changes) {
                        if (nextRank < changes[defenseType].length) {
                            if (hasAddedNextStats) tip += `<br>`;
                            hasAddedNextStats = true;
                            const nextValue = changes[defenseType][nextRank];
                            tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue} ${formatDefenseTypeLabel(defenseType)}</span></div>`;
                        }
                    }
                    break;
                    
                case 'damageGroups':
                    for (const groupType in changes) {
                        if (nextRank < changes[groupType].length) {
                            if (hasAddedNextStats) tip += `<br>`;
                            hasAddedNextStats = true;
                            const nextValue = changes[groupType][nextRank];
                            tip += `<div style="padding: 2px 0;"><span style="color: #ffffff;">+${nextValue} ${capitalize(groupType)} Damage</span></div>`;
                        }
                    }
                    break;
                
                default:
                    break;
            }
        }
    } else {
        tip += `<span style="color: #ff6b6b;">Maxed</span>`;
    }
    
    tip += `</div></div>`;
    return tip;
}

function displayPassivesScreen() {
    const screen = document.getElementById('passives-screen');
    if (!screen) {
        console.error("passives-screen not found");
        return;
    }
    
    // Update the passive points display with a more sci-fi styling
    const pointsContainer = document.getElementById('player-passive-points-container');
    if (!pointsContainer) {
        const newPointsContainer = document.createElement('div');
        newPointsContainer.id = 'player-passive-points-container';
        newPointsContainer.className = 'passive-points-container';
        newPointsContainer.innerHTML = `
            <div class="passive-points-header">
                <div class="passive-points-icon"></div>
                <div class="passive-points-text">Neural Interface Points</div>
            </div>
            <div class="passive-points-value">${player.passivePoints}</div>
        `;
        
        // Insert at the top of the passives screen
        if (screen.firstChild) {
            screen.insertBefore(newPointsContainer, screen.firstChild);
        } else {
            screen.appendChild(newPointsContainer);
        }
    } else {
        const pointsValueElement = pointsContainer.querySelector('.passive-points-value');
        if (pointsValueElement) {
            pointsValueElement.textContent = player.passivePoints;
        }
    }
    
    // Update or hide the original points display
    const pointsSpan = document.getElementById('player-passive-points');
    if (pointsSpan) {
        pointsSpan.parentElement.style.display = 'none'; // Hide the original display
    }
    
    // Set up the tiers container
    const tiersContainer = document.getElementById('passive-tiers');
    if (!tiersContainer) return;
    tiersContainer.innerHTML = '';
    
    // Group passives by tier
    const tierMap = {};
    passives.forEach(passive => {
        if (!tierMap[passive.passiveTier]) {
            tierMap[passive.passiveTier] = [];
        }
        tierMap[passive.passiveTier].push(passive);
    });
    const sortedTiers = Object.keys(tierMap).map(Number).sort((a, b) => a - b);
    
    // Create and style each tier section
    sortedTiers.forEach(tierNum => {
        const tierDiv = document.createElement('div');
        tierDiv.className = 'passive-tier';
        tierDiv.style.marginBottom = '30px';
        
        // Create tier header with sci-fi styling
        const header = document.createElement('div');
        header.className = 'passive-tier-header';
        
        // Calculate if tier is unlocked
        const unlockThreshold = (tierNum - 1) * TIER_UNLOCK_THRESHOLD_INCREMENT;
        const investedBelowTier = getInvestedPassivePointsBelowTier(tierNum);
        const unlocked = investedBelowTier >= unlockThreshold;
        
        header.innerHTML = `
            <div class="tier-header-bg ${unlocked ? 'tier-unlocked' : 'tier-locked'}">
                <span class="tier-number">TIER ${tierNum}</span>
                ${unlocked ? '<span class="tier-status">UNLOCKED</span>' : `<span class="tier-status">LOCKED (${unlockThreshold - investedBelowTier} MORE POINTS NEEDED)</span>`}
            </div>
        `;
        tierDiv.appendChild(header);
        
        // Create container for passive cards with better grid layout
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'passive-cards-container';
        
        // Create and style each passive card
        tierMap[tierNum].forEach(passive => {
            const card = document.createElement('div');
            card.className = 'passive-card';
            
            const allocatedRank = player.passiveAllocations[passive.name] || 0;
            const gearBonus = player.gearPassiveBonuses[passive.name] || 0;
            const effectiveRank = allocatedRank + gearBonus;
            const maxEffectiveRank = getPassiveMaxEffectiveRank(passive);
            
            // Get passive name length to adjust styling
            const nameLength = passive.name.length;
            const fontSizeClass = nameLength > 12 ? 'long-name' : nameLength > 8 ? 'medium-name' : 'short-name';
            
            // Create card inner HTML with sci-fi styling
            const overcap = Math.max(0, effectiveRank - maxEffectiveRank);
            card.innerHTML = `
                <div class="passive-card-inner ${unlocked ? '' : 'locked'}">
                    <div class="passive-name ${fontSizeClass}">${passive.name}</div>
                    <div class="passive-rank">Rank: ${allocatedRank}/${MAX_PASSIVE_RANK}${gearBonus > 0 ? `<span class=\"gear-bonus\"> +${gearBonus}</span>` : ''}${overcap > 0 ? `<span class=\"gear-bonus overcap\"> (wasted +${overcap})</span>` : ''}</div>
                    <div class="passive-buttons">
                        <button class="passive-minus-btn" ${allocatedRank <= 0 ? 'disabled' : ''}>–</button>
                        <button class="passive-plus-btn" ${(!unlocked) || (player.passivePoints <= 0) || (allocatedRank >= MAX_PASSIVE_RANK) ? 'disabled' : ''}>+</button>
                    </div>
                </div>
            `;
            
            // Add event listeners to buttons
            const minusBtn = card.querySelector('.passive-minus-btn');
            const plusBtn = card.querySelector('.passive-plus-btn');
            
            minusBtn.addEventListener('click', () => {
                removePassivePoint(passive);
            });
            
            plusBtn.addEventListener('click', () => {
                investPassivePoint(passive);
            });
            
            // Set up tooltip
            card.setAttribute('data-has-tooltip', 'true');
            card.setAttribute('data-tooltip-source', 'passive-card');
            card.setAttribute('data-tooltip-content', getPassiveTooltipContent(passive));
            
            cardsContainer.appendChild(card);
        });
        
        tierDiv.appendChild(cardsContainer);
        tiersContainer.appendChild(tierDiv);
    });
    
    // Add final glow effect to tiers container
    const glowEffect = document.createElement('div');
    glowEffect.className = 'tiers-glow-effect';
    tiersContainer.appendChild(glowEffect);
}

function hidePassivesTooltip() {
    if (typeof window.forceHideTooltip === 'function') {
        window.forceHideTooltip();
    }
}

function refreshPassivesScreen() {
    resetGearPassiveBonuses();
    hidePassivesTooltip();
    displayPassivesScreen();
}

function openPassivesScreen() {
    showScreen('passives-screen');
}

function investPassivePoint(passive) {
    const current = player.passiveAllocations[passive.name] || 0;
    
    if (player.passivePoints <= 0) {
        logMessage("You have no passive points to spend!");
        return;
    }
    
    if (current >= MAX_PASSIVE_RANK) {
        logMessage(`${passive.name} is already at maximum allocatable rank.`);
        return;
    }
    
    // Save current health percentage before applying passive
    const healthPercent = player.currentHealth / player.totalStats.health;
    const shieldPercent = player.currentShield / (player.totalStats.energyShield || 1);
    
    player.passiveAllocations[passive.name] = current + 1;
    player.passivePoints--;
    logMessage(`Invested 1 point in ${passive.name} (now rank ${current + 1}).`);
    
    // Reset and reapply all passive bonuses from gear
    resetGearPassiveBonuses();
    applyAllPassivesToPlayer();
    
    // Restore health and shield to same percentage of new max value
    player.currentHealth = Math.round(player.totalStats.health * healthPercent);
    player.currentShield = Math.round(player.totalStats.energyShield * shieldPercent);
    
    hidePassivesTooltip();
    displayPassivesScreen();
}

function removePassivePoint(passive) {
    const current = player.passiveAllocations[passive.name] || 0;
    if (current <= 0) {
        logMessage(`No points to remove from ${passive.name}.`);
        return;
    }
    
    // Save current health percentage before removing passive
    const healthPercent = player.currentHealth / player.totalStats.health;
    const shieldPercent = player.currentShield / (player.totalStats.energyShield || 1);
    
    player.passiveAllocations[passive.name] = current - 1;
    player.passivePoints++;
    logMessage(`Removed 1 point from ${passive.name} (now rank ${current - 1}).`);
    
    // Reset and reapply all passive bonuses from gear
    resetGearPassiveBonuses();
    applyAllPassivesToPlayer();
    
    // Restore health and shield to same percentage of new max value
    // But never go below 1 health
    player.currentHealth = Math.max(1, Math.round(player.totalStats.health * healthPercent));
    player.currentShield = Math.round(player.totalStats.energyShield * shieldPercent);
    
    hidePassivesTooltip();
    displayPassivesScreen();
}

function applyAllPassivesToPlayer() {
    // Reset all passive bonuses to default values
    player.passiveBonuses = {
        // Percentage bonuses
        attackSpeed: 0,
        damageTypes: {},
        healthPercent: 0,
        energyShieldPercent: 0,
        criticalChance: 0,
        criticalMultiplier: 0,
        
        // Flat bonuses
        flatDamageTypes: {},
        flatHealth: 0,
        flatEnergyShield: 0,
        healthRegen: 0,
        precision: 0,
        deflection: 0,
        defenseTypes: {},
        damageGroups: {} // Add damage groups
    };
    
    // Process each passive that player has allocated points to
    for (const passName in player.passiveAllocations) {
        const allocatedCount = player.passiveAllocations[passName];
        if (!allocatedCount || allocatedCount <= 0) continue;
        
        const gearBonus = player.gearPassiveBonuses[passName] || 0;
        const totalCount = allocatedCount + gearBonus;
        
        const pData = passives.find(x => x.name === passName);
        if (!pData) continue;
        
        applyPassiveEffect(pData, totalCount);
    }
    
    // Also process passives that are only from gear
    for (const passName in player.gearPassiveBonuses) {
        // Skip if already processed above
        if (player.passiveAllocations[passName] && player.passiveAllocations[passName] > 0) continue;
        
        const gearBonus = player.gearPassiveBonuses[passName];
        if (!gearBonus || gearBonus <= 0) continue;
        
        const pData = passives.find(x => x.name === passName);
        if (!pData) continue;
        
        applyPassiveEffect(pData, gearBonus);
    }
    
    // Update the legacy passiveAttackSpeedBonus for compatibility
    player.passiveAttackSpeedBonus = player.passiveBonuses.attackSpeed / 100;
    
    // Recalculate player stats with all bonuses applied
    player.calculateStats();
}

function applyPassiveEffect(passive, level) {
    // Skip if no stat changes or invalid level
    if (!passive.statChanges || level < 1) return;
    
    // Make sure player.passiveBonuses exists
    if (!player.passiveBonuses) {
        player.passiveBonuses = {
            attackSpeed: 0,
            criticalChance: 0,
            criticalMultiplier: 0,
            precision: 0,
            deflection: 0,
            flatHealth: 0,
            flatEnergyShield: 0,
            healthRegen: 0,
            damageTypes: {},
            flatDamageTypes: {},
            defenseTypes: {},
            damageGroups: {} // Add damage groups
        };
    }
    
    // Ensure all subobjects exist
    if (!player.passiveBonuses.damageTypes) player.passiveBonuses.damageTypes = {};
    if (!player.passiveBonuses.flatDamageTypes) player.passiveBonuses.flatDamageTypes = {};
    if (!player.passiveBonuses.defenseTypes) player.passiveBonuses.defenseTypes = {};
    if (!player.passiveBonuses.damageGroups) player.passiveBonuses.damageGroups = {}; // Add damage groups
    
    // For each stat category in the passive
    for (const statCategory in passive.statChanges) {
        const changes = passive.statChanges[statCategory];
        
        switch (statCategory) {
            case 'attackSpeed':
                const speedIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.attackSpeed += changes[speedIndex];
                break;
                
            case 'criticalChance':
                const critChanceIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.criticalChance += changes[critChanceIndex];
                break;
                
            case 'criticalMultiplier':
                const critMultIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.criticalMultiplier += changes[critMultIndex];
                break;
                
            case 'healthPercent':
                const healthPercentIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.healthPercent += changes[healthPercentIndex];
                break;
                
            case 'energyShieldPercent':
                const shieldPercentIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.energyShieldPercent += changes[shieldPercentIndex];
                break;
                
            case 'flatHealth':
                const healthIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.flatHealth += changes[healthIndex];
                break;
                
            case 'flatEnergyShield':
                const shieldIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.flatEnergyShield += changes[shieldIndex];
                break;
                
            case 'healthRegen':
                const regenIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.healthRegen += changes[regenIndex];
                break;
                
            case 'precision':
                const precisionIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.precision += changes[precisionIndex];
                break;
                
            case 'deflection':
                const deflectionIndex = Math.min(level, changes.length - 1);
                player.passiveBonuses.deflection += changes[deflectionIndex];
                break;
                
            case 'damageTypes':
                for (const damageType in changes) {
                    if (!player.passiveBonuses.damageTypes[damageType]) {
                        player.passiveBonuses.damageTypes[damageType] = 0;
                    }
                    const dmgIndex = Math.min(level, changes[damageType].length - 1);
                    player.passiveBonuses.damageTypes[damageType] += changes[damageType][dmgIndex];
                }
                break;
                
            case 'flatDamageTypes':
                for (const damageType in changes) {
                    if (!player.passiveBonuses.flatDamageTypes[damageType]) {
                        player.passiveBonuses.flatDamageTypes[damageType] = 0;
                    }
                    const dmgIndex = Math.min(level, changes[damageType].length - 1);
                    player.passiveBonuses.flatDamageTypes[damageType] += changes[damageType][dmgIndex];
                }
                break;
                
            case 'defenseTypes':
                for (const defenseType in changes) {
                    if (!player.passiveBonuses.defenseTypes[defenseType]) {
                        player.passiveBonuses.defenseTypes[defenseType] = 0;
                    }
                    const defIndex = Math.min(level, changes[defenseType].length - 1);
                    player.passiveBonuses.defenseTypes[defenseType] += changes[defenseType][defIndex];
                }
                break;
                
            case 'damageGroups':
                for (const groupType in changes) {
                    if (!player.passiveBonuses.damageGroups[groupType]) {
                        player.passiveBonuses.damageGroups[groupType] = 0;
                    }
                    const groupIndex = Math.min(level, changes[groupType].length - 1);
                    player.passiveBonuses.damageGroups[groupType] += changes[groupType][groupIndex];
                }
                break;
                
            default:
                console.warn(`Unknown stat category: ${statCategory}`);
                break;
        }
    }
}

function formatDefenseTypeLabel(defenseType) {
    const labels = {
        physicalResistance: 'Physical Resistance',
        elementalResistance: 'Elemental Resistance',
        chemicalResistance: 'Chemical Resistance'
    };
    return labels[defenseType] || capitalize(defenseType);
}

window.refreshPassivesScreen = refreshPassivesScreen;
window.openPassivesScreen = openPassivesScreen;
