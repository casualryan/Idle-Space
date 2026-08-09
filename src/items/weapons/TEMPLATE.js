// src/items/weapons/TEMPLATE.js
// Copy this file to create a new weapon
// Rename the file to match your weapon's name (camelCase)
// After creating the file, make sure to import and add it to index.js

export default {
    name: "Your Weapon Name",
    type: "Weapon",
    weaponType: "Sword", // Sword, Staff, Dagger, Pistol, etc.
    icon: "icons/your_icon.png",
    // Base attack speed can now be a fixed number or a range string/object
    // Examples: 1.0 or "1.0-1.0" or { min: 1.0, max: 1.2 }
    bAttackSpeed: "1.0-1.0",
    damageTypes: {
        // Add appropriate damage types (each value can be number, "min-max", or {min,max})
        kinetic: "10-20",
        // Additional damage types...
    },
    statModifiers: {
        damageTypes: {
            // Specific damage type modifiers in %
            kinetic: "5-10",
        },
        damageGroups: {
            // Group modifiers (physical, elemental, chemical)
            physical: "5-10"
        }
    },
    // Optional fields - remove if not needed
    // Use the simplified range format for all numeric stats
    attackSpeedModifier: "5-10",     // %
    criticalChanceModifier: "5-10",  // %
    criticalMultiplierModifier: "10-20", // %
    deflection: "0-0",
    // New stats - remove if not needed
    weaponEfficiency: "5-15", // flat
    comboAttack: "3-8", // % chance for additional strikes
    comboEffectiveness: "10-25", // % increases combo damage beyond base 20%
    additionalComboAttacks: "0-1", // Extra hits per combo (usually 0 or 1)
    defenseTypes: {
        // Add defense types if the weapon provides them
    },
    slot: 'mainHand', // mainHand, offHand, etc.
    passiveBonuses: {
        // Add passive bonuses if any (values can be number or "min-max")
    },
    // Special effects
    effects: [
        // {
        //     trigger: 'onHit', // onHit, onCritical, etc.
        //     chance: 0.2, // 20% chance
        //     action: 'dealDamage', // dealDamage, heal, applyBuff, applyDebuff
        //     parameters: {
        //         // Parameters specific to the action
        //     }
        // }
    ],
    // Disassembly settings
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Item Name', quantity: 1 },
        // Add more items...
    ],
    description: 'Weapon description goes here.'
};
