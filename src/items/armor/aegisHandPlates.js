export default {
    name: 'Aegis Hand Plates',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 48, max: 48 },
    healthBonus: { min: 162, max: 196 },
    defenseTypes: {
        physicalResistance: { min: 5, max: 10 },
    },
    precision: { min: 8, max: 12 },
    attackSpeedModifier: { min: 1, max: 5 },
    damageTypes: {
        kinetic: { min: 4, max: 8 },
    },
    energyShieldBonus: { min: 192, max: 288 },
    deflection: { min: 4, max: 6 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Aegis Hand Plates — salvaged hand protection tuned for combat grip and control.'
};
