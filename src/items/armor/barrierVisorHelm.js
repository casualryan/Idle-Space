export default {
    name: 'Barrier Visor Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 31, max: 31 },
    healthBonus: { min: 380, max: 480 },
    energyShieldBonus: { min: 140, max: 200 },
    energyShieldBonusPercentRange: { min: 5, max: 8 },
    precision: { min: 20, max: 28 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium Plating', quantity: 2 },
        { name: 'Advanced Servo', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Barrier visor helm that tunes shield output while sharpening perception.'
};
