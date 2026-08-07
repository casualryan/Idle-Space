export default {
    name: 'Patchwork Work Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 3, max: 3 },
    healthBonus: { min: 16, max: 24 },
    defenseTypes: {
        physicalResistance: { min: 1, max: 2 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Reinforced work boots with basic physical plating for rough terrain.'
};
