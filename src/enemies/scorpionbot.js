export default {
    name: "Scorpionbot",
    health: 220,
    energyShield: 30,
    attackSpeed: 1.2,
    criticalChance: 0.10,
    criticalMultiplier: 2.3,
    damageTypes: {
        chemical: 58,
    },
    defenseTypes: {
        toughness: 10,
        immunity: 10,
        heatResistance: -15
    },
    lootTable: [
        { itemName: "Metal Scorpion Fang", minQuantity: 1, maxQuantity: 1, dropRate: 0.05 },
    ],
    experienceValue: 80,
    statusEffects: []
};


