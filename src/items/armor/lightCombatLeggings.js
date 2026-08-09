export default {
    name: 'Light Combat Leggings',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 6, max: 6 },
    healthBonus: { min: 38, max: 55 },
    precision: { min: 2, max: 4 },
    attackSpeedModifier: { min: 1, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Lightweight combat leggings that keep you quick and accurate under pressure.'
};

