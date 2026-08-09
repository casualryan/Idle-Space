export default {
    name: 'Kinetic Anchor Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 36, max: 36 },
    healthBonus: { min: 123, max: 151 },
    defenseTypes: {
        physicalResistance: { min: 5, max: 10 },
    },
    precision: { min: 6, max: 9 },
    attackSpeedModifier: { min: 1, max: 5 },
    damageTypes: {
        kinetic: { min: 3, max: 6 },
    },
    energyShieldBonus: { min: 144, max: 216 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Kinetic Anchor Gloves — salvaged hand protection tuned for combat grip and control.'
};
