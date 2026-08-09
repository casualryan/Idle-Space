export default {
    name: 'Light Combat Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 5, max: 5 },
    healthBonus: { min: 22, max: 28 },
    precision: { min: 2, max: 3 },
    attackSpeedModifier: { min: 1, max: 2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Light combat boots that keep your footing sharp without weighing you down.'
};
