export default {
    name: "Cactibot",
    health: 220,
    energyShield: 30,
    attackSpeed: 1.2,
    criticalChance: 0.10,
    criticalMultiplier: 1.5,
    damageTypes: {
        kinetic: 61,
    },
    defenseTypes: {
        toughness: 20,
        heatResistance: -20,
        fortitude: 50,
        immunity: 10,
    },
    lootTable: [
        { itemName: "Titanium Thorn", minQuantity: 1, maxQuantity: 1, dropRate: 0.10 },
    ],
    experienceValue: 70,
    statusEffects: []
};


