export default {
    name: 'Photon-Tread Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 19, max: 19 },
    healthBonus: { min: 80, max: 110 },
    energyShieldBonus: { min: 40, max: 55 },
    precision: { min: 2, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 },
        { name: 'Copper Coil', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Photon-tread boots that pair a light barrier with improved stride control.'
};
