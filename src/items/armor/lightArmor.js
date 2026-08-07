export default {
    name: "Light Armor",
    type: "Armor",
    icon: "icons/light_armor.png",
    damageTypes: {},
    attackSpeed: 0,
    defenseTypes: {
        physicalResistance: { min: 15, max: 20 },
        elementalResistance: { min: 5, max: 10 },
        chemicalResistance: { min: 5, max: 10 }
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