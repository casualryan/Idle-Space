// Player/enemy attacks, hit hooks, criticals, and combo resolution.

// ============================================================================
// 4. ACTIONS
// ============================================================================

function refreshPlayerAttackInterval() {
    if (!player) return;
    playerNextAttackTime = typeof getPlayerAttackInterval === 'function'
        ? getPlayerAttackInterval(player)
        : 1 / (player.totalStats?.attackSpeed || 1);
}

function runSkillHitProcs(attacker, defender, damageResult, profile, hitIndex) {
    if (!attacker || !defender) return;

    attacker.effects = attacker.effects || [];
    defender.effects = defender.effects || [];

    if (attacker.effects.length > 0) {
        if (typeof shouldProcOnHit === 'function' && shouldProcOnHit(profile, 'onHit', hitIndex)) {
            processEffects(attacker, 'onHit', defender);
        }
        if (damageResult.isCritical && typeof shouldProcOnHit === 'function' && shouldProcOnHit(profile, 'onCritical', hitIndex)) {
            processEffects(attacker, 'onCritical', defender, damageResult.total);
        }
    }

    if (damageResult.isCritical) {
        tryApplySeveredLimbFromCritical(attacker, defender);
    }

    if (defender.effects && defender.effects.length > 0) {
        processEffects(defender, 'whenHit', attacker);
    }

}

function runIncomingHitDebuffs(attacker, defender, damageResult) {
    if (!Array.isArray(defender?.activeDebuffs)) return;

    const hit = {
        ...(damageResult?.damageBreakdown || {}),
        total: Math.max(0, Number(damageResult?.total || 0))
    };

    // Hooks may remove themselves. Iterate a snapshot so one consumed debuff
    // cannot cause the next debuff in the live array to be skipped.
    for (const debuff of [...defender.activeDebuffs]) {
        if (typeof debuff?.onReceiveHit === 'function') {
            debuff.onReceiveHit(defender, hit, attacker);
        }
    }
}

function tryApplySeveredLimbFromCritical(attacker, defender) {
    const chance = Math.max(0, Number(attacker?.totalStats?.severedLimbChance || 0));
    if (!defender || chance <= 0 || Math.random() * 100 >= chance) return false;
    return typeof applyDebuff === 'function'
        ? applyDebuff(defender, 'severedLimb', attacker)
        : false;
}

function runPreAttackDebuffs(attacker, defender) {
    if (!Array.isArray(attacker?.activeDebuffs)) return true;
    for (const debuff of [...attacker.activeDebuffs]) {
        if (typeof debuff?.onBeforeAttack !== 'function') continue;
        if (debuff.onBeforeAttack(attacker, defender) === false) return false;
    }
    return true;
}

function runPostAttackDebuffs(attacker, defender, damageResult) {
    if (!Array.isArray(attacker?.activeDebuffs)) return;
    for (const debuff of [...attacker.activeDebuffs]) {
        if (typeof debuff?.onAfterAttack === 'function') {
            debuff.onAfterAttack(attacker, defender, damageResult);
        }
    }
}

function executeEquippedSkill(attacker, defender) {
    if (!isCombatActive) {
        console.log("executeEquippedSkill called but combat is not active");
        return;
    }

    if (!attacker || !defender) {
        console.warn("executeEquippedSkill called but attacker or defender is null");
        return;
    }

    if (!ensureEntityInitialization(attacker, attacker === player) || !ensureEntityInitialization(defender, defender === player)) {
        console.warn("Entity initialization failed in executeEquippedSkill");
        return;
    }

    try {
        if (!runPreAttackDebuffs(attacker, defender)) return;

        const profile = typeof resolveSkillProfile === 'function'
            ? resolveSkillProfile(attacker)
            : { hitCount: 1, damageMultiplier: 1, displayName: 'Attack', comboAfterSkill: true, comboProcStrength: 0, debuffApplyBonus: 0 };

        attacker._activeSkillDebuffBonus = profile.debuffApplyBonus || 0;

        let lastDamageResult = null;
        const attackDamageResult = {
            total: 0,
            damageBreakdown: {},
            isCritical: false
        };
        const attackerLabel = attacker.name || 'Player';
        const defenderName = defender.name || 'Enemy';

        for (let hit = 0; hit < profile.hitCount; hit++) {
            if (!isCombatActive || !attacker || !defender) break;

            const hitCtx = typeof buildHitContext === 'function'
                ? buildHitContext(profile, hit)
                : { damageMultiplier: profile.damageMultiplier };

            let damageResult;
            if (typeof calculateDamage === 'function') {
                damageResult = calculateDamage(attacker, defender, hitCtx);
                window.__lastIsCrit = !!damageResult.isCritical;
                window.__lastIsDebuff = false;
            } else {
                damageResult = { total: 0, damageBreakdown: {}, isCritical: false };
            }

            if (typeof scaleDamageResult === 'function' && hitCtx.damageMultiplier !== 1) {
                damageResult = scaleDamageResult(damageResult, hitCtx.damageMultiplier);
            }

            if (typeof addToCombatLog === 'function' && damageResult.total > 0) {
                const critText = damageResult.isCritical
                    ? ' <span style="color: yellow; font-weight: bold;">(CRITICAL!)</span>'
                    : '';
                const hitLabel = profile.hitCount > 1
                    ? ` (${hit + 1}/${profile.hitCount})`
                    : '';
                addToCombatLog(
                    `${attackerLabel} — ${profile.displayName}${hitLabel} for ${damageResult.total} damage${critText}`,
                    '#ffffff',
                    false
                );
            }

            if (!defender) break;

            applyDamage(defender, damageResult.total, defenderName, damageResult.damageBreakdown);

            if (!attacker || !defender) break;

            runIncomingHitDebuffs(attacker, defender, damageResult);
            if (!isCombatActive || !attacker || !defender) break;

            runSkillHitProcs(attacker, defender, damageResult, profile, hit);
            lastDamageResult = damageResult;
            attackDamageResult.total += damageResult.total;
            attackDamageResult.isCritical ||= damageResult.isCritical;
            for (const [damageType, amount] of Object.entries(damageResult.damageBreakdown || {})) {
                attackDamageResult.damageBreakdown[damageType] =
                    (attackDamageResult.damageBreakdown[damageType] || 0) + amount;
            }

            if (!defender) break;
        }

        attacker._activeSkillDebuffBonus = 0;
        if (lastDamageResult) {
            runPostAttackDebuffs(attacker, defender, attackDamageResult);
        }

        if (profile.comboAfterSkill !== false && lastDamageResult && attacker && defender) {
            processComboAttacks(attacker, defender, lastDamageResult, profile);
        }
    } catch (error) {
        console.error("Error in executeEquippedSkill:", error);
        if (attacker) attacker._activeSkillDebuffBonus = 0;
    }
}

// Function for player attack — always uses equipped combat skill
function playerAttack() {
    executeEquippedSkill(player, enemy);
}

function enemyAttack() {
    // Exit early if combat is no longer active
    if (!isCombatActive) {
        console.log("enemyAttack called but combat is not active");
        return;
    }

    // Additional safety checks
    if (!player || !enemy) {
        console.warn("enemyAttack called but player or enemy is null");
        return;
    }

    // Ensure entities are properly initialized
    if (!ensureEntityInitialization(player, true) || !ensureEntityInitialization(enemy, false)) {
        console.warn("Entity initialization failed in enemyAttack");
        return;
    }

    try {
        if (!runPreAttackDebuffs(enemy, player)) return;

        // Get damage calculation with breakdown using the centralized function
        let damageResult;
         if (typeof calculateDamage === 'function') {
             damageResult = calculateDamage(enemy, player);
             window.__lastIsCrit = !!damageResult.isCritical;
             window.__lastIsDebuff = false;
         } else {
             console.error("calculateDamage function not found!");
             damageResult = { total: 0, damageBreakdown: {}, isCritical: false }; // Default to no damage
         }

        // Add combat log entry for damage info
        if (typeof addToCombatLog === 'function' && damageResult.total > 0) {
            const critText = damageResult.isCritical ? ' <span style="color: yellow; font-weight: bold;">(CRITICAL!)</span>' : '';
            addToCombatLog(`${enemy.name} attacks for ${damageResult.total} damage${critText}`, '#ffffff', false);
        }

        // Check again if player is null before proceeding
        if (!player) {
            console.warn("Player became null during enemyAttack");
            return;
        }

        applyDamage(player, damageResult.total, "Player", damageResult.damageBreakdown);
        runIncomingHitDebuffs(enemy, player, damageResult);
        if (!isCombatActive || !player || !enemy) return;
        if (damageResult.isCritical) tryApplySeveredLimbFromCritical(enemy, player);
        runPostAttackDebuffs(enemy, player, damageResult);

        // Check again after damage application if entities still exist
        if (!player || !enemy) {
            console.warn("Entity became null after damage application in enemyAttack");
            return;
        }

        // Ensure both player and enemy have their effects arrays properly initialized
        player.effects = player.effects || [];
        enemy.effects = enemy.effects || [];

        // Process effects with explicit empty array check
        if (enemy && enemy.effects && Array.isArray(enemy.effects) && enemy.effects.length > 0) {
            processEffects(enemy, 'onHit', player);
        }

        // Check if player is still valid before proceeding
        if (!player) {
            console.warn("Player became null during effect processing");
            return;
        }

        if (player && player.effects && Array.isArray(player.effects) && player.effects.length > 0) {
            processEffects(player, 'whenHit', enemy);
        }

        // Process combo attacks for enemy
        processComboAttacks(enemy, player, damageResult);

    } catch (error) {
        console.error("Error in enemyAttack:", error);
    }
}

function processComboAttacks(attacker, defender, originalDamageResult, skillProfile = null) {
    // Safety checks
    if (!attacker || !defender || !attacker.totalStats) {
        return;
    }

    if (skillProfile && skillProfile.comboAfterSkill === false) {
        return;
    }

    // Check if attacker has combo attack chance
    const comboChance = attacker.totalStats.comboAttack || 0;
    if (comboChance <= 0) {
        return; // No combo attack chance
    }

    // Check if combo attack triggers
    if (Math.random() * 100 > comboChance) {
        return; // Combo attack didn't trigger
    }

    // Calculate number of combo hits
    const baseComboHits = 1; // Base 1 additional hit
    const additionalHits = Number(attacker.totalStats.additionalComboAttacks || 0);
    const totalComboHits = baseComboHits + additionalHits;

    // Calculate combo damage (base 20% of original damage)
    const baseComboDamagePercent = 20;
    const comboEffectiveness = attacker.totalStats.comboEffectiveness || 0;
    const finalComboDamagePercent = baseComboDamagePercent + comboEffectiveness;

    const attackerName = attacker.name || 'Unknown';
    const defenderName = defender.name || 'Unknown';

    console.log(`${attackerName} triggers combo attack! ${totalComboHits} additional hit(s) for ${finalComboDamagePercent}% damage each.`);

    // Add combat log entry
    if (typeof addToCombatLog === 'function') {
        addToCombatLog(`${attackerName} triggers combo attack! (${totalComboHits} hit${totalComboHits > 1 ? 's' : ''})`, '#ffaa00', false);
    }

    // Execute combo hits
    for (let i = 0; i < totalComboHits; i++) {
        // Check if combat is still active and entities exist
        if (!isCombatActive || !attacker || !defender) {
            break;
        }

        // Calculate combo damage for each hit type
        let totalComboDamage = 0;
        const comboDamageBreakdown = {};

        for (const damageType in originalDamageResult.damageBreakdown) {
            const originalDamage = originalDamageResult.damageBreakdown[damageType];
            const comboDamage = Math.round(originalDamage * finalComboDamagePercent / 100);

            if (comboDamage > 0) {
                comboDamageBreakdown[damageType] = comboDamage;
                totalComboDamage += comboDamage;
            }
        }

        // Apply combo damage (no proc effects for combo attacks)
        if (totalComboDamage > 0) {
            console.log(`Combo hit ${i + 1}/${totalComboHits}: ${totalComboDamage} damage`);

            // Add combat log entry for each combo hit
            if (typeof addToCombatLog === 'function') {
                addToCombatLog(`Combo hit ${i + 1}: ${totalComboDamage} damage`, '#ffcc66', false);
            }

            applyDamage(defender, totalComboDamage, defenderName, comboDamageBreakdown);
            runIncomingHitDebuffs(attacker, defender, {
                total: totalComboDamage,
                damageBreakdown: comboDamageBreakdown,
                isCritical: false
            });

            if (!isCombatActive || !attacker || !defender) break;

            const comboProcStrength = skillProfile?.comboProcStrength || 0;
            if (comboProcStrength > 0 && attacker.effects && attacker.effects.length > 0) {
                processComboHitProcs(attacker, defender, comboProcStrength);
            }
        }
    }
}

function processComboHitProcs(attacker, defender, procStrength) {
    if (!attacker?.effects?.length || procStrength <= 0) return;

    const effectsCopy = [...attacker.effects];
    for (const effect of effectsCopy) {
        if (!effect || effect.enabled === false || effect.trigger !== 'onHit') continue;

        let baseChance = Math.max(0, Number(effect.chance || 0)) / 100;
        let efficiencyBonus = 0;
        if (attacker.totalStats) {
            efficiencyBonus = effect.sourceSlot === 'bionic'
                ? (attacker.totalStats.bionicEfficiency || 0)
                : (attacker.totalStats.weaponEfficiency || 0);
        }
        const modifiedChance = (baseChance + (baseChance * efficiencyBonus / 100)) * procStrength;
        const finalChance = Math.min(modifiedChance, 1.0);

        if (Math.random() < finalChance) {
            try {
                executeEffectAction(effect, attacker, defender, 0);
            } catch (error) {
                console.error('Error processing combo proc effect:', effect, error);
            }
        }
    }
}

window.refreshPlayerAttackInterval = refreshPlayerAttackInterval;
window.executeEquippedSkill = executeEquippedSkill;
window.runIncomingHitDebuffs = runIncomingHitDebuffs;
