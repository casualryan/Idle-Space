export default {
    name: "Screeching Drone",
    health: 75,
    energyShield: 25,
    attackSpeed: 1.2,
    criticalChance: 0.05,
    criticalMultiplier: 1.5,
    damageTypes: {
        slashing: 10,
        electric: 5
    },
    defenseTypes: {
        physicalResistance: 5,
        elementalResistance: 15,
        chemicalResistance: 10
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


