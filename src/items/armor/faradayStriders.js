export default {
    name: 'Faraday Striders',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 22, max: 22 },
    healthBonus: { min: 120, max: 160 },
    defenseTypes: {
        elementalResistance: { min: 5, max: 8 }
    },
    deflection: { min: 3, max: 5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Copper Coil', quantity: 1 }
    ],
    description: 'Faraday-strider boots that ground elemental surges and steady your footing.'
};
