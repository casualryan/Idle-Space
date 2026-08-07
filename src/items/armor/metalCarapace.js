export default {
    name: "Metal Carapace",
    type: "Armor",
    icon: "icons/heavy_armor.png",
    damageTypes: {},
    attackSpeed: -0.2,  // -20% attack speed (due to weight)
    criticalChance: 0,
    criticalMultiplier: 0,
    defenseTypes: {
        physicalResistance: { min: 20, max: 30 },  // Physical defense
        elementalResistance: { min: 10, max: 10 },   // Elemental defense
        chemicalResistance: { min: 10, max: 10 }    // Chemical defense
    },
    healthBonus: { min: 50, max: 100 },
    healthBonusPercentRange: { min: 15, max: 20 },
    slot: 'chest',
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 3
        },
    ],
    effects: [
        {
            trigger: 'whenHit',
            chance: 0.1, // 10% chance
            action: 'heal',
            parameters: {
                amount: 30
            }
        },
        {
            trigger: 'whenHit',
            chance: 0.25, // 10% chance
            action: 'dealDamage',
            parameters: {
                damageType: 'kinetic',
                amount: 15,
                ignoreDefenses: true
            }
        }
    ],
    description: '10% chance when hit to gain 30 life. 25% chance when hit to deal 15 Kinetic damage, ignoring defenses.'
}; 