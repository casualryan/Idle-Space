export default {
    name: 'Chem-Sealed Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 15, max: 15 },
    healthBonus: { min: 56, max: 71 },
    defenseTypes: {
        chemicalResistance: { min: 2, max: 5 },
    },
    precision: { min: 2, max: 3 },
    attackSpeedModifier: { min: 1, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Wire Bundle', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Chem-Sealed Gloves — salvaged hand protection tuned for combat grip and control.'
};
