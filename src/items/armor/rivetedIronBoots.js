export default {
    name: 'Riveted Iron Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 7, max: 7 },
    healthBonus: { min: 35, max: 50 },
    defenseTypes: {
        physicalResistance: { min: 2, max: 4 }
    },
    deflection: { min: 1, max: 2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Metal Fasteners', quantity: 1 }
    ],
    description: 'Riveted iron boots that brace your stance against kinetic impacts.'
};
