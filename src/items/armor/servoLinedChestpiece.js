export default {
    name: 'Servo-Lined Chestpiece',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 30, max: 30 },
    healthBonus: { min: 450, max: 550 },
    precision: { min: 6, max: 9 },
    attackSpeedModifier: { min: 4, max: 6 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium Plating', quantity: 2 },
        { name: 'Advanced Servo', quantity: 1 },
        { name: 'Wire Bundle', quantity: 2 }
    ],
    description: 'Servo-assisted plating that keeps the wearer mobile and on-target.'
};
