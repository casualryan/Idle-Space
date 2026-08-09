export default {
    name: "Pyro Beetle",
    health: 330,
    energyShield: 50,
    attackSpeed: 1.35,
    criticalChance: 0.15,
    criticalMultiplier: 2.0,
    damageTypes: {
        pyro: 99
    },
    defenseTypes: {
        toughness: 15,
        heatResistance: 50,
        fortitude: 20,
    },
    lootTable: [
        { itemName: "Flame Shell", minQuantity: 1, maxQuantity: 1, dropRate: 0.15 },
        { itemName: "Pyro Core", minQuantity: 1, maxQuantity: 1, dropRate: 0.1 },

    ],
    experienceValue: 65,
    statusEffects: []
};


