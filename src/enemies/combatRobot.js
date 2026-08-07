export default {
    name: "Combat Robot",
    health: 150,
    energyShield: 30,
    attackSpeed: 0.8,
    criticalChance: 0.05,
    criticalMultiplier: 2,
    damageTypes: {
        kinetic: 15,
        electric: 10
    },
    defenseTypes: {
        physicalResistance: 20,
        elementalResistance: 15,
        chemicalResistance: 5
    },
    lootConfig: {
        baseDropChance: 0.8,
        minItems: 1,
        maxItems: 3,
        poolsByTier: {
            1: ["lowRoboParts", "arachnidParts"],
            2: ["basicComponents", "genericUncommon"],
            3: ["midRobotParts", "genericRare"],
            4: ["advancedComponents"],
            5: ["epicTech"],
            6: ["legendaryComponents"]
        }
    },
    currencyDrop: {
        min: 5,
        max: 10,
        dropRate: 1
    },
    experienceValue: 10,
    statusEffects: [],        
};


