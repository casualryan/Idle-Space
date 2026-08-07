export default {
    name: 'Alloy Battle Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 27, max: 27 },
    healthBonus: { min: 220, max: 280 },
    defenseTypes: {
        physicalResistance: { min: 10, max: 12 }
    },
    deflection: { min: 3, max: 5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 3 },
        { name: 'Titanium Plating', quantity: 1 }
    ],
    description: 'Sturdy alloy battle helm for sustained physical engagements.'
};
