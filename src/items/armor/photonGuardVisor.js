export default {
    name: 'Photon Guard Visor',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 19, max: 19 },
    healthBonus: { min: 85, max: 115 },
    energyShieldBonus: { min: 50, max: 65 },
    precision: { min: 5, max: 9 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 },
        { name: 'Copper Coil', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Photon-tuned visor that pairs barrier support with improved targeting.'
};
