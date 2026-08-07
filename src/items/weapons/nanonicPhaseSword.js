// src/items/weapons/nanonicPhaseSword.js
export default {
    name: "Nanonic Phase Sword of Incision",
    type: "Weapon",
    weaponType: "Sword", 
    icon: "icons/ironsword.png", // TODO: Create proper icon
    bAttackSpeed: .8,
    levelRequirement: 1,
    salePrice: 1000,
    damageTypes: {
        slashing: { min: 300, max: 400 }
    },
    // Ignore 15% of enemy armor - implemented as armor penetration
    armorPenetration: 15, // 15% armor penetration
    statModifiers: {
        // +100% Severed Limb Chance
        severedLimbChance: 100,
        // +1 to maximum Severed Limbs on opponent  
        maxSeveredLimbs: 1,
        // +50% Precision
        precision: 50,
    },
    criticalChanceModifierRange: { min: 10, max: 20 },
    passiveBonuses: {
        "Kinetic Mastery": 3,
        "Slashing Mastery": 3
    },
    effects: [
        {
            trigger: 'onCritical',
            chance: 1.0, // 100% chance on critical strikes
            action: 'applyDebuff',
            parameters: {
                debuffName: 'seepingWound',
                duration: 10,
                useSourceDamage: true // Pass the damage that triggered this effect
            }
        }
    ],
    slot: 'mainHand',
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 3 },
        { name: 'Titanium Alloy Fragment', quantity: 2 },
        { name: 'Neural Processor', quantity: 1 }
    ],
    wires: {
        totalSlots: "2-2",
        blackSlotsMax: 1,
        colors: { red: "1-1", green: "1-1", blue: "1-1", black: "1-1" }
      },
    description: 'An advanced nanonic phase blade that cuts through reality itself. The nanobots embedded in the blade seek out weak points in flesh, causing devastating wounds that refuse to heal. Forged for the most elite warriors, this weapon represents the pinnacle of close-combat technology.'
};