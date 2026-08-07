export default {
    name: 'Reflex Drive Gauntlets',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 41, max: 41 },
    healthBonus: { min: 139, max: 170 },
    defenseTypes: {
        physicalResistance: { min: 5, max: 10 },
    },
    precision: { min: 6, max: 10 },
    attackSpeedModifier: { min: 1, max: 5 },
    damageTypes: {
        kinetic: { min: 4, max: 6 },
    },
    energyShieldBonus: { min: 164, max: 246 },
    deflection: { min: 3, max: 5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Reflex Drive Gauntlets — salvaged hand protection tuned for combat grip and control.'
};
