export default {
    name: "Pyro Bot",
    health: 90,
    energyShield: 10,
    attackSpeed: 1,
    criticalChance: 0.05,
    criticalMultiplier: 1.5,
    damageTypes: {
        pyro: 25,
        kinetic: 5
    },
    defenseTypes: {
        physicalResistance: 15,
        elementalResistance: 25,
        chemicalResistance: 0
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


