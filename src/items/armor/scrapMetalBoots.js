export default {
    name: 'Scrap Metal Boots',
    type: 'Armor',
    icon: 'icons/scrap_metal_boots.png',
    slot: 'feet',
    levelRequirement: { min: 1, max: 1 },
    healthBonus: { min: 12, max: 22 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 }
    ],
    description: 'Starter foot protection built from salvaged scrap.'
};
