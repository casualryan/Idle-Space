// const newItemTemplate = {
//     name: "",                      // String: The name of the item
//     type: "",                      // String: The type of item (e.g., "Weapon", "Armor", "Accessory")
//     weaponType: "",                // String: (Optional) The weapon type (e.g., "Sword", "Bow"). Only for weapons.
//     icon: "",                      // String: Path to the item's icon image
//     description: "",               // String: (Optional) Description of the item

//     // Flat Damage Types
//     damageTypes: {
//         // Example:
//         // kinetic: { min: 5, max: 10 },
//         // pyro: { min: 3, max: 7 }
//     },

//     // Percentage Damage Modifiers
//     statModifiers: {
//         damageTypes: {
//             // Example:
//             // kinetic: { min: 5, max: 15 }, // Percentage increase to kinetic damage
//             // pyro: { min: 5, max: 10 }     // Percentage increase to pyro damage
//         },
//         // Additional stat modifiers can be added here
//     },

//     // Defense Types
//     defenseTypes: {
//         // Example:
//         // toughness: { min: 10, max: 20 },
//         // fortitude: { min: 5, max: 15 }
//     },

//     // Attack Speed Modifier
//     attackSpeedModifierRange: { min: 0, max: 0 }, // Percentage (integers). Negative values for slower attack speed.

//     // Critical Chance Modifier
//     criticalChanceModifierRange: { min: 0, max: 0 }, // Percentage (integers)

//     // Critical Multiplier Modifier
//     criticalMultiplierModifierRange: { min: 0, max: 0 }, // Percentage (integers)

//     // Health Bonuses
//     healthBonus: { min: 0, max: 0 },                  // Flat increase to health
//     healthBonusPercentRange: { min: 0, max: 0 },      // Percentage increase to health (integers)

//     // Energy Shield Bonuses
//     energyShieldBonus: { min: 0, max: 0 },            // Flat increase to energy shield
//     energyShieldBonusPercentRange: { min: 0, max: 0 },// Percentage increase to energy shield (integers)

//     // Other Possible Properties
//     levelRequirement: 1,           // Number: Level required to equip the item
//     slot: "",                      // String: The equipment slot (e.g., "mainHand", "chest", "feet")

//     // Special Effects
//     specialEffects: [
//         // Array of special effect objects
//         // {
//         //     name: "Fireball",
//         //     chance: 0.1, // 10% chance to trigger
//         //     applyEffect: function(target) { /* effect logic */ }
//         // }
//     ],

//     // Additional Custom Properties
//     // Add any other custom properties relevant to your game
// };



// {
//     name: "",
//     type: "",
//     weaponType: "",
//     icon: "",
//     description: "",
//     damageTypes: {
        
//         // kinetic: { min: 5, max: 10 },
//     },
//     statModifiers: {
//         damageTypes: {
            
//             // kinetic: { min: 5, max: 15 },
//         },
//     },
//     defenseTypes: {
        
//         // toughness: { min: 10, max: 20 },
//     },
//     attackSpeedModifierRange: { min: 0, max: 0 },
//     criticalChanceModifierRange: { min: 0, max: 0 },
//     criticalMultiplierModifierRange: { min: 0, max: 0 },
//     healthBonus: { min: 0, max: 0 },
//     healthBonusPercentRange: { min: 0, max: 0 },
//     energyShieldBonus: { min: 0, max: 0 },
//     energyShieldBonusPercentRange: { min: 0, max: 0 },
//     levelRequirement: 1,
//     slot: "",
//     specialEffects: [     ],
//     isDisassembleable: true,
//     disassembleResults: [
//         {
//             name: 'FILL THIS', quantity: 1
//         },
//     ],
// },


const items = [

    //Weapons

    {
        name: "Iron Sword",
        type: "Weapon",
        weaponType: "Sword",
        icon: "icons/ironsword.png",
        damageTypes: {
             kinetic: { min: 3, max: 6 }, // Flat Damage
             mental: { min: 3, max: 6 }
        },
        statModifiers: {
            damageTypes: {
             kinetic: { min: 10, max: 20 }, // Percent Damage
        },
    },
        attackSpeedModifierRange: { min: 5, max: 10 },
        criticalChanceModifierRange: { min: 10, max: 20 },
        criticalMultiplierModifierRange: { min: 10, max: 20 },
        defenseTypes: {},
        slot: 'mainHand',
        disassembleResults: [
            {
                name: 'Scrap Metal', quantity: 1
            },
        ],
        isDisassembleable: true,
    },

    {
        name: 'Poison Pistol',
        type: "Weapon",
        weaponType: "Pistol",
        icon: "icons/poison_pistol.png",
        slot: 'mainHand',
        damageTypes: {
            chemical: { min: 8, max: 20 },
        },
        statModifiers: {
            damageTypes: {
                chemical: { min: 30, max: 35 },
            },
        },
        attackSpeedModifierRange: { min: 50, max: 75 },
        disassembleResults: [
            {
                name: 'Synthetic Poison Gland', quantity: 1
            },
        ],
        isDisassembleable: true,
        description: 'Made from Synthetic Poison harvested from various arachnid-bots'
    },

    {
        name: "Laser Sword",
        type: "Weapon",
        weaponType: "Sword",
        icon: "icons/lasersword.png",
        damageTypes: {
            kinetic: { min: 8, max: 20 },
        },
        statModifiers: {
            damageTypes: {
                kinetic: { min: 10, max: 25 },
            },
        },
        attackSpeedModifierRange: { min: 10, max: 30 },
        criticalChanceModifierRange: { min: 20, max: 40 },
        criticalMultiplierModifierRange: { min: 5, max: 15 },
        defenseTypes: {},
        slot: 'mainHand',
        disassembleResults: [
            {
                name: 'Crystalized Light', quantity: 1
            },
        ],
        isDisassembleable: true,
    },
    {
        name: "Electro Blaster",
        type: "Weapon",
        weaponType: "Pistol",
        icon: "icons/eblaster.png",
        slot: 'mainHand',
        damageTypes: { kinetic: 5 },
        attackSpeed: 0,
        criticalChance: 0,
        criticalMultiplier: 0,
        defenseTypes: {},
        specialEffect: {
            name: 'Zap',
            chance: 0.25,
            applyEffect: function(target) {
                // Apply Zapped status effect
                applyStatusEffect(target, 'Zapped');
                // Deal 10 Mental Damage upon application
                let damageTypes = { mental: 10 };
                applyDamage(target, 0, target.name, damageTypes);
                logMessage(`${target.name} takes 10 Mental Damage from Zap effect!`);
            }
        },
        isDisassembleable: true,
        disassembleResults: [
            {
                name: 'Minor Electronic Circuit', quantity: 1
            },
        ],
    },

    // Armor

    {
        name: "Steel Shield",
        type: "Shield",
        icon: "icons/steel_shield.png",
        damageTypes: {},
        attackSpeed: -0.1,  // -10% attack speed
        criticalChance: 0,
        criticalMultiplier: 0,
        defenseTypes: { 
            toughness: 10,
            fortitude: 10,
            heatResistance: 10,
            immunity: 10,
            antimagnet: 10
         },
        slot: 'offHand',
        isDisassembleable: true,
    },
    {
        name: "Metal Carapace",
        type: "Armor",
        icon: "icons/heavy_armor.png",
        damageTypes: {},
        attackSpeed: -0.2,  // -20% attack speed (due to weight)
        criticalChance: 0,
        criticalMultiplier: 0,
        defenseTypes: { 
            toughness: {min: 20, max: 30},
            fortitude: {min: 10, max: 10},
            heatResistance: {min: 10, max: 10},
            immunity: {min: 10, max: 10},
            antimagnet: {min: 10, max: 10}
        },
        healthBonus: { min: 50, max: 100 },
        healthBonusPercentRange: { min: 15, max: 15 },
        slot: 'chest',
        isDisassembleable: true,
        disassembleResults: [
            {
                name: 'Scrap Metal', quantity: 3
            },
        ],
    },

    {
        name: "Photon Inhibitor Shield",
        type: "Shield",
        icon: "icons/photon_inhibitor_shield.png",
        defenseTypes: {
            toughness: { min: 10, max: 15 },
            heatResistance: { min: 10, max: 15 },
            immunity: { min: 10, max: 15 },
            fortitude: { min: 10, max: 15 },
            antimagnet: { min: 10, max: 15 }
        },
        healthBonus: { min: 10, max: 30 },
        healthBonusPercentRange: { min: 5, max: 5 },
        energyShieldBonus: { min: 30, max: 50 },
        energyShieldBonusPercentRange: { min: 15, max: 15 },
        slot: 'offHand',
        isDisassembleable: true,
        disassembleResults: [
            {
                name: 'Unstable Photon', quantity: 1
            },
        ],
    },

    // Bionics

    {
        name: "Bionic Arm",
        type: "Bionic",
        icon: "icons/bionic_arm.png",
        damageTypes: { kinetic: 3 },
        attackSpeed: 0.1,  // +10% attack speed
        criticalChance: 0.02,
        criticalMultiplier: 0.1,
        defenseTypes: {},
        slot: 'bionic',
        isDisassembleable: true,
    },
    {
        name: "Speed Enhancer",
        type: "Bionic",
        icon: "icons/speedenhancer.png",
        damageTypes: {},
        attackSpeed: 0.75, // +75% attack speed
        criticalChance: 0,
        criticalMultiplier: 0,
        defenseTypes: {},
        slot: 'bionic',
        isDisassembleable: true,
    },

    // Gathering Items
    {
        name: 'Scrap Metal',
        type: 'Material',
        icon: 'icons/iron_ore.png',
        slot: 'material',
        stackable: true,
        isDisassembleable: false,
    },
    {
        name: 'Titanium',
        type: 'Material',
        icon: 'icons/titanium.png',
        slot: 'Material',
        stackable: true,
        isDisassembleable: false,
    },
    
    // Disassembl Targets

    {
        name: 'Minor Electronic Circuit',
        type: 'material',
        icon: 'icons/minor_electronic_circuit.png',
        slot: 'Material',
        stackable: true,
        isDisassembleable: false,
    },

    {
        name: 'Unstable Photon',
        type: 'material',
        icon: 'icons/unstable_photon.png',
        slot: 'Material',
        stackable: true,
        isDisassembleable: false,
    },

    {
        name: "Synthetic Poison Gland",
        type: 'material',
        icon: 'icons/synthetic_poison_gland.png',
        slot: 'Material',
        stackable: true,
        isDisassembleable: false,
    },

    {
        name: 'Crystalized Light',
        type: 'material',
        icon: 'icons/crystalized_light.png',
        slot: 'Material',
        stackable: true,
        isDisassembleable: false,
    },

    {
        name: 'Partical Fuser',
        type: 'material',
        icon: 'icons/plastic_parts.png',
        slot: 'Material',
        stackable: true,
        isDisassembleable: false,
    },

    // Add more items with respective slots and effects
];
