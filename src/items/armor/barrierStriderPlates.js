export default {
    name: 'Barrier Strider Plates',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 29, max: 29 },
    healthBonus: { min: 240, max: 320 },
    energyShieldBonus: { min: 140, max: 180 },
    energyShieldBonusPercentRange: { min: 7, max: 11 },
    deflection: { min: 2, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium Plating', quantity: 2 },
        { name: 'Advanced Servo', quantity: 1 },
        { name: 'Wire Bundle', quantity: 2 }
    ],
    description: 'Strider plates that reinforce your steps with a sustained barrier field.'
};
