export default {
    name: 'Kinetic Bulwark Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 36, max: 36 },
    healthBonus: { min: 500, max: 650 },
    defenseTypes: {
        physicalResistance: { min: 14, max: 17 }
    },
    deflection: { min: 6, max: 9 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 }
    ],
    description: 'Kinetic bulwark helm that turns aside glancing blows and stabilizes your stance.'
};
