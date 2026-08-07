export default {
    name: 'Light Combat Vest',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 5, max: 5 },
    healthBonus: { min: 40, max: 55 },
    precision: { min: 2, max: 4 },
    attackSpeedModifier: { min: 2, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'A light vest that trades bulk for agility and targeting stability.'
};
