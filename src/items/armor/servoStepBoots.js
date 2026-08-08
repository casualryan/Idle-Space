export default {
    name: 'Servo-Step Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 29, max: 29 },
    healthBonus: { min: 180, max: 250 },
    precision: { min: 5, max: 8 },
    attackSpeedModifier: { min: 2, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Advanced Servo', quantity: 1 },
        { name: 'Wire Bundle', quantity: 2 }
    ],
    description: 'Servo-step boots that sharpen rhythm and footing without sacrificing control.'
};
