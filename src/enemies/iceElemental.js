export default {
    name: "Ice Elemental",
    health: 100,
    energyShield: 50,
    attackSpeed: 0.7,
    criticalChance: 0.2,
    criticalMultiplier: 1.5,
    damageTypes: {
        cryo: 30,
        electric: 5
    },
    defenseTypes: {
        physicalResistance: 10,
        elementalResistance: 30,
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


