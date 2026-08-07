export default {
    name: 'Servo-Assisted Legguards',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 31, max: 31 },
    healthBonus: { min: 450, max: 560 },
    precision: { min: 6, max: 10 },
    attackSpeedModifier: { min: 3, max: 6 },
    deflection: { min: 3, max: 6 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium Plating', quantity: 2 },
        { name: 'Advanced Servo', quantity: 1 },
        { name: 'Small Power Cell', quantity: 1 }
    ],
    description: 'Servo-assisted legguards that keep your movement sharp and your stance stable.'
};

