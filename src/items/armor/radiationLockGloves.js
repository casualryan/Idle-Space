export default {
    name: 'Radiation Lock Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 44, max: 44 },
    healthBonus: { min: 149, max: 181 },
    defenseTypes: {
        elementalResistance: { min: 5, max: 10 },
    },
    precision: { min: 7, max: 11 },
    attackSpeedModifier: { min: 1, max: 5 },
    energyShieldBonus: { min: 176, max: 264 },
    deflection: { min: 3, max: 5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Radiation Lock Gloves — salvaged hand protection tuned for combat grip and control.'
};
