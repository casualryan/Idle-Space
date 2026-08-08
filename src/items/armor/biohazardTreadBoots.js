export default {
    name: 'Biohazard Tread Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 34, max: 34 },
    healthBonus: { min: 350, max: 480 },
    defenseTypes: {
        chemicalResistance: { min: 10, max: 14 }
    },
    healthRegen: { min: 0.4, max: 0.7 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 2 }
    ],
    description: 'Biohazard tread boots for contaminated zones—protection with steady recovery.'
};
