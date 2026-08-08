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

    const resolvedSourceDamage = isDamagePacket(sourceDamage)
        ? sourceDamage.total
        : Math.max(0, toFiniteCombatNumber(sourceDamage));
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
                    executeEffectAction(effect, entity, target, resolvedSourceDamage);
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

            applyEffectDamage(target, damage, damageType, ignoreDefense, null, source);
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
function coerceDamagePacket(packetOrTarget, legacyDamage, legacyTargetName, legacyDamageTypes) {
    if (isDamagePacket(packetOrTarget)) {
        return { packet: packetOrTarget, legacyCall: false };
    }

    const target = packetOrTarget;
    const inferredSource = target?.isPlayer
        ? (typeof enemy !== 'undefined' ? enemy : null)
        : (typeof player !== 'undefined' ? player : null);

    return {
        legacyCall: true,
        packet: createDamagePacket({
            source: inferredSource,
            target,
            kind: 'legacy',
            damage: legacyDamageTypes || {},
            total: legacyDamage,
            tags: ['hit', 'legacy'],
            metadata: { targetName: legacyTargetName }
        })
    };
}

function handleDefeatedCombatant(target) {
    if (!target || target.currentHealth > 0) return;

    if (target.isPlayer) {
        stopCombat('playerDefeated');
        return;
    }

    try {
        const xpValue = typeof target.experienceValue === 'number' ? target.experienceValue : 0;
        awardXPWithZonePenalty(xpValue, target.name, target);
    } catch (error) {
        console.error('Unable to award enemy defeat experience:', error);
    }
    stopCombat('enemyDefeated');
}

// Canonical entry point for applying a damage packet. The legacy positional
// signature remains available for old extensions while internal combat uses packets.
function applyDamage(packetOrTarget, legacyDamage = 0, legacyTargetName = null, legacyDamageTypes = null) {
    const { packet, legacyCall } = coerceDamagePacket(
        packetOrTarget,
        legacyDamage,
        legacyTargetName,
        legacyDamageTypes
    );
    assertDamagePacket(packet, 'applyDamage packet');

    const target = getCombatantEntity(packet.target);
    const targetName = packet.target.name || packet.metadata.targetName || 'Target';
    const before = {
        health: Math.max(0, toFiniteCombatNumber(target.currentHealth)),
        shield: Math.max(0, toFiniteCombatNumber(target.currentShield))
    };

    let remainingDamage = packet.total;
    let shieldDamage = 0;

    if (target.currentShield > 0) {
        shieldDamage = Math.min(target.currentShield, remainingDamage);
        target.currentShield -= shieldDamage;
        remainingDamage -= shieldDamage;

        if (packet.flags.animate) {
            animateShieldBarChunk(target, shieldDamage, packet.isCritical, packet.flags.isDebuff);
        }
    }

    const healthDamage = Math.min(before.health, Math.max(0, remainingDamage));
    if (remainingDamage > 0) {
        target.currentHealth = Math.max(0, target.currentHealth - remainingDamage);
        if (packet.flags.animate) {
            animateHpBarChunk(target, remainingDamage, packet.isCritical, packet.flags.isDebuff);
        }
    }

    const appliedDamage = shieldDamage + healthDamage;
    const overkill = Math.max(0, remainingDamage - healthDamage);
    const debuffsBefore = new Set((target.activeDebuffs || []).map(debuff => debuff.name));

    if (packet.flags.showDefaultLog) {
        const parts = [];
        for (const [type, amount] of Object.entries(packet.damage)) {
            if (amount <= 0) continue;
            const typeColor = typeof getDamageTypeColor === 'function' ? getDamageTypeColor(type) : '#FFFFFF';
            const label = typeof capitalize === 'function' ? capitalize(type) : type;
            parts.push(`<span style="color: ${typeColor};">${Math.round(amount)} ${label}</span>`);
        }
        const damageMessage = parts.length > 0 ? parts.join(' + ') : String(Math.round(packet.total));
        if (typeof addToCombatLog === 'function') {
            addToCombatLog(`${targetName} takes ${damageMessage} damage!`, null, false);
        } else if (typeof logMessage === 'function') {
            logMessage(`${targetName} takes ${damageMessage} damage!`);
        }
    }

    updateHPESBars(target, target.isPlayer);

    if (packet.flags.applyInherentDebuffs && window.tryApplyDebuffFromDamage && packet.total > 0) {
        window.tryApplyDebuffFromDamage(
            getCombatantEntity(packet.source),
            target,
            { ...packet.damage, total: packet.total }
        );
    }

    const debuffsAfter = (target.activeDebuffs || []).map(debuff => debuff.name);
    const application = createDamageApplicationResult(packet, {
        before,
        after: {
            health: target.currentHealth,
            shield: target.currentShield
        },
        shieldDamage,
        healthDamage,
        appliedDamage,
        overkill,
        targetDefeated: target.currentHealth <= 0,
        appliedDebuffs: debuffsAfter.filter(name => !debuffsBefore.has(name))
    });

    if (application.targetDefeated && packet.flags.handleDefeat) {
        handleDefeatedCombatant(target);
    }

    return legacyCall ? packet.total : application;
}

function applyEffectDamage(target, amount, damageType, ignoreDefense = false, sourceInfo = null, sourceEntity = null) {
    if (!target) return null;

    const rawAmount = Math.max(0, toFiniteCombatNumber(amount));
    if (rawAmount <= 0) return null;
    const displayAmount = Math.round(rawAmount * 10) / 10;
    let appliedAmount = rawAmount;

    if (!ignoreDefense && target.totalStats?.defenseTypes) {
        const defenseType = typeof matchDamageToDefense === 'function' ? matchDamageToDefense(damageType) : '';
        if (defenseType && target.totalStats.defenseTypes[defenseType]) {
            const defense = target.totalStats.defenseTypes[defenseType];
            const effectiveDefense = Math.min(defense, 80);
            appliedAmount = Math.max(0, appliedAmount * (1 - effectiveDefense / 100));
        }
    }

    const fallbackTypeLabel = typeof capitalize === 'function'
        ? capitalize(damageType || 'unknown')
        : String(damageType || 'unknown');
    const source = sourceEntity || { name: sourceInfo || `${fallbackTypeLabel} effect` };
    const packet = createDamagePacket({
        source,
        target,
        kind: 'effect',
        damage: { [damageType]: appliedAmount },
        total: appliedAmount,
        mitigated: !ignoreDefense,
        tags: ['effect', 'debuff'],
        flags: {
            applyInherentDebuffs: false,
            showDefaultLog: false,
            handleDefeat: false,
            isDebuff: true,
            ignoreDefense
        },
        metadata: { sourceInfo }
    });
    const application = applyDamage(packet);

    let sourceDescription = '';
    if (sourceInfo) {
        sourceDescription = ` from ${sourceInfo}`;
    } else if (damageType) {
        sourceDescription = ` from ${fallbackTypeLabel} effect`;
    }

    const targetName = target.name || (target.isPlayer ? 'Player' : 'Enemy');
    const damageTypeColor = typeof getDamageTypeColor === 'function' ? getDamageTypeColor(damageType) : '#FFFFFF';
    const damageTypeLabel = typeof capitalize === 'function' ? capitalize(damageType || 'unknown') : (damageType || 'unknown');
    addToCombatLog(
        `${targetName} takes <span style="color: ${damageTypeColor}; font-weight: bold;">${displayAmount} ${damageTypeLabel}</span> damage${sourceDescription}`
    );

    if (application.targetDefeated) handleDefeatedCombatant(target);

    return application;
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
