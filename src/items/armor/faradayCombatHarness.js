export default {
    name: 'Faraday Combat Harness',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 21, max: 21 },
    healthBonus: { min: 280, max: 340 },
    defenseTypes: {
        elementalResistance: { min: 9, max: 12 }
    },
    energyShieldBonus: { min: 90, max: 130 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Copper Coil', quantity: 1 }
    ],
    description: 'A grounded harness that sheds elemental charge into a reactive shield.'
};
