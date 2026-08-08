export default {
    name: 'Biohazard Combat Shell',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 33, max: 33 },
    healthBonus: { min: 650, max: 750 },
    defenseTypes: {
        chemicalResistance: { min: 14, max: 18 }
    },
    healthRegen: { min: 0.8, max: 1.2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 2 }
    ],
    description: 'A sealed combat shell for sustained operations in contaminated zones.'
};
