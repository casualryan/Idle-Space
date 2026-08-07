export default {
    name: 'Scrap Chest Plate',
    type: 'Armor',
    icon: 'icons/scrap_chest_plate.png',
    slot: 'chest',
    levelRequirement: { min: 1, max: 1 },
    healthBonus: { min: 25, max: 40 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 }
    ],
    description: 'A crude chest plate welded from scrap. Your first line of defense.'
};
