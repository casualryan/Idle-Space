// Weapon-family propagation rules, secondary packet construction, and atomic
// event recording. Gameplay resolves synchronously; combatUI presents the
// immutable event sequence afterward.

const PROPAGATION_TARGET_CAP = 5;
const PROPAGATION_TRIGGER_COEFFICIENT = 0.3;
const PROPAGATION_DAMAGE_TYPE_PRIORITY = Object.freeze([
    'kinetic', 'slashing', 'pyro', 'cryo', 'electric', 'corrosive', 'radiation'
]);
const PROPAGATION_SLOT_COORDINATES = Object.freeze([
    Object.freeze({ row: 0, column: 1 }), // top-center
    Object.freeze({ row: 0, column: 0 }), // top-left
    Object.freeze({ row: 0, column: 2 }), // top-right
    Object.freeze({ row: 1, column: 1 }), // bottom-center
    Object.freeze({ row: 1, column: 0 }), // bottom-left
    Object.freeze({ row: 1, column: 2 })  // bottom-right
]);

const WEAPON_PROPAGATION_PROFILES = Object.freeze({
    blades: Object.freeze({ id: 'cleave', label: 'Cleave', damageCoefficient: 0.55 }),
    impact: Object.freeze({ id: 'splash', label: 'Splash', damageCoefficient: 0.55 }),
    sidearms: Object.freeze({ id: 'barrage', label: 'Barrage', damageCoefficient: 0.45 }),
    rifles: Object.freeze({ id: 'chain', label: 'Chain', damageCoefficient: 0.35 }),
    projectors: Object.freeze({ id: 'barrage', label: 'Barrage', damageCoefficient: 0.45 }),
    ordnance: Object.freeze({ id: 'detonation', label: 'Detonation', damageCoefficient: 0.35 }),
    conduits: Object.freeze({ id: 'nova', label: 'Nova', damageCoefficient: 0.35 })
});

function getPropagationEntityKey(entity) {
    if (entity?.isPlayer) return 'player';
    return String(entity?._combatId || entity?.id || entity?.name || 'unknown');
}

function getPropagationSlotCoordinate(entity) {
    return PROPAGATION_SLOT_COORDINATES[Number(entity?._slotIndex)] || null;
}

function arePropagationSlotsAdjacent(left, right) {
    const leftCoordinate = getPropagationSlotCoordinate(left);
    const rightCoordinate = getPropagationSlotCoordinate(right);
    if (!leftCoordinate || !rightCoordinate) return false;
    return Math.abs(leftCoordinate.row - rightCoordinate.row)
        + Math.abs(leftCoordinate.column - rightCoordinate.column) === 1;
}

function getLivingPropagationEnemies() {
    return (Array.isArray(encounterEnemies) ? encounterEnemies : [])
        .filter(candidate => candidate && candidate.currentHealth > 0);
}

function pickPropagationCandidate(candidates, random = Math.random) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    const roll = Math.min(0.999999, Math.max(0, Number(random()) || 0));
    return candidates[Math.floor(roll * candidates.length)] || candidates[0];
}

function getDominantPropagationDamageType(packet) {
    const damage = packet?.metadata?.unmitigatedDamage || packet?.damage || {};
    let dominantType = 'kinetic';
    let dominantAmount = -1;
    for (const type of PROPAGATION_DAMAGE_TYPE_PRIORITY) {
        const amount = Math.max(0, Number(damage[type]) || 0);
        if (amount > dominantAmount) {
            dominantType = type;
            dominantAmount = amount;
        }
    }
    return dominantType;
}

function getPlayerWeaponPropagationProfile(attacker) {
    if (!attacker?.isPlayer) return null;
    const weapon = attacker.equipment?.mainHand;
    if (!weapon) return null;
    const taxonomy = window.coreboundWeaponTaxonomy?.resolveWeapon?.(weapon);
    const family = taxonomy?.family || attacker.totalStats?.activeWeaponFamily || weapon.weaponFamily;
    const definition = WEAPON_PROPAGATION_PROFILES[family];
    if (!definition) return null;
    const addedTargets = Math.max(0, Math.floor(Number(attacker.totalStats?.propagationTargets || 0)));
    return Object.freeze({
        ...definition,
        family,
        targetCount: Math.min(PROPAGATION_TARGET_CAP, 1 + addedTargets),
        triggerCoefficient: PROPAGATION_TRIGGER_COEFFICIENT
    });
}

function getCleavePropagationTargets(primaryTarget) {
    const primaryCoordinate = getPropagationSlotCoordinate(primaryTarget);
    if (!primaryCoordinate) return [];
    const living = getLivingPropagationEnemies().filter(candidate => candidate !== primaryTarget);
    const byDistance = (left, right, originColumn) => {
        const leftCoordinate = getPropagationSlotCoordinate(left);
        const rightCoordinate = getPropagationSlotCoordinate(right);
        return Math.abs(leftCoordinate.column - originColumn) - Math.abs(rightCoordinate.column - originColumn)
            || leftCoordinate.column - rightCoordinate.column;
    };
    const sameRow = living
        .filter(candidate => getPropagationSlotCoordinate(candidate)?.row === primaryCoordinate.row)
        .sort((left, right) => byDistance(left, right, primaryCoordinate.column));
    const oppositeRow = living
        .filter(candidate => getPropagationSlotCoordinate(candidate)?.row !== primaryCoordinate.row)
        .sort((left, right) => byDistance(left, right, primaryCoordinate.column));
    const oppositeSameColumn = oppositeRow.filter(candidate => (
        getPropagationSlotCoordinate(candidate)?.column === primaryCoordinate.column
    ));
    const oppositeRemaining = oppositeRow.filter(candidate => (
        getPropagationSlotCoordinate(candidate)?.column !== primaryCoordinate.column
    ));
    return [...sameRow, ...oppositeSameColumn, ...oppositeRemaining];
}

function createPropagationPacket(attacker, target, primaryPacket, profile, eventIndex) {
    const rawSource = primaryPacket?.metadata?.unmitigatedDamage || primaryPacket?.damage || {};
    const rawDamage = Object.fromEntries(Object.entries(rawSource).map(([type, amount]) => [
        type,
        Math.max(0, Number(amount) || 0) * profile.damageCoefficient
    ]));
    const mitigated = typeof mitigateDamageMapForTarget === 'function'
        ? mitigateDamageMapForTarget(attacker, target, rawDamage)
        : { damage: rawDamage, total: Math.round(Object.values(rawDamage).reduce((sum, amount) => sum + amount, 0)) };
    return createDamagePacket({
        source: attacker,
        target,
        kind: 'propagation',
        damage: mitigated.damage,
        total: mitigated.total,
        isCritical: Boolean(primaryPacket?.isCritical),
        damageRoll: Number(primaryPacket?.damageRoll || 0),
        mitigated: true,
        tags: ['hit', 'propagation', profile.id],
        flags: {
            animate: false,
            showDefaultLog: false,
            handleDefeat: false,
            applyInherentDebuffs: true
        },
        metadata: {
            unmitigatedDamage: rawDamage,
            propagation: {
                family: profile.family,
                type: profile.id,
                index: eventIndex,
                damageCoefficient: profile.damageCoefficient,
                triggerCoefficient: profile.triggerCoefficient
            }
        }
    });
}

function resolvePropagationHit(attacker, target, primaryPacket, profile, combatStyleProfile, hitIndex, eventIndex) {
    const previousProcCoefficient = attacker._activeSkillProcCoefficient;
    attacker._activeSkillProcCoefficient = profile.triggerCoefficient;
    try {
        const packet = createPropagationPacket(attacker, target, primaryPacket, profile, eventIndex);
        const application = applyDamage(packet);
        if (typeof runIncomingHitDebuffs === 'function') runIncomingHitDebuffs(attacker, target, packet);
        if (typeof runSkillHitProcs === 'function') {
            runSkillHitProcs(attacker, target, packet, combatStyleProfile, hitIndex);
        }
        return { packet, application };
    } finally {
        attacker._activeSkillProcCoefficient = previousProcCoefficient ?? 1;
    }
}

function resolveWeaponPropagation(attacker, primaryTarget, primaryPacket, combatStyleProfile, hitIndex, random = Math.random) {
    const profile = getPlayerWeaponPropagationProfile(attacker);
    if (!profile || !primaryTarget || !primaryPacket || primaryPacket.tags?.includes('propagation')) return [];
    const visualSnapshot = typeof capturePropagationFormationSnapshot === 'function'
        ? capturePropagationFormationSnapshot(attacker, primaryTarget)
        : null;
    const events = [];
    const defeatedTargets = [];
    const affected = new Map([[getPropagationEntityKey(primaryTarget), primaryTarget]]);
    const usedTargets = new Set([getPropagationEntityKey(primaryTarget)]);
    let chainOrigin = primaryTarget;
    const cleaveTargets = profile.id === 'cleave' ? getCleavePropagationTargets(primaryTarget) : [];

    for (let eventIndex = 0; eventIndex < profile.targetCount; eventIndex++) {
        let target = null;
        let origin = primaryTarget;

        if (profile.id === 'chain') {
            const candidates = getLivingPropagationEnemies().filter(candidate => (
                candidate !== chainOrigin && arePropagationSlotsAdjacent(chainOrigin, candidate)
            ));
            target = pickPropagationCandidate(candidates, random);
            origin = chainOrigin;
        } else if (profile.id === 'splash') {
            const candidates = [];
            const candidateIds = new Set();
            for (const affectedTarget of affected.values()) {
                for (const candidate of getLivingPropagationEnemies()) {
                    const candidateId = getPropagationEntityKey(candidate);
                    if (usedTargets.has(candidateId) || candidateIds.has(candidateId)) continue;
                    if (!arePropagationSlotsAdjacent(affectedTarget, candidate)) continue;
                    candidateIds.add(candidateId);
                    candidates.push({ target: candidate, origin: affectedTarget });
                }
            }
            const selected = pickPropagationCandidate(candidates, random);
            target = selected?.target || null;
            origin = selected?.origin || primaryTarget;
        } else if (profile.id === 'cleave') {
            target = cleaveTargets.find(candidate => (
                candidate.currentHealth > 0 && !usedTargets.has(getPropagationEntityKey(candidate))
            )) || null;
            origin = events.length > 0 ? events[events.length - 1].targetEntity : primaryTarget;
        } else {
            const candidates = getLivingPropagationEnemies().filter(candidate => (
                !usedTargets.has(getPropagationEntityKey(candidate))
            ));
            target = pickPropagationCandidate(candidates, random);
            origin = profile.id === 'barrage' ? attacker : primaryTarget;
        }

        if (!target) break;
        const targetId = getPropagationEntityKey(target);
        const originId = getPropagationEntityKey(origin);
        const { packet, application } = resolvePropagationHit(
            attacker,
            target,
            primaryPacket,
            profile,
            combatStyleProfile,
            hitIndex,
            eventIndex
        );
        events.push(Object.freeze({
            index: eventIndex,
            type: profile.id,
            originId,
            targetId,
            originSlot: Number(origin?._slotIndex),
            targetSlot: Number(target?._slotIndex),
            targetEntity: target,
            damage: application.appliedDamage,
            shieldDamage: application.shieldDamage,
            healthDamage: application.healthDamage,
            critical: packet.isCritical,
            targetDefeated: application.targetDefeated
        }));
        if (application.targetDefeated) defeatedTargets.push(target);
        affected.set(targetId, target);
        if (profile.id !== 'chain') usedTargets.add(targetId);
        if (profile.id === 'chain') chainOrigin = target;
    }

    if (events.length > 0) {
        const immutableEvents = events.map(({ targetEntity, ...event }) => Object.freeze(event));
        if (typeof queuePropagationPresentation === 'function') {
            queuePropagationPresentation(Object.freeze({
                profile,
                primaryTargetId: getPropagationEntityKey(primaryTarget),
                dominantDamageType: getDominantPropagationDamageType(primaryPacket),
                snapshot: visualSnapshot,
                events: Object.freeze(immutableEvents)
            }), () => {
                for (const defeatedTarget of defeatedTargets) {
                    if (typeof handleDefeatedCombatant === 'function') handleDefeatedCombatant(defeatedTarget);
                }
            });
        } else {
            for (const defeatedTarget of defeatedTargets) {
                if (typeof handleDefeatedCombatant === 'function') handleDefeatedCombatant(defeatedTarget);
            }
        }
        if (typeof addToCombatLog === 'function') {
            addToCombatLog(`${profile.label} propagated to ${events.length} additional target${events.length === 1 ? '' : 's'}.`, '#8fe9ff', false);
        }
    }
    return events;
}

window.coreboundPropagation = Object.freeze({
    targetCap: PROPAGATION_TARGET_CAP,
    triggerCoefficient: PROPAGATION_TRIGGER_COEFFICIENT,
    profiles: WEAPON_PROPAGATION_PROFILES,
    slotCoordinates: PROPAGATION_SLOT_COORDINATES,
    getProfile: getPlayerWeaponPropagationProfile,
    areAdjacent: arePropagationSlotsAdjacent,
    getCleaveTargets: getCleavePropagationTargets,
    resolve: resolveWeaponPropagation
});
