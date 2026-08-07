export default {
    name: 'Barrier Reactor Plate',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 28, max: 28 },
    healthBonus: { min: 380, max: 480 },
    energyShieldBonus: { min: 200, max: 250 },
    energyShieldBonusPercentRange: { min: 8, max: 12 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium Plating', quantity: 2 },
        { name: 'Advanced Servo', quantity: 1 },
        { name: 'Small Power Cell', quantity: 1 }
    ],
    description: 'Chest-mounted reactor cells that amplify barrier output.'
};
