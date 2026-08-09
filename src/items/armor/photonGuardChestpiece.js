export default {
    name: 'Photon Guard Chestpiece',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 18, max: 18 },
    healthBonus: { min: 150, max: 200 },
    energyShieldBonus: { min: 70, max: 100 },
    energyShieldBonusPercentRange: { min: 4, max: 6 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 6 },
        { name: 'Copper Coil', quantity: 2 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Photon lattice plating that prioritizes barrier strength over raw bulk.'
};
