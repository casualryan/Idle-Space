export default {
    name: 'Titan Grip Gauntlets',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 46, max: 46 },
    healthBonus: { min: 155, max: 189 },
    defenseTypes: {
        physicalResistance: { min: 5, max: 10 },
    },
    precision: { min: 7, max: 11 },
    attackSpeedModifier: { min: 1, max: 5 },
    damageTypes: {
        kinetic: { min: 4, max: 7 },
    },
    energyShieldBonus: { min: 184, max: 276 },
    deflection: { min: 3, max: 5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Titan Grip Gauntlets — salvaged hand protection tuned for combat grip and control.'
};
