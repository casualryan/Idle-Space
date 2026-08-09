export default {
    name: 'Riveted Chest Plate',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 8, max: 8 },
    healthBonus: { min: 70, max: 100 },
    defenseTypes: {
        physicalResistance: { min: 4, max: 6 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Riveted steel plates built to absorb kinetic impacts.'
};
