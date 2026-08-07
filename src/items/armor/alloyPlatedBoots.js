export default {
    name: 'Alloy Plated Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 26, max: 26 },
    healthBonus: { min: 160, max: 210 },
    defenseTypes: {
        physicalResistance: { min: 8, max: 10 }
    },
    deflection: { min: 2, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 3 },
        { name: 'Titanium Plating', quantity: 1 }
    ],
    description: 'Alloy-plated boots built for sturdy footing through sustained physical pressure.'
};
