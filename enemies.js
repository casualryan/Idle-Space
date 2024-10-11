// enemies.js

// Enemy templates
const enemies = [
    {
        name: "Spiderbot",
        health: 25,
        energyShield: 0,
        attackSpeed: 1.1,
        criticalChance: 0,
        criticalMultiplier: 1.5,
        damageTypes: {
            kinetic: 5
        },
        defenseTypes: {
            
        },
        lootTable: [
            { itemName: "Synthetic Poison Gland", minQuantity: 1, maxQuantity: 2, dropRate: .20 },
            { itemName: "Unstable Photon", minQuantity: 1, maxQuantity: 1, dropRate: .05 },
        ],
        experienceValue: 10,
        statusEffects: [],        
    },
    {
        name: "Roachbot",
        health: 35,
        energyShield: 5,
        attackSpeed: 1.1,
        criticalChance: 0.15,
        criticalMultiplier: 2.0,
        damageTypes: {
            kinetic: 10
        },
        defenseTypes: {
            toughness: 8
        },
        lootTable: [
            { itemName: "Crystalized Light", minQuantity: 1, maxQuantity: 2, dropRate: 0.30 },
            { itemName: "Particle Fuser", minQuantity: 1, maxQuantity: 1, dropRate: 0.10 },
        ],
        experienceValue: 60,
        statusEffects: []
    },
    {
        name: "Scorpionbot",
        health: 150,
        energyShield: 30,
        attackSpeed: 0.8,
        criticalChance: 0.07,
        criticalMultiplier: 2.0,
        damageTypes: {
            kinetic: 5,
            chemical: 20
        },
        defenseTypes: {
            toughness: 10,
            immunity: 5
        },
        lootTable: [
            { itemName: "Speed Enhancer", dropRate: 0.10 },
        ],
        experienceValue: 80,
        statusEffects: []
    },
    {
        name: "Cactibot",
        health: 110,
        energyShield: 35,
        attackSpeed: 1.2,
        criticalChance: 0.15,
        criticalMultiplier: 1.5,
        damageTypes: {
            kinetic: 25,
        },
        defenseTypes: {
            toughness: 20,
            heatResistance: -20,
            fortitude: 50,
            immunity: 10,
        },
        lootTable: [
            { itemName: "Titanium Thorn", dropRate: 0.10 },
        ],
        experienceValue: 70,
        statusEffects: []
    },
    // Add more enemies with random stats
    {
        name: "Steel Golem",
        health: 200,
        energyShield: 50,
        attackSpeed: 0.6,
        criticalChance: 0.05,
        criticalMultiplier: 2.5,
        damageTypes: {
            kinetic: 60
        },
        defenseTypes: {
            toughness: 20
        },
        lootTable: [
        ],
        experienceValue: 100,
        statusEffects: []
    },
    {
        name: "Electro Wasp",
        health: 100,
        energyShield: 10,
        attackSpeed: 1.5,
        criticalChance: 0.15,
        criticalMultiplier: 1.5,
        damageTypes: {
            kinetic: 5,
            magnetic: 20
        },
        defenseTypes: {
            toughness: 5,
            antimagnet: 5
        },
        lootTable: [
            { itemName: "Crystalized Light", minQuantity: 3, maxQuantity: 3, dropRate: 1 },
            { itemName: "Electro Blaster", dropRate: 0.2 }
        ],
        experienceValue: 55,
        statusEffects: []
    },
    {
        name: "Pyro Beetle",
        health: 110,
        energyShield: 15,
        attackSpeed: 1.0,
        criticalChance: 0.1,
        criticalMultiplier: 2.0,
        damageTypes: {
            pyro: 25
        },
        defenseTypes: {
            toughness: 8,
            heatResistance: 10
        },
        lootTable: [
            { itemName: "Flame Shell", dropRate: 0.15 },
            { itemName: "Pyro Core", dropRate: 0.1 }
        ],
        experienceValue: 65,
        statusEffects: []
    },
    {
        name: "Knight O'Hare",
        health: 300,
        energyShield: 50,
        attackSpeed: 2,
        criticalChance: 0,
        criticalMultiplier: 2.0,
        damageTypes: {
            kinetic: 25,
            chemical: 10
        },
        defenseTypes: {
            toughness: 40,
            heatResistance: 40,
            fortitude: 40,
            immunity: 60,
            antimagnet: 10
        },
        lootTable: [            
        ],
        experienceValue: 500,
        statusEffects: []
    },
    // Continue adding enemies as needed
];
