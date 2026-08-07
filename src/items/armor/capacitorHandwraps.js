export default {
    name: 'Capacitor Handwraps',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 12, max: 12 },
    healthBonus: { min: 46, max: 60 },
    defenseTypes: {
        elementalResistance: { min: 2, max: 5 },
    },
    precision: { min: 2, max: 3 },
    attackSpeedModifier: { min: 1, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Wire Bundle', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Capacitor Handwraps — salvaged hand protection tuned for combat grip and control.'
};
