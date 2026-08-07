export default {
    name: 'Barrier-Tread Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 31, max: 31 },
    healthBonus: { min: 300, max: 400 },
    energyShieldBonus: { min: 120, max: 180 },
    energyShieldBonusPercentRange: { min: 4, max: 7 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium Plating', quantity: 2 },
        { name: 'Advanced Servo', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Barrier-tread boots that tune shield output with each stride.'
};
