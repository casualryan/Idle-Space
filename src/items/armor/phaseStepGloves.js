export default {
    name: 'Phase-Step Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 39, max: 39 },
    healthBonus: { min: 133, max: 162 },
    defenseTypes: {
        physicalResistance: { min: 5, max: 10 },
    },
    precision: { min: 6, max: 9 },
    attackSpeedModifier: { min: 1, max: 5 },
    damageTypes: {
        kinetic: { min: 3, max: 6 },
    },
    energyShieldBonus: { min: 156, max: 234 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Phase-Step Gloves — salvaged hand protection tuned for combat grip and control.'
};
