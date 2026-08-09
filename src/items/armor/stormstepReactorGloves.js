export default {
    name: 'Stormstep Reactor Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 168, max: 204 },
    defenseTypes: {
        elementalResistance: { min: 5, max: 10 },
    },
    precision: { min: 8, max: 12 },
    attackSpeedModifier: { min: 1, max: 5 },
    damageTypes: {
        electric: { min: 4, max: 6 },
    },
    energyShieldBonus: { min: 200, max: 300 },
    deflection: { min: 4, max: 6 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Stormstep Reactor Gloves — salvaged hand protection tuned for combat grip and control.'
};
