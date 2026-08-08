export default {
    name: "Knight O'Hare",
    level: 20,
    health: 1500,
    energyShield: 40,
    attackSpeed: 2,
    criticalChance: 0.3,
    criticalMultiplier: 2.0,
    damageTypes: {
        kinetic: 150,
    },
    defenseTypes: {
        physicalResistance: 60,
        elementalResistance: 50,
        chemicalResistance: 60
    },
    lootConfig: {
        baseDropChance: 0.9,
        minItems: 1,
        maxItems: 2,
        poolsByTier: {
            1: ["genericCommon"],
            2: ["basicComponents", "genericUncommon"],
            3: ["midRobotParts", "genericRare"],
            4: ["advancedComponents"],
            5: ["epicTech"],
            6: ["legendaryComponents"]
        }
    },
    experienceValue: 500,
    statusEffects: []
};

