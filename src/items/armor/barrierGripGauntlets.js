export default {
    name: 'Barrier Grip Gauntlets',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 31, max: 31 },
    healthBonus: { min: 107, max: 132 },
    defenseTypes: {
        physicalResistance: { min: 5, max: 10 },
    },
    precision: { min: 5, max: 7 },
    attackSpeedModifier: { min: 1, max: 4 },
    damageTypes: {
        kinetic: { min: 3, max: 5 },
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Barrier Grip Gauntlets — salvaged hand protection tuned for combat grip and control.'
};
