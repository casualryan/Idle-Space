export default {
    name: "Super Screeching Drone",
    health: 130,
    energyShield: 60,
    attackSpeed: 1.5,
    criticalChance: 0.1,
    criticalMultiplier: 1.5,
    damageTypes: {
        slashing: 20,
        electric: 15,
        pyro: 10
    },
    defenseTypes: {
        physicalResistance: 15,
        elementalResistance: 25,
        chemicalResistance: 15
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


