export default {
    name: 'Alloy Battle Greaves',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 27, max: 27 },
    healthBonus: { min: 280, max: 360 },
    defenseTypes: {
        physicalResistance: { min: 10, max: 12 }
    },
    deflection: { min: 3, max: 5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 3 },
        { name: 'Titanium Plating', quantity: 2 },
        { name: 'Advanced Servo', quantity: 1 }
    ],
    description: 'Sturdy alloy greaves designed for sustained physical engagements and stable footing.'
};

