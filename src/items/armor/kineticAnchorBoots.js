export default {
    name: 'Kinetic Anchor Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 36, max: 36 },
    healthBonus: { min: 400, max: 550 },
    defenseTypes: {
        physicalResistance: { min: 12, max: 15 }
    },
    deflection: { min: 5, max: 8 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 }
    ],
    description: 'Kinetic anchor boots that lock your footing and shrug off physical shock.'
};
