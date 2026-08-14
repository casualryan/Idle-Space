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
            processEffects(attacker, 'onHit', defender, damageResult);
        }
        if (damageResult.isCritical && typeof shouldProcOnHit === 'function' && shouldProcOnHit(profile, 'onCritical', hitIndex)) {
            processEffects(attacker, 'onCritical', defender, damageResult);
        }
    }

    if (damageResult.isCritical) {
        tryApplySeveredLimbFromCritical(attacker, defender);
    }

    if (defender.effects && defender.effects.length > 0) {
        processEffects(defender, 'whenHit', attacker, damageResult);
    }

}

function runIncomingHitDebuffs(attacker, defender, damageResult) {
    if (!Array.isArray(defender?.activeDebuffs)) return;

    const hit = {
        ...(damageResult?.damage || damageResult?.damageBreakdown || {}),
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
    const triggerCoefficient = Math.max(0, Number(attacker?._activeSkillProcCoefficient ?? 1));
    const chance = Math.max(0, Number(attacker?.totalStats?.severedLimbChance || 0)) * triggerCoefficient;
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

        const profile = typeof prepareCombatStyleAttack === 'function'
            ? prepareCombatStyleAttack(attacker, defender)
            : typeof resolveSkillProfile === 'function'
                ? resolveSkillProfile(attacker)
            : { hitCount: 1, damageMultiplier: 1, displayName: 'Attack', comboAfterSkill: true, comboProcStrength: 0, debuffApplyBonus: 0 };

        let lastDamageResult = null;
        const aggregateDamage = {};
        let aggregateTotal = 0;
        let aggregateCritical = false;
        const attackerLabel = attacker.name || 'Player';
        const defenderName = defender.name || 'Enemy';

        for (let hit = 0; hit < profile.hitCount; hit++) {
            if (!isCombatActive || !attacker || !defender) break;

            const hitCtx = typeof buildHitContext === 'function'
                ? buildHitContext(profile, hit)
                : { damageMultiplier: profile.damageMultiplier };
            attacker._activeSkillDebuffBonus = hitCtx.debuffApplyBonus || 0;
            attacker._activeSkillProcCoefficient = hitCtx.procCoefficient ?? profile.procCoefficient ?? 1;

            let damageResult;
            if (typeof calculateDamage === 'function') {
                damageResult = calculateDamage(attacker, defender, hitCtx);
            } else {
                damageResult = createDamagePacket({
                    source: attacker,
                    target: defender,
                    damage: {},
                    total: 0,
                    tags: ['hit']
                });
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

            if (attacker?.isPlayer && typeof queuePlayerAttackPresentation === 'function') {
                queuePlayerAttackPresentation(attacker, defender, damageResult, {
                    hitIndex: hit,
                    hitCount: profile.hitCount
                });
            }
            applyDamage(damageResult);

            if (defender.currentHealth > 0 && attacker && defender) {
                runIncomingHitDebuffs(attacker, defender, damageResult);
                if (isCombatActive && attacker && defender) {
                    runSkillHitProcs(attacker, defender, damageResult, profile, hit);
                    if (typeof recordCombatStyleHit === 'function') recordCombatStyleHit(profile, damageResult);
                }
            }

            // Weapon propagation is resolved from this hit's immutable roll and
            // critical result even when the primary target was defeated.
            if (attacker?.isPlayer && typeof resolveWeaponPropagation === 'function') {
                resolveWeaponPropagation(attacker, defender, damageResult, profile, hit);
            }

            lastDamageResult = damageResult;
            aggregateTotal += damageResult.total;
            aggregateCritical ||= damageResult.isCritical;
            for (const [damageType, amount] of Object.entries(damageResult.damage || {})) {
                aggregateDamage[damageType] = (aggregateDamage[damageType] || 0) + amount;
            }

            if (!defender || defender.currentHealth <= 0 || !isCombatActive) break;
        }

        attacker._activeSkillDebuffBonus = 0;
        attacker._activeSkillProcCoefficient = 1;
        let attackSummary = null;
        if (lastDamageResult) {
            attackSummary = createDamagePacket({
                source: attacker,
                target: defender,
                kind: 'attack-summary',
                damage: aggregateDamage,
                total: aggregateTotal,
                isCritical: aggregateCritical,
                tags: ['attack', 'summary']
            });
            runPostAttackDebuffs(attacker, defender, attackSummary);
            if (typeof finishCombatStyleAttack === 'function') finishCombatStyleAttack(attacker, defender, profile, attackSummary);
        }

        if (profile.comboAfterSkill !== false && lastDamageResult && attacker && defender?.currentHealth > 0) {
            processComboAttacks(attacker, defender, profile.comboFromAggregate && attackSummary ? attackSummary : lastDamageResult, profile);
        }
    } catch (error) {
        console.error("Error in executeEquippedSkill:", error);
        if (attacker) attacker._activeSkillDebuffBonus = 0;
        if (attacker) attacker._activeSkillProcCoefficient = 1;
    }
}

// Function for player attack — always uses equipped combat skill
function playerAttack() {
    const target = typeof getEffectivePlayerTarget === 'function' ? getEffectivePlayerTarget() : enemy;
    if (target) executeEquippedSkill(player, target);
}

function resolveEnemyAttackImpact(attacker, damageResult) {
    if (!isCombatActive || !player || player.currentHealth <= 0 || !attacker) return;

    if (typeof addToCombatLog === 'function' && damageResult.total > 0) {
        const critText = damageResult.isCritical ? ' <span style="color: yellow; font-weight: bold;">(CRITICAL!)</span>' : '';
        addToCombatLog(`${attacker.name} attacks for ${damageResult.total} damage${critText}`, '#ffffff', false);
    }

    applyDamage(damageResult);
    if (typeof recordCombatStyleIncomingHit === 'function') recordCombatStyleIncomingHit(player, attacker, damageResult);
    runIncomingHitDebuffs(attacker, player, damageResult);
    if (!isCombatActive || !player || !attacker) return;
    if (damageResult.isCritical) tryApplySeveredLimbFromCritical(attacker, player);
    runPostAttackDebuffs(attacker, player, damageResult);

    player.effects = player.effects || [];
    attacker.effects = attacker.effects || [];
    if (attacker.effects.length > 0) processEffects(attacker, 'onHit', player, damageResult);
    if (!player) return;
    if (player.effects.length > 0) processEffects(player, 'whenHit', attacker, damageResult);
    processComboAttacks(attacker, player, damageResult);
}

function createEnemyAttackPresentationPacket(attacker, damageResult) {
    return createDamagePacket({
        source: attacker,
        target: player,
        kind: damageResult.kind,
        damage: damageResult.damage,
        total: damageResult.total,
        isCritical: damageResult.isCritical,
        damageRoll: damageResult.damageRoll,
        mitigated: damageResult.mitigated,
        tags: damageResult.tags,
        flags: { ...damageResult.flags, animate: false },
        metadata: damageResult.metadata
    });
}

function enemyAttack(attacker = enemy) {
    if (!isCombatActive || !player || !attacker || attacker.currentHealth <= 0) return;
    if (!ensureEntityInitialization(player, true) || !ensureEntityInitialization(attacker, false)) return;

    try {
        if (!runPreAttackDebuffs(attacker, player)) return;
        let damageResult = typeof calculateDamage === 'function'
            ? calculateDamage(attacker, player)
            : createDamagePacket({ source: attacker, target: player, damage: {}, total: 0, tags: ['hit'] });
        if (typeof modifyIncomingDamageForCombatStyle === 'function') {
            damageResult = modifyIncomingDamageForCombatStyle(player, attacker, damageResult);
        }

        const presentationPacket = createEnemyAttackPresentationPacket(attacker, damageResult);
        const presented = typeof queueEnemyAttackPresentation === 'function'
            && queueEnemyAttackPresentation(attacker, player, presentationPacket);
        resolveEnemyAttackImpact(attacker, presented ? presentationPacket : damageResult);
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

        const originalDamageMap = originalDamageResult.damage || originalDamageResult.damageBreakdown || {};
        for (const damageType in originalDamageMap) {
            const originalDamage = originalDamageMap[damageType];
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

            let comboPacket = createDamagePacket({
                source: attacker,
                target: defender,
                kind: 'combo',
                damage: comboDamageBreakdown,
                total: totalComboDamage,
                isCritical: false,
                tags: ['hit', 'combo']
            });
            if (defender === player && typeof modifyIncomingDamageForCombatStyle === 'function') {
                comboPacket = modifyIncomingDamageForCombatStyle(player, attacker, comboPacket);
            }
            applyDamage(comboPacket);
            if (defender === player && typeof recordCombatStyleIncomingHit === 'function') {
                recordCombatStyleIncomingHit(player, attacker, comboPacket);
            }
            runIncomingHitDebuffs(attacker, defender, comboPacket);

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
