export default {
    name: 'Riveted Iron Helmet',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 8, max: 8 },
    healthBonus: { min: 40, max: 60 },
    defenseTypes: {
        physicalResistance: { min: 2, max: 4 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Metal Fasteners', quantity: 1 }
    ],
    description: 'Riveted iron headgear built to shrug off kinetic impacts.'
};
