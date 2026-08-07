export default {
    name: "Synthesized Alloy Chestplate",
    type: "Armor",
    icon: "icons/heavy_armor.png",
    slot: 'chest',
    levelRequirement: 1,
    healthBonus: { min: 500, max: 550 },
    healthBonusPercentRange: { min: 20, max: 20 },
    // Base defenses
    defenseTypes: {},
    // Mod pools per schema
    rollGroups: [
        {
            pick: { min: 2, max: 2 },
            from: [
                { path: 'defenseTypes.physicalResistance', value: { min: 20, max: 20 } },
                { path: 'defenseTypes.chemicalResistance', value: { min: 20, max: 20 } },
                { path: 'defenseTypes.elementalResistance', value: { min: 20, max: 20 } }
            ]
        },
        {
            pick: { min: 1, max: 1 },
            from: [
                { path: 'passiveBonuses.Kinetic Mastery', value: { min: 1, max: 2 } },
                { path: 'passiveBonuses.Slashing Mastery', value: { min: 1, max: 2 } },
                { path: 'passiveBonuses.Pyro Mastery', value: { min: 1, max: 2 } },
                { path: 'passiveBonuses.Cryo Mastery', value: { min: 1, max: 2 } },
                { path: 'passiveBonuses.Electric Mastery', value: { min: 1, max: 2 } },
                { path: 'passiveBonuses.Chemical Mastery', value: { min: 1, max: 2 } },
                { path: 'passiveBonuses.Radiation Mastery', value: { min: 1, max: 2 } }
            ]
        },
        {
            pick: { min: 1, max: 1 },
            from: [
                { path: 'armorEfficiency', value: { min: 10, max: 20 } },
                { path: 'weaponEfficiency', value: { min: 10, max: 20 } },
                { path: 'bionicEfficiency', value: { min: 10, max: 20 } }
            ]
        }
    ],
    passiveBonuses: {
        "Heart": 1
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 }
    ]
};




