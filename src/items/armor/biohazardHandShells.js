export default {
    name: 'Biohazard Hand Shells',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 34, max: 34 },
    healthBonus: { min: 117, max: 143 },
    defenseTypes: {
        chemicalResistance: { min: 5, max: 10 },
    },
    precision: { min: 5, max: 8 },
    attackSpeedModifier: { min: 1, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Biohazard Hand Shells — salvaged hand protection tuned for combat grip and control.'
};
