export default {
    name: 'Photon Stride Guards',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 19, max: 19 },
    healthBonus: { min: 120, max: 160 },
    energyShieldBonus: { min: 55, max: 80 },
    energyShieldBonusPercentRange: { min: 3, max: 5 },
    precision: { min: 2, max: 5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 6 },
        { name: 'Copper Coil', quantity: 2 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Photon-threaded guards that support fast footwork with a focused barrier.'
};

