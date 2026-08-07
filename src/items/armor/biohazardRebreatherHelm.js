export default {
    name: 'Biohazard Rebreather Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 34, max: 34 },
    healthBonus: { min: 420, max: 550 },
    defenseTypes: {
        chemicalResistance: { min: 11, max: 15 }
    },
    healthRegen: { min: 0.5, max: 0.9 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 2 }
    ],
    description: 'Sealed rebreather helm for prolonged operations in contaminated zones.'
};
