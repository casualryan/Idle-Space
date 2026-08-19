// Operation-only security family. Combat stats and loot are copied from a
// same-level progression enemy when the encounter is created, allowing these
// units to appear from level 1 through the level cap without a parallel table.

const shared = {
    level: 1,
    zone: 1,
    dynamicOperationSecurity: true,
    health: 100,
    energyShield: 0,
    attackSpeed: 1,
    criticalChance: 0.08,
    criticalMultiplier: 1.8,
    defenseTypes: { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 },
    damageTypes: { kinetic: 5 },
    experienceValue: 20,
    lootConfig: { baseDropChance: 0.7, minItems: 1, maxItems: 2, poolsByTier: { 1: ['foundationZ1'] } },
    currencyDrop: { min: 3, max: 8, dropRate: 1 }
};

export default [
    {
        ...shared,
        id: 'operation_security_command_bot',
        name: 'Security Command Bot',
        operationSecurityRole: 'command',
        enemyAbilityIds: ['commander'],
        archetype: 'heavy',
        portrait: 'images/enemies/security-command-bot.png',
        description: 'A scalable command platform deployed by sealed Operation security systems.'
    },
    {
        ...shared,
        id: 'operation_security_interceptor_drone',
        name: 'Security Interceptor Drone',
        operationSecurityRole: 'interceptor',
        enemyAbilityIds: ['berserker'],
        archetype: 'swarm',
        portrait: 'images/enemies/security-interceptor-drone.png',
        description: 'A fast security drone slaved to a command platform.'
    },
    {
        ...shared,
        id: 'operation_security_suppression_drone',
        name: 'Security Suppression Drone',
        operationSecurityRole: 'suppression',
        archetype: 'sniper',
        portrait: 'images/enemies/security-suppression-drone.png',
        description: 'A precision security drone that joins higher-level response teams.'
    }
];
