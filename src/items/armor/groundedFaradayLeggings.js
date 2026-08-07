export default {
    name: 'Grounded Faraday Leggings',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 22, max: 22 },
    healthBonus: { min: 190, max: 240 },
    defenseTypes: {
        elementalResistance: { min: 7, max: 10 }
    },
    deflection: { min: 4, max: 7 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Copper Coil', quantity: 1 }
    ],
    description: 'Grounded leggings that shrug off elemental surges and keep you steady.'
};

