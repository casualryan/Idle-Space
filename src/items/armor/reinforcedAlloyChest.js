export default {
    name: 'Reinforced Alloy Chest',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 26, max: 26 },
    healthBonus: { min: 420, max: 520 },
    defenseTypes: {
        physicalResistance: { min: 12, max: 15 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 3 },
        { name: 'Titanium Plating', quantity: 2 },
        { name: 'Advanced Servo', quantity: 1 }
    ],
    description: 'Dense alloy chestwork built to soak sustained physical punishment.'
};
