export default {
    name: 'Cracked Visor Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 3, max: 3 },
    healthBonus: { min: 18, max: 30 },
    precision: { min: 1, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'A cracked visor that still sharpens your aim slightly.'
};
