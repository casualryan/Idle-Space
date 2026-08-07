export default {
    name: 'Targeting Array Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 29, max: 29 },
    healthBonus: { min: 200, max: 260 },
    precision: { min: 18, max: 25 },
    criticalChanceModifier: { min: 2, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Basic Sensor Array', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Sensor-array helm that dramatically improves targeting consistency.'
};
