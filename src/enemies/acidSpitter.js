export default {
    name: "Acid Spitter",
    health: 80,
    energyShield: 0,
    attackSpeed: 0.9,
    criticalChance: 0.1,
    criticalMultiplier: 1.8,
    damageTypes: {
        corrosive: 20,
        radiation: 10
    },
    defenseTypes: {
        physicalResistance: 5,
        elementalResistance: 10,
        chemicalResistance: 30
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


