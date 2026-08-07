export default {
    name: 'Neural Targeting Crown',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 41, max: 41 },
    healthBonus: { min: 750, max: 900 },
    precision: { min: 45, max: 60 },
    criticalChanceModifier: { min: 3, max: 5 },
    criticalMultiplierModifier: { min: 5, max: 8 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 2 }
    ],
    description: 'Neural-linked crown that maximizes targeting precision with rare crit support.'
};
