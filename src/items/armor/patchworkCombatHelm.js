export default {
    name: 'Patchwork Combat Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 5, max: 5 },
    healthBonus: { min: 24, max: 34 },
    defenseTypes: {
        physicalResistance: { min: 1, max: 2 },
        elementalResistance: { min: 1, max: 2 },
        chemicalResistance: { min: 1, max: 2 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Patchwork plating with modest all-around hazard protection.'
};
