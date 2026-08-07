export default {
    name: 'Scrap Metal Helmet',
    type: 'Armor',
    icon: 'icons/scrap_metal_helmet.png',
    slot: 'head',
    levelRequirement: { min: 1, max: 1 },
    healthBonus: { min: 14, max: 28 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 }
    ],
    description: 'Starter head protection built from salvaged scrap.'
};
