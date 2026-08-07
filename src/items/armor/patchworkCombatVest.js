export default {
    name: 'Patchwork Combat Vest',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 3, max: 3 },
    healthBonus: { min: 35, max: 50 },
    defenseTypes: {
        physicalResistance: { min: 1, max: 2 },
        elementalResistance: { min: 1, max: 2 },
        chemicalResistance: { min: 1, max: 2 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Layers of salvaged plating stitched together for modest all-around protection.'
};
