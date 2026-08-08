// Triggered effects, damage application, healing, regeneration, and buff cleanup.

// ============================================================================
// 7. EFFECTS & DAMAGE
// ============================================================================

function processEffects(entity, trigger, target, sourceDamage = 0) {
    // Comprehensive safety check
    if (!entity || !target) {
        console.warn(`processEffects: entity or target is null/undefined (trigger: ${trigger})`);
        return;
    }

    if (!entity.effects || !Array.isArray(entity.effects) || entity.effects.length === 0) {
        // No effects to process
        return;
    }

    const entityName = entity.name || 'Unknown entity';
    console.log(`Processing effects for ${entityName} with trigger '${trigger}'`);

    // Create a safe copy of the effects array to iterate through
    // in case effects are modified during processing
    const effectsCopy = [...entity.effects];

    for (const effect of effectsCopy) {
        // Skip invalid effects
        if (!effect || typeof effect !== 'object') {
            console.warn('Skipping invalid effect:', effect);
            continue;
        }
        if (effect.enabled === false) continue;

        if (effect.trigger === trigger) {
            // Make sure effect has a chance property
            let baseChance = Math.max(0, Number(effect.chance || 0)) / 100;

            // Apply efficiency modifiers based on trigger type and entity stats
            let efficiencyBonus = 0;
            if (entity.totalStats) {
                // Determine efficiency type based on the source of the effect
                if (effect.sourceSlot === 'bionic') {
                    efficiencyBonus = entity.totalStats.bionicEfficiency || 0;
                } else if (trigger === 'onHit' || trigger === 'onCritical') {
                    // Weapon/attack effects - use weapon efficiency
                    efficiencyBonus = entity.totalStats.weaponEfficiency || 0;
                } else if (trigger === 'whenHit') {
                    // Defensive effects - use armor efficiency
                    efficiencyBonus = entity.totalStats.armorEfficiency || 0;
                }
            }

            // Apply efficiency bonus (additive percentage)
            const modifiedChance = baseChance + (baseChance * efficiencyBonus / 100);
            const finalChance = Math.min(modifiedChance, 1.0); // Cap at 100%

            try {
                // Check if the effect activates based on modified chance
                if (Math.random() < finalChance) {
                    console.log(`Effect triggered with ${(finalChance * 100).toFixed(1)}% chance (base: ${Number(effect.chance || 0).toFixed(1)}%, efficiency bonus: ${efficiencyBonus}%):`, effect);
                    executeEffectAction(effect, entity, target, sourceDamage);
                } else {
                    console.log(`Effect did not trigger (${(finalChance * 100).toFixed(1)}% chance).`);
                }
            } catch (error) {
                console.error(`Error processing effect:`, effect, error);
            }
        }
    }
}

function executeEffectAction(effect, source, target, sourceDamage = 0) {
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

        case 'applyDebuff':
            const debuffName = params.debuffName;
            const duration = params.duration;
            const useSourceDamage = params.useSourceDamage || false;
            let debuffSourceDamage = 0;

            // If useSourceDamage is true, use the damage from the current attack
            if (useSourceDamage) {
                debuffSourceDamage = sourceDamage || 0;
            }

            // Apply the debuff to the target
            if (typeof applyDebuff === 'function') {
                applyDebuff(target, debuffName, source, debuffSourceDamage);
                console.log(`Applied ${debuffName} debuff to ${target.name} with source damage: ${debuffSourceDamage}`);
            } else {
                console.warn('applyDebuff function not found');
            }
            break;

        // Add more cases as needed

        default:
            console.warn(`Unknown effect action: ${effect.action}`);
    }
}

// Function to apply damage to target
function applyDamage(target, damage, targetName, damageTypes = null) {
    if (!target) return 0;

    // Handle the case where damage is not a number (might be an object or null)
    if (typeof damage !== 'number' || isNaN(damage)) {
        console.error("Invalid damage value in applyDamage:", damage);
        damage = 0;
    }

    // Apply damage to shield first if available
    let remainingDamage = damage;
    let shieldDamage = 0;

    if (target.currentShield > 0) {
        shieldDamage = Math.min(target.currentShield, remainingDamage);
        target.currentShield -= shieldDamage;
        remainingDamage -= shieldDamage;

        // Animate shield damage
        // Determine crit/debuff styling from global flags set by damage origin
        animateShieldBarChunk(target, shieldDamage, !!window.__lastIsCrit, !!window.__lastIsDebuff);
    }

    // Then apply remaining damage to health
    if (remainingDamage > 0) {
        target.currentHealth = Math.max(0, target.currentHealth - remainingDamage);

        // Animate health damage
        animateHpBarChunk(target, remainingDamage, !!window.__lastIsCrit, !!window.__lastIsDebuff);
    }

    // Format damage types for display
    let damageMessage = '';
    const totalDamage = shieldDamage + (remainingDamage > 0 ? remainingDamage : 0);

    if (damageTypes && typeof damageTypes === 'object') {
        // Create a damage breakdown message
        let parts = [];
        for (const type in damageTypes) {
            if (type !== 'total' && damageTypes[type] > 0) {
                // Use getDamageTypeColor and capitalize from stats.js if available
                const typeColor = typeof getDamageTypeColor === 'function' ? getDamageTypeColor(type) : '#FFFFFF';
                const capType = typeof capitalize === 'function' ? capitalize(type) : type;
                parts.push(`<span style="color: ${typeColor};">${Math.round(damageTypes[type])} ${capType}</span>`);
            }
        }

        if (parts.length > 0) {
            damageMessage = parts.join(' + ');
        } else {
            damageMessage = `${Math.round(totalDamage)}`;
        }
    } else {
        damageMessage = `${Math.round(totalDamage)}`;
    }

    // Display damage in combat log
    if (typeof addToCombatLog === 'function') {
        addToCombatLog(`${targetName} takes ${damageMessage} damage!`, null, false);
    } else {
        logMessage(`${targetName} takes ${damageMessage} damage!`);
    }

    // Display popup; pass source flag (attacker) and dominant damage type for tinting
    const isFromPlayer = !target.isPlayer; // if target is player, source is enemy; else player
    let dominantType = 'neutral';
    if (damageTypes && typeof damageTypes === 'object') {
        let maxVal = -1;
        for (const t in damageTypes) {
            if (t === 'total') continue;
            const v = Number(damageTypes[t]) || 0;
            if (v > maxVal) { maxVal = v; dominantType = t.toLowerCase(); }
        }
    }
    // Removed floating toaster popups per request

    // Update HP/Shield UI
    updateHPESBars(target, target.isPlayer);

    // Try to apply a debuff based on the damage type that was dealt
    if (window.tryApplyDebuffFromDamage && damageTypes) {
        // Get the attacker (source) based on which entity is taking damage
        const source = target.isPlayer ? enemy : player;

        // Add total damage to the damageTypes object
        if (typeof damageTypes === 'object') {
            const damageInfo = { ...damageTypes, total: totalDamage };

            // Call the debuff application function with proper damage info
            window.tryApplyDebuffFromDamage(source, target, damageInfo);
        }
    }

    // Check if entity died
    if (target.currentHealth <= 0) {
        if (target.isPlayer) {
            stopCombat("playerDefeated");
        } else {
            // Award XP from the defeated enemy before combat state is cleared
            try {
                const xpVal = (typeof target.experienceValue === 'number') ? target.experienceValue : 0;
                awardXPWithZonePenalty(xpVal, target.name, target);
            } catch (e) { /* ignore */ }
            stopCombat("enemyDefeated");
        }
    }

    return totalDamage;
}

function applyEffectDamage(target, amount, damageType, ignoreDefense = false, sourceInfo = null) {
    if (!target) return;

    // Ensure amount is a number
    amount = parseFloat(amount) || 0;
    if (amount <= 0) return;

    // Round to 1 decimal place for display
    const displayAmount = Math.round(amount * 10) / 10;

    // Apply defense calculations if not ignoring defense
    if (!ignoreDefense && target.totalStats && target.totalStats.defenseTypes) {
        // Use the centralized function from stats.js if available
        const defenseType = typeof matchDamageToDefense === 'function' ? matchDamageToDefense(damageType) : '';
        if (defenseType && target.totalStats.defenseTypes[defenseType]) {
            const defense = target.totalStats.defenseTypes[defenseType];
            const effectiveDefense = Math.min(defense, 80); // Hard cap effective resistance at 80%
            amount = Math.max(0, amount * (1 - (effectiveDefense / 100)));
        }
    }

    // Apply the damage
    if (target.currentShield > 0) {
        const shieldDamage = Math.min(target.currentShield, amount);
        target.currentShield -= shieldDamage;
        amount -= shieldDamage;

        // Animate shield damage
        animateShieldBarChunk(target, shieldDamage);
    }

    if (amount > 0) {
        target.currentHealth = Math.max(0, target.currentHealth - amount);

        // Animate health damage
        animateHpBarChunk(target, amount);
    }

    // Create a source description for the log
    let sourceDesc = "";
    if (sourceInfo) {
        sourceDesc = ` from ${sourceInfo}`;
    } else if (damageType) {
        // Use capitalize from stats.js if available
        let capType = typeof capitalize === 'function' ? capitalize(damageType) : damageType;
        sourceDesc = ` from ${capType} effect`;
    }

    // Log the damage with source information
    const targetName = target.name || (target.isPlayer ? "Player" : "Enemy");

    // Format the message with damage type color (use function from stats.js if available)
    let damageTypeColor = typeof getDamageTypeColor === 'function' ? getDamageTypeColor(damageType) : '#FFFFFF';
    // Use capitalize from stats.js if available
    let capType = typeof capitalize === 'function' ? capitalize(damageType || "unknown") : (damageType || "unknown");

    const message = `${targetName} takes <span style="color: ${damageTypeColor}; font-weight: bold;">${displayAmount} ${capType}</span> damage${sourceDesc}`;

    // Add to the combat log
    addToCombatLog(message);

    // Update UI
    updateHPESBars(target, target.isPlayer);

    // Check if target died
    if (target.currentHealth <= 0) {
        if (target.isPlayer) {
            stopCombat("playerDefeated");
        } else {
            // Award per-enemy experience on death BEFORE clearing enemy in stopCombat
            try {
                const defeatedEnemy = enemy; // snapshot
                const baseXp = (defeatedEnemy && typeof defeatedEnemy.experienceValue === 'number') ? defeatedEnemy.experienceValue : 0;
                awardXPWithZonePenalty(baseXp, defeatedEnemy?.name, defeatedEnemy);
            } catch (e) { /* ignore */ }
            stopCombat("enemyDefeated");
        }
    }
}

function healEntity(entity, amount) {
    if (!entity || !entity.totalStats) return; // Safety check
    entity.currentHealth = Math.min(entity.totalStats.health, entity.currentHealth + amount);
    // Use addToCombatLog for consistency
    addToCombatLog(`${entity.name} heals for ${Math.round(amount)} HP.`, '#48bf91'); // Green color
    if (entity === player) {
        updatePlayerStatsDisplay();
    } else if (entity === enemy) {
        updateEnemyStatsDisplay();
    }
}

function startHealthRegen() {
    // Clear any existing interval to prevent multiple intervals
    if (healthRegenInterval) {
        clearInterval(healthRegenInterval);
        healthRegenInterval = null;
        console.log("Clearing existing health regeneration timer");
    }

    console.log("Starting health regeneration timer. isDelveInProgress: " + isDelveInProgress);
    console.log("Player health regen rate: " + player.totalStats.healthRegen + " per second");

    // Regenerate health every 200 milliseconds, but with special rules for delves
    healthRegenInterval = setInterval(() => {

        // Otherwise apply normal health regeneration
        if (player.currentHealth < player.totalStats.health) {
            const regenPerTick = player.totalStats.healthRegen / 5;
            // (Assuming healthRegen is per second, 5 ticks/sec -> 200ms each)

            player.currentHealth += regenPerTick;
            if (player.currentHealth > player.totalStats.health) {
                player.currentHealth = player.totalStats.health;
            }
            updatePlayerStatsDisplay();
        }
    }, 200);
}

function stopHealthRegen() {
    if (healthRegenInterval) {
        clearInterval(healthRegenInterval);
        healthRegenInterval = null;
        console.log("Health regeneration stopped");
    }
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
        if (entity === player) {
            entity.calculateStats();
            updatePlayerStatsDisplay();
        } else if (entity === enemy) {
            // Use calculateEnemyStats if available
            if (typeof calculateEnemyStats === 'function') {
                calculateEnemyStats(enemy);
            }
            updateEnemyStatsDisplay();
        }
    }
}

function clearBuffs(entity) {
    if (!entity) return;

    // Clear buffs
    if (entity.activeBuffs && entity.activeBuffs.length > 0) {
        entity.activeBuffs = [];
    }

    // Clear debuffs if they exist
    if (entity.activeDebuffs && entity.activeDebuffs.length > 0) {
        // Call onRemove for each debuff before clearing
        for (const debuff of entity.activeDebuffs) {
            if (debuff.onRemove) {
                debuff.onRemove(entity);
            }
        }
        entity.activeDebuffs = [];
    }

    // Recalculate stats for the entity
    if (entity === player) {
        entity.calculateStats();
        updatePlayerStatsDisplay();
    } else if (entity === enemy) {
        // Use the centralized function to recalculate enemy stats
        if (typeof calculateEnemyStats === 'function') {
            calculateEnemyStats(enemy);
        } else {
            console.error("calculateEnemyStats function not found during clearBuffs!");
        }
        updateEnemyStatsDisplay();
    }
}
