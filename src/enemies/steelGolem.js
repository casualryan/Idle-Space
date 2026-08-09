export default {
    name: "Steel Golem",
    health: 500,
    energyShield: 0,
    attackSpeed: 0.65,
    criticalChance: 0.00,
    criticalMultiplier: 2,
    damageTypes: {
        kinetic: 67
    },
    defenseTypes: {
        toughness: 30,
        heatResistance: 20,
        fortitude: 50,
        immunity: 50,
        antimagnet: -20
    },
    lootTable: [

    ],
    lootConfig: {
        baseDropChance: 0.9,
        minItems: 2,
        maxItems: 4,
        poolsByTier: {
            1: ["lowRoboParts", "genericCommon"],
            2: ["basicComponents"],
            3: ["midRobotParts", "genericRare"],
            4: ["advancedComponents"],
            5: ["epicTech"],
            6: ["legendaryComponents"]
        }
    },
    experienceValue: 100,
    statusEffects: []
};


