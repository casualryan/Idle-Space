// Authoritative enemy combat-role definitions. Enemy templates reference
// these stable IDs while combatController owns their runtime execution.
const ENEMY_ABILITY_DEFINITIONS = Object.freeze({
    repair: Object.freeze({
        id: 'repair',
        label: 'Repair',
        actionLabel: 'Repair Cycle',
        description: 'Repairs the most injured ally instead of attacking when a repair target is available.',
        mode: 'action',
        replacesAttack: true,
        actionInterval: 5.5,
        healPercent: 0.18
    }),
    shieldProjector: Object.freeze({
        id: 'shieldProjector',
        label: 'Projector',
        actionLabel: 'Channel Cycle',
        description: 'Channels shielding into an ally, continuously restoring a large portion of its Energy Shield.',
        mode: 'channel',
        replacesAttack: true,
        actionInterval: 4.5,
        shieldPerSecond: 0.12
    }),
    commander: Object.freeze({
        id: 'commander',
        label: 'Commander',
        actionLabel: 'Attack Time',
        description: 'While alive, grants other enemies +15% damage, +10% Attack Speed, and +10 Precision.',
        mode: 'aura',
        replacesAttack: false,
        damageMultiplier: 0.15,
        attackSpeedMultiplier: 0.10,
        precisionBonus: 10
    }),
    cleanser: Object.freeze({
        id: 'cleanser',
        label: 'Cleanser',
        actionLabel: 'Cleanse Cycle',
        description: 'Removes all debuffs from the most heavily afflicted ally instead of attacking when possible.',
        mode: 'action',
        replacesAttack: true,
        actionInterval: 6.5
    }),
    berserker: Object.freeze({
        id: 'berserker',
        label: 'Berserker',
        actionLabel: 'Attack Time',
        description: 'Gains stacking damage and Attack Speed while it remains alive, up to five stacks.',
        mode: 'escalation',
        replacesAttack: false,
        stackInterval: 4,
        maxStacks: 5,
        damagePerStack: 0.08,
        attackSpeedPerStack: 0.05
    })
});

const ENEMY_SUPPORT_ABILITY_IDS = Object.freeze(['repair', 'shieldProjector', 'cleanser']);

function getEnemyAbilityDefinition(abilityId) {
    return ENEMY_ABILITY_DEFINITIONS[String(abilityId || '')] || null;
}

function getEnemyAbilityDefinitions(combatant) {
    return (Array.isArray(combatant?.enemyAbilityIds) ? combatant.enemyAbilityIds : [])
        .map(getEnemyAbilityDefinition)
        .filter(Boolean);
}

function hasEnemyAbility(combatant, abilityId) {
    return Array.isArray(combatant?.enemyAbilityIds) && combatant.enemyAbilityIds.includes(abilityId);
}

function getEnemySupportAbilityIds(combatant) {
    return ENEMY_SUPPORT_ABILITY_IDS.filter(abilityId => hasEnemyAbility(combatant, abilityId));
}

function isEnemySupport(combatant) {
    return getEnemySupportAbilityIds(combatant).length > 0;
}

window.enemyAbilityDefinitions = ENEMY_ABILITY_DEFINITIONS;
window.enemySupportAbilityIds = ENEMY_SUPPORT_ABILITY_IDS;
window.getEnemyAbilityDefinition = getEnemyAbilityDefinition;
window.getEnemyAbilityDefinitions = getEnemyAbilityDefinitions;
window.hasEnemyAbility = hasEnemyAbility;
window.getEnemySupportAbilityIds = getEnemySupportAbilityIds;
window.isEnemySupport = isEnemySupport;
