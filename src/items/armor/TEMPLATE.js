// src/items/armor/TEMPLATE.js
// Copy this file to create a new armor piece
// Rename the file to match your armor's name (camelCase)
// After creating the file, make sure to import and add it to index.js

export default {
    name: "Your Armor Name",
    type: "Armor", // Or Helmet, Boots, Gloves, Shield, etc.
    icon: "icons/your_icon.png",
    
    // Optional damage properties
    damageTypes: {
        // Add if armor provides damage (like gauntlets)
        // kinetic: "3-6"
    },
    // Use simplified range syntax for modifiers as needed
    attackSpeedModifier: "0-0", // % (negative values like "-10--5" are allowed)
    criticalChanceModifier: "0-0", // %
    criticalMultiplierModifier: "0-0", // %
    
    // Defense properties
    defenseTypes: {
        physicalResistance: "10-20", // Physical defense
        elementalResistance: "5-15",   // Elemental defense
        chemicalResistance: "5-10"    // Chemical defense
    },
    
    // Health and shield bonuses
    healthBonus: "20-50",
    healthBonusPercent: "10-15", // %
    energyShieldBonus: "30-60",
    energyShieldBonusPercent: "5-10", // %
    healthRegen: "1-3",
    
    // Combat stats
    precision: "2-5",
    deflection: "2-5",
    // New stats - remove if not needed
    armorEfficiency: "3-12", // Increases armor proc effect chances
    
    // Equipment slot
    slot: 'chest', // head, chest, legs, feet, gloves, offHand
    
    // Special effects
    effects: [
        // {
        //     trigger: 'whenHit', // whenHit, onHit, etc.
        //     chance: 0.1, // 10% chance
        //     action: 'heal', // heal, dealDamage, applyBuff, etc.
        //     parameters: {
        //         // Parameters specific to the action
        //         amount: 25
        //     }
        // }
    ],
    
    // Disassembly settings
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 },
        // Add more materials...
    ],
    
    description: 'Armor description goes here.'
}; 