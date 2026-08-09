export default {
    name: 'Scrap Metal Trousers',
    type: 'Armor',
    icon: 'icons/scrap_metal_trousers.png',
    slot: 'legs',
    levelRequirement: { min: 1, max: 1 },
    healthBonus: { min: 16, max: 28 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 }
    ],
    description: 'Starter leg protection built from salvaged scrap.'
};

