export default {
    name: 'Grounding Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 10, max: 10 },
    healthBonus: { min: 45, max: 58 },
    defenseTypes: {
        elementalResistance: { min: 2, max: 4 }
    },
    deflection: { min: 1, max: 2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Copper Coil', quantity: 1 }
    ],
    description: 'Grounded soles that bleed elemental charge and keep your footing stable.'
};
