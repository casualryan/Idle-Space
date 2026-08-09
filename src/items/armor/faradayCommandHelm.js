export default {
    name: 'Faraday Command Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 22, max: 22 },
    healthBonus: { min: 160, max: 200 },
    defenseTypes: {
        elementalResistance: { min: 7, max: 10 }
    },
    deflection: { min: 4, max: 7 },
    precision: { min: 12, max: 18 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Copper Coil', quantity: 1 }
    ],
    description: 'Command helm with Faraday shielding for tactical awareness under elemental fire.'
};
