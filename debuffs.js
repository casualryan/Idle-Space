// Core Debuffs System
// Each damage type has 2 associated debuffs with unique effects

const DEBUFF_BASE_CHANCE = 0.1; // 10% base chance to apply a debuff

// Helper function to determine if a debuff should be applied
function shouldApplyDebuff(chance = DEBUFF_BASE_CHANCE) {
    return Math.random() < chance;
}

// Debuff definitions
const debuffs = {
    // Kinetic Debuffs
    "staggered": {
        name: "Staggered",
        description: "Misses next attack, then removed",
        icon: "icons/debuff-staggered.png",
        damageType: "kinetic",
        duration: 1, // Duration in attacks, not time
        stackable: false,
        onApply: function(target) {
            console.log(`${target.name} is staggered and will miss their next attack!`);
        },
        onAttack: function(attacker) {
            console.log(`${attacker.name} missed their attack due to being staggered!`);
            // Remove the debuff after missing the attack
            removeDebuff(attacker, "staggered");
            return false; // Prevent the attack
        }
    },
    "crushed": {
        name: "Crushed",
        description: "Physical resistance reduced",
        icon: "icons/debuff-crushed.png",
        damageType: "kinetic",
        duration: 10, // Duration in seconds
        stackable: false,
        resistanceReduction: 10, // Base value, can be modified by stat bonuses
        onApply: function(target, applier) {
            const statBonus = applier.totalStats.debuffBonus || 0;
            this.resistanceReduction = 10 * (1 + statBonus);
            console.log(`${target.name} is crushed! Physical resistance reduced by ${this.resistanceReduction}%`);
            
            // Store original resistances to restore them later
            this.originalResistances = {};
            if (target.totalStats.defenseTypes) {
                const physicalResistance = target.totalStats.defenseTypes.physicalResistance || 0;
                this.originalResistances.physicalResistance = physicalResistance;
                target.totalStats.defenseTypes.physicalResistance = physicalResistance - (physicalResistance * (this.resistanceReduction / 100));
            }
        },
        onRemove: function(target) {
            // Restore original resistances
            if (this.originalResistances && target.totalStats.defenseTypes) {
                for (const type in this.originalResistances) {
                    target.totalStats.defenseTypes[type] = this.originalResistances[type];
                }
            }
            console.log(`${target.name} is no longer crushed.`);
        }
    },

    // Slashing Debuffs
    "exposed": {
        name: "Exposed",
        description: "Next attacks deal maximum damage",
        icon: "icons/debuff-exposed.png",
        damageType: "slashing",
        duration: 3, // Number of hits
        stackable: false,
        hitsRemaining: 3,
        onApply: function(target) {
            this.hitsRemaining = 3; // Reset counter on apply
            console.log(`${target.name} is exposed! Next ${this.hitsRemaining} hits will deal maximum damage!`);
        },
        onReceiveHit: function(target, damage) {
            if (this.hitsRemaining > 0) {
                this.hitsRemaining--;
                console.log(`${target.name} took maximum damage due to being exposed! (${this.hitsRemaining} hits remaining)`);
                
                if (this.hitsRemaining <= 0) {
                    removeDebuff(target, "exposed");
                }
                
                return {
                    maximizeDamage: true
                };
            }
            return {};
        }
    },
    "severedLimb": {
        name: "Severed Limb",
        description: "Damage permanently reduced to 3/4",
        icon: "icons/debuff-severed-limb.png",
        damageType: "slashing",
        duration: -1, // Permanent (-1)
        stackable: false,
        onApply: function(target) {
            // Check if already applied
            if (target.hasDebuff && target.hasDebuff("severedLimb")) {
                return false; // Don't apply again
            }
            
            console.log(`${target.name} has a severed limb! Damage permanently reduced to 3/4!`);
            
            // Store and modify damage multiplier
            if (!target.totalStats.damageMultipliers) {
                target.totalStats.damageMultipliers = {};
            }
            target.totalStats.damageMultipliers.severedLimb = 0.75;
        }
        // No onRemove as it's permanent
    },

    // Pyro Debuffs
    "scorched": {
        name: "Scorched",
        description: "All resistances reduced",
        icon: "icons/debuff-scorched.png",
        damageType: "pyro",
        duration: 10, // Duration in seconds
        stackable: false,
        resistanceReduction: 15, // percentage
        onApply: function(target, applier) {
            const statBonus = applier ? (applier.totalStats.debuffBonus || 0) : 0;
            this.resistanceReduction = 15 * (1 + statBonus);
            console.log(`${target.name} is scorched! All resistances reduced by ${this.resistanceReduction}%`);
            
            // Store original resistances
            this.originalResistances = {};
            if (target.totalStats.defenseTypes) {
                for (const type in target.totalStats.defenseTypes) {
                    this.originalResistances[type] = target.totalStats.defenseTypes[type];
                    target.totalStats.defenseTypes[type] -= target.totalStats.defenseTypes[type] * (this.resistanceReduction / 100);
                }
            }
        },
        onRemove: function(target) {
            // Restore original resistances
            if (this.originalResistances && target.totalStats.defenseTypes) {
                for (const type in this.originalResistances) {
                    target.totalStats.defenseTypes[type] = this.originalResistances[type];
                }
            }
            console.log(`${target.name} is no longer scorched.`);
        }
    },
    "exposedWeakness": { // Added from buffs.js
        name: "Exposed Weakness",
        description: "Target's resistances are reduced.",
        icon: "icons/debuff-generic.png", // Placeholder icon
        damageType: null, // Not tied to a specific damage type
        duration: 10, // Duration in seconds
        stackable: false,
        resistanceReduction: 30, // Flat reduction amount
        onApply: function(target) {
            console.log(`${target.name} has Exposed Weakness! All resistances reduced by ${this.resistanceReduction}!`);
            // Store original resistances
            this.originalResistances = {};
            if (target.totalStats && target.totalStats.defenseTypes) {
                // Define the defense types to affect
                const defenseTypesToReduce = ['physicalResistance', 'elementalResistance', 'chemicalResistance'];
                for (const type of defenseTypesToReduce) {
                    this.originalResistances[type] = target.totalStats.defenseTypes[type] || 0;
                    // Apply flat reduction
                    target.totalStats.defenseTypes[type] = (target.totalStats.defenseTypes[type] || 0) - this.resistanceReduction;
                }
            }
            // Update UI
            if (target === player && typeof updatePlayerStatsDisplay === 'function') updatePlayerStatsDisplay();
            else if (target === enemy && typeof updateEnemyStatsDisplay === 'function') updateEnemyStatsDisplay();
        },
        onRemove: function(target) {
            // Restore original resistances
            if (this.originalResistances && target.totalStats && target.totalStats.defenseTypes) {
                 const defenseTypesToRestore = ['physicalResistance', 'elementalResistance', 'chemicalResistance'];
                 for (const type of defenseTypesToRestore) {
                    // Restore only if we have a stored original value
                    if (this.originalResistances.hasOwnProperty(type)) {
                         target.totalStats.defenseTypes[type] = this.originalResistances[type];
                    }
                 }
            }
            console.log(`${target.name} no longer has Exposed Weakness.`);
            // Update UI
             if (target === player && typeof updatePlayerStatsDisplay === 'function') updatePlayerStatsDisplay();
             else if (target === enemy && typeof updateEnemyStatsDisplay === 'function') updateEnemyStatsDisplay();
        }
    },
    "ablaze": {
        name: "Ablaze",
        description: "Takes 200% of hit damage over 5 seconds",
        icon: "icons/debuff-ablaze.png",
        damageType: "pyro",
        duration: 5, // Duration in seconds (changed from 8 to 5)
        stackable: false,
        tickInterval: 1, // Damage tick every second
        lastTickTime: 0,
        type: 'damage_over_time', // For UI color coding
        onApply: function(target, applier, damage) {
            this.lastTickTime = Date.now();
            
            // Store the total damage amount that will be dealt over the duration
            this.totalDamageAmount = damage ? damage * 2 : 10; // 200% of hit damage or 10 if no damage
            
            // Calculate per-tick damage (divide by duration in seconds)
            this.damagePerTick = this.totalDamageAmount / this.duration;
            
            console.log(`${target.name} is ablaze! Will take ${this.totalDamageAmount} total pyro damage (${this.damagePerTick} per second) for ${this.duration} seconds!`);
            
            // If combat log function exists, add a detailed message
            if (typeof addToCombatLog === 'function') {
                const message = `${target.name} is <span style="color: #FF4500; font-weight: bold;">ABLAZE</span>! Taking ${Math.round(this.damagePerTick)} pyro damage per second for ${this.duration} seconds (${Math.round(this.totalDamageAmount)} total)`;
                addToCombatLog(message, "#FF4500", true);
            }
        },
        onTick: function(target, deltaTime) {
            const now = Date.now();
            if (now - this.lastTickTime >= this.tickInterval * 1000) {
                // Apply the per-tick damage
                const dotDamage = this.damagePerTick;
                applyEffectDamage(target, dotDamage, "pyro", false, "Ablaze debuff");
                this.lastTickTime = now;
                console.log(`${target.name} took ${dotDamage} pyro damage from being ablaze!`);
            }
        }
    },

    // Cryo Debuffs
    "brittle": {
        name: "Brittle",
        description: "Each hit deals bonus cryo damage",
        icon: "icons/debuff-brittle.png",
        damageType: "cryo",
        duration: 6, // Duration in seconds
        stackable: false,
        onApply: function(target) {
            console.log(`${target.name} is brittle! Each hit will deal 50% bonus cryo damage!`);
        },
        onReceiveHit: function(target, damage, attacker) {
            const bonusDamage = Math.round(damage.total * 0.5);
            console.log(`${target.name} took ${bonusDamage} bonus cryo damage from being brittle!`);
            applyEffectDamage(target, bonusDamage, "cryo", false, true); // Apply damage without triggering on-hit effects
        }
    },
    "frigid": {
        name: "Frigid",
        description: "Attack speed halved",
        icon: "icons/debuff-frigid.png",
        damageType: "cryo",
        duration: 5, // Duration in seconds
        stackable: false,
        onApply: function(target) {
            console.log(`${target.name} is frigid! Attack speed halved for ${this.duration} seconds!`);
            // Store original attack speed
            this.originalAttackSpeed = target.totalStats.attackSpeed;
            target.totalStats.attackSpeed *= 0.5;
        },
        onRemove: function(target) {
            // Restore original attack speed
            if (this.originalAttackSpeed) {
                target.totalStats.attackSpeed = this.originalAttackSpeed;
            }
            console.log(`${target.name} is no longer frigid.`);
        }
    },

    // Electric Debuffs
    "zapped": {
        name: "Zapped",
        description: "Next hit is a guaranteed critical with bonus damage",
        icon: "icons/debuff-zapped.png",
        damageType: "electric",
        duration: -1, // Until next attack
        stackable: false,
        critBonus: 50, // Percentage
        onApply: function(target, applier) {
            const statBonus = applier ? (applier.totalStats.debuffBonus || 0) : 0;
            this.critBonus = 50 * (1 + statBonus);
            console.log(`${target.name} is zapped! Next hit will be a critical with ${this.critBonus}% bonus critical damage!`);
        },
        onAttack: function(attacker, defender) {
            // This should be checked before the attack is processed
            console.log(`${attacker.name}'s next attack will be a guaranteed critical with bonus damage!`);
            removeDebuff(attacker, "zapped");
            return {
                guaranteeCritical: true,
                criticalDamageBonus: this.critBonus / 100
            };
        }
    },
    "shocked": {
        name: "Shocked",
        description: "Takes 2x damage of next hit",
        icon: "icons/debuff-shocked.png",
        damageType: "electric",
        duration: -1, // Until next hit
        stackable: false,
        storedDamage: 0,
        onApply: function(target, damage) {
            this.storedDamage = damage ? damage.total * 2 : 0;
            console.log(`${target.name} is shocked! Will take ${this.storedDamage} damage on next hit!`);
        },
        onReceiveHit: function(target, damage) {
            console.log(`${target.name} took ${this.storedDamage} additional damage from shock!`);
            applyEffectDamage(target, this.storedDamage, "electric");
            removeDebuff(target, "shocked");
        }
    },

    // Corrosive Debuffs
    "rusted": {
        name: "Rusted",
        description: "Attack speed, damage, and resistances reduced to 3/4",
        icon: "icons/debuff-rusted.png",
        damageType: "corrosive",
        duration: 7, // Duration in seconds
        stackable: false,
        onApply: function(target) {
            console.log(`${target.name} is rusted! Attack speed, damage, and resistances reduced to 3/4!`);
            
            // Store original values
            this.originalStats = {
                attackSpeed: target.totalStats.attackSpeed,
                damageMultiplier: target.totalStats.damageMultiplier || 1,
                defenseTypes: {}
            };
            
            // Modify attack speed
            target.totalStats.attackSpeed *= 0.75;
            
            // Modify damage multiplier
            if (!target.totalStats.damageMultipliers) {
                target.totalStats.damageMultipliers = {};
            }
            target.totalStats.damageMultipliers.rusted = 0.75;
            
            // Modify resistances
            if (target.totalStats.defenseTypes) {
                for (const type in target.totalStats.defenseTypes) {
                    this.originalStats.defenseTypes[type] = target.totalStats.defenseTypes[type];
                    target.totalStats.defenseTypes[type] *= 0.75;
                }
            }
        },
        onRemove: function(target) {
            // Restore original values
            if (this.originalStats) {
                target.totalStats.attackSpeed = this.originalStats.attackSpeed;
                
                if (target.totalStats.damageMultipliers) {
                    delete target.totalStats.damageMultipliers.rusted;
                }
                
                if (target.totalStats.defenseTypes && this.originalStats.defenseTypes) {
                    for (const type in this.originalStats.defenseTypes) {
                        target.totalStats.defenseTypes[type] = this.originalStats.defenseTypes[type];
                    }
                }
            }
            console.log(`${target.name} is no longer rusted.`);
        }
    },
    "coatedInAcid": {
        name: "Coated in Acid",
        description: "Takes corrosive damage over time",
        icon: "icons/debuff-acid.png",
        damageType: "corrosive",
        duration: 6, // Duration in seconds
        stackable: false,
        tickInterval: 1, // Damage tick every second
        lastTickTime: 0,
        onApply: function(target, applier) {
            this.lastTickTime = Date.now();
            this.baseDamage = applier ? (applier.totalStats.damageTypes.corrosive * 0.15) : 8;
            console.log(`${target.name} is coated in acid! Taking ${this.baseDamage} corrosive damage per second for ${this.duration} seconds!`);
        },
        onTick: function(target, deltaTime) {
            const now = Date.now();
            if (now - this.lastTickTime >= this.tickInterval * 1000) {
                const dotDamage = this.baseDamage;
                applyEffectDamage(target, dotDamage, "corrosive");
                this.lastTickTime = now;
                console.log(`${target.name} took ${dotDamage} corrosive damage from acid!`);
            }
        }
    },

    // Radioactive Debuffs
    "unstable": {
        name: "Unstable",
        description: "Takes 4x damage on next attack",
        icon: "icons/debuff-unstable.png",
        damageType: "radiation",
        duration: -1, // Until next attack
        stackable: false,
        onApply: function(target) {
            console.log(`${target.name} is unstable! Will take 4x their own damage on next attack!`);
        },
        onAttack: function(attacker, defender, damage) {
            if (damage && damage.total) {
                const reflectedDamage = damage.total * 4;
                console.log(`${attacker.name} took ${reflectedDamage} radiation damage from being unstable!`);
                applyEffectDamage(attacker, reflectedDamage, "radiation");
            }
            removeDebuff(attacker, "unstable");
        }
    },
    "radPoisoning": {
        name: "Rad Poisoning",
        description: "Stacking debuff dealing damage over time",
        icon: "icons/debuff-rad-poisoning.png",
        damageType: "radiation",
        duration: -1, // Permanent (-1)
        stackable: true,
        stacks: 1,
        maxStacks: 10,
        tickInterval: 2, // Damage tick every 2 seconds
        lastTickTime: 0,
        onApply: function(target, applier) {
            this.lastTickTime = Date.now();
            // If already has the debuff, increase stacks
            const existingDebuff = target.activeDebuffs ? target.activeDebuffs.find(d => d.name === this.name) : null;
            if (existingDebuff) {
                existingDebuff.stacks = Math.min(existingDebuff.stacks + 1, this.maxStacks);
                this.stacks = existingDebuff.stacks;
                console.log(`${target.name}'s rad poisoning increased to ${this.stacks} stacks!`);
                return false; // Don't apply a new instance
            } else {
                console.log(`${target.name} has rad poisoning! Taking radiation damage over time.`);
                return true;
            }
        },
        onTick: function(target, deltaTime) {
            const now = Date.now();
            if (now - this.lastTickTime >= this.tickInterval * 1000) {
                // Damage scales with stacks
                const dotDamage = 2 * this.stacks;
                applyEffectDamage(target, dotDamage, "radiation");
                this.lastTickTime = now;
                console.log(`${target.name} took ${dotDamage} radiation damage from rad poisoning (${this.stacks} stacks)!`);
            }
        }
    },
    "seepingWound": {
        name: "Seeping Wound",
        description: "Deals 10% of the damage that applied this debuff every 0.5 seconds for 10 seconds. Stacks 5 times.",
        icon: "icons/debuff-seeping-wound.png",
        damageType: "slashing",
        duration: 10, // Duration in seconds
        stackable: true,
        stacks: 1,
        maxStacks: 10,
        tickInterval: 0.5, // Damage tick every 0.5 seconds
        lastTickTime: 0,
        baseDamagePercent: 0.10, // 10% of original damage
        sourceDamage: 0, // Will be set when applied
        onApply: function(target, applier, sourceDamage) {
            this.lastTickTime = Date.now();
            this.sourceDamage = sourceDamage || 0;
            
            // If already has the debuff, increase stacks
            const existingDebuff = target.activeDebuffs ? target.activeDebuffs.find(d => d.name === this.name) : null;
            if (existingDebuff) {
                existingDebuff.stacks = Math.min(existingDebuff.stacks + 1, this.maxStacks);
                this.stacks = existingDebuff.stacks;
                // Update source damage to the highest value
                if (this.sourceDamage > existingDebuff.sourceDamage) {
                    existingDebuff.sourceDamage = this.sourceDamage;
                }
                console.log(`${target.name}'s seeping wound deepened to ${this.stacks} stacks!`);
                
                // Add to combat log
                if (typeof addToCombatLog === 'function') {
                    addToCombatLog(`⚠️ Seeping Wound stacks increased on ${target.name} (${this.stacks}/${this.maxStacks})`, '#cc3366', true);
                }
                return false; // Don't apply a new instance
            } else {
                console.log(`${target.name} has a seeping wound! Taking ${Math.round(this.sourceDamage * this.baseDamagePercent)} damage every ${this.tickInterval} seconds.`);
                
                // Add to combat log
                if (typeof addToCombatLog === 'function') {
                    addToCombatLog(`⚠️ Seeping Wound applied to ${target.name}! (${Math.round(this.sourceDamage * this.baseDamagePercent)} damage per tick)`, '#cc3366', true);
                }
                return true;
            }
        },
        onTick: function(target, deltaTime) {
            const now = Date.now();
            if (now - this.lastTickTime >= this.tickInterval * 1000) {
                // Damage is 10% of source damage per stack
                const tickDamage = Math.round((this.sourceDamage * this.baseDamagePercent) * this.stacks);
                applyEffectDamage(target, tickDamage, "slashing");
                this.lastTickTime = now;
                
                console.log(`${target.name} took ${tickDamage} slashing damage from seeping wound (${this.stacks} stacks)!`);
                
                // Add to combat log
                if (typeof addToCombatLog === 'function') {
                    addToCombatLog(`${target.name} bleeds for ${tickDamage} damage from Seeping Wound`, '#ff6666', false);
                }
            }
        }
    }
};

// Function to display a formatted message in the combat log about debuff application
function displayDebuffMessage(target, debuffName, isApplied) {
    const messageType = isApplied ? 'applied' : 'removed';
    const messageColor = isApplied ? '#ff6b6b' : '#63e6be'; // Red for applied, Green for removed
    
    const message = isApplied ? 
        `⚠️ ${debuffName} applied to ${target.name}! ⚠️` : 
        `✓ ${debuffName} removed from ${target.name}`;
    
    // Add to combat log with formatting
    if (typeof addToCombatLog === 'function') {
        addToCombatLog(message, messageColor, true);
    } else {
        // Fallback to console if addToCombatLog isn't available
        console.log(`%c${message}`, `color: ${messageColor}; font-weight: bold;`);
    }
    
    // Also display a visual indicator if the display popup function exists
    if (typeof displayDamagePopup === 'function') {
        // Treat the popup source as the attacker (inverse of target)
        const isFromPlayer = !target.isPlayer;
        displayDamagePopup(message, isFromPlayer);
    }
}

// Function to apply a debuff to a target
function applyDebuff(target, debuffName, source = null, damage = null) {
    if (!target || !debuffs[debuffName]) return false;
    
    // Initialize debuffs array if needed
    if (!target.activeDebuffs) {
        target.activeDebuffs = [];
    }
    
    // Check if already affected by this debuff
    const existingDebuffIndex = target.activeDebuffs.findIndex(d => d.name === debuffs[debuffName].name);
    
    // If stackable, update stacks or duration
    if (existingDebuffIndex !== -1) {
        const existingDebuff = target.activeDebuffs[existingDebuffIndex];
        
        if (debuffs[debuffName].stackable) {
            // Clone the debuff to keep the prototype methods
            const newDebuff = Object.assign({}, debuffs[debuffName]);
            // Apply the debuff, which will update stacks if applicable
            if (newDebuff.onApply && newDebuff.onApply(target, source, damage) === false) {
                // Just update duration if onApply returns false (meaning no new instance)
                existingDebuff.appliedTime = Date.now();
                return true;
            } else {
                // Replace with new instance
                target.activeDebuffs[existingDebuffIndex] = newDebuff;
                newDebuff.appliedTime = Date.now();
                
                // Add hasDebuff method to target if not already present
                if (!target.hasDebuff) {
                    target.hasDebuff = function(debuffName) {
                        return this.activeDebuffs && this.activeDebuffs.some(d => 
                            (d.name && d.name.toLowerCase() === debuffName.toLowerCase()) ||
                            (d.id && d.id.toLowerCase() === debuffName.toLowerCase())
                        );
                    };
                }
                
                // Display message about stacks increased
                displayDebuffMessage(target, `${newDebuff.name} (${newDebuff.stacks} stacks)`, true);
                return true;
            }
        } else {
            // Just refresh the duration
            existingDebuff.appliedTime = Date.now();
            
            // Display refreshed message
            displayDebuffMessage(target, `${existingDebuff.name} (refreshed)`, true);
            return true;
        }
    } else {
        // Clone the debuff to create a new instance
        const newDebuff = Object.assign({}, debuffs[debuffName]);
        newDebuff.appliedTime = Date.now();
        
        // Call onApply if it exists
        if (newDebuff.onApply) {
            if (newDebuff.onApply(target, source, damage) === false) {
                return false; // Debuff application was canceled
            }
        }
        
        // Add to active debuffs
        target.activeDebuffs.push(newDebuff);
        
        // Add hasDebuff method to target if not already present
        if (!target.hasDebuff) {
            target.hasDebuff = function(debuffName) {
                return this.activeDebuffs && this.activeDebuffs.some(d => 
                    (d.name && d.name.toLowerCase() === debuffName.toLowerCase()) ||
                    (d.id && d.id.toLowerCase() === debuffName.toLowerCase())
                );
            };
        }
        
        // Display application message
        displayDebuffMessage(target, newDebuff.name, true);
        return true;
    }
}

// Function to remove a debuff
function removeDebuff(target, debuffName) {
    if (!target || !target.activeDebuffs) return false;
    
    const index = target.activeDebuffs.findIndex(d => 
        (d.name && d.name.toLowerCase() === debuffName.toLowerCase()) ||
        (d.id && d.id.toLowerCase() === debuffName.toLowerCase())
    );
    
    if (index !== -1) {
        const debuff = target.activeDebuffs[index];
        
        // Call onRemove if it exists
        if (debuff.onRemove) {
            debuff.onRemove(target);
        }
        
        // Display removal message
        displayDebuffMessage(target, debuff.name, false);
        
        // Remove the debuff
        target.activeDebuffs.splice(index, 1);
        return true;
    }
    
    return false;
}

// Function to process active debuffs on an entity
function processDebuffs(entity, deltaTime) {
    if (!entity || !entity.activeDebuffs || !Array.isArray(entity.activeDebuffs)) {
        return;
    }
    
    const now = Date.now();
    const debuffsToRemove = [];
    
    for (let i = 0; i < entity.activeDebuffs.length; i++) {
        const debuff = entity.activeDebuffs[i];
        if (!debuff) continue;
        
        // Calculate elapsed time
        const elapsedTime = (now - debuff.appliedTime) / 1000;
        
        // Check if expired
        if (debuff.duration && elapsedTime >= debuff.duration) {
            debuffsToRemove.push(i);
            continue;
        }
        
        // Process tick for time-based effects
        if (debuff.tickInterval && typeof debuff.onTick === 'function') {
            // Initialize or update lastTickTime
            if (!debuff.lastTickTime) {
                debuff.lastTickTime = debuff.appliedTime;
            }
            
            const tickElapsedTime = (now - debuff.lastTickTime) / 1000;
            if (tickElapsedTime >= debuff.tickInterval) {
                // Call the onTick method
                try {
                    debuff.onTick(entity, elapsedTime, deltaTime);
                    // Show tick effect in the combat log
                    if (typeof window.addToCombatLog === 'function') {
                        window.addToCombatLog(`${debuff.name} ticks on ${entity.name || "entity"}`, '#ff9966', false);
                    }
                } catch (error) {
                    console.error(`Error processing tick for debuff ${debuff.name}:`, error);
                }
                
                // Update last tick time
                debuff.lastTickTime = now;
            }
        }
    }
    
    // Remove expired debuffs in reverse order
    for (let i = debuffsToRemove.length - 1; i >= 0; i--) {
        const index = debuffsToRemove[i];
        const debuff = entity.activeDebuffs[index];
        
        // Call onRemove before removing
        if (debuff && typeof debuff.onRemove === 'function') {
            try {
                debuff.onRemove(entity);
            } catch (error) {
                console.error(`Error removing debuff ${debuff.name}:`, error);
            }
        }
        
        // Display expiration message
        if (debuff && debuff.name) {
            if (typeof window.addToCombatLog === 'function') {
                window.addToCombatLog(`${debuff.name} has expired on ${entity.name || "entity"}`, '#63e6be', true);
            } else if (typeof displayDebuffMessage === 'function') {
                displayDebuffMessage(entity, debuff.name, false);
            }
        }
        
        // Remove the debuff
        entity.activeDebuffs.splice(index, 1);
    }
    
    // Update UI if available
    if (entity === player && typeof updatePlayerDebuffsUI === 'function') {
        updatePlayerDebuffsUI();
    } else if (entity === enemy && typeof updateEnemyDebuffsUI === 'function') {
        updateEnemyDebuffsUI();
    }
}

// Expose the function globally
window.processDebuffs = processDebuffs;

// Function to try applying a random debuff based on damage type
function tryApplyDebuffFromDamage(source, target, damageInfo) {
    if (!source || !target || !damageInfo) {
        console.log("tryApplyDebuffFromDamage: Missing source, target, or damageInfo");
        return;
    }
    
    // Don't apply debuffs from enemies to players
    if (source.isEnemy && target.isPlayer) {
        console.log("tryApplyDebuffFromDamage: Enemies can't apply debuffs to players");
        return;
    }
    
    console.log("tryApplyDebuffFromDamage called with damageInfo:", damageInfo);
    
    // Find the dominant damage type
    let maxDamage = 0;
    let dominantType = null;
    
    for (const damageType in damageInfo) {
        if (damageType !== 'total' && damageInfo[damageType] > maxDamage) {
            maxDamage = damageInfo[damageType];
            dominantType = damageType;
        }
    }
    
    if (!dominantType) {
        console.log("tryApplyDebuffFromDamage: No dominant damage type found");
        return;
    }
    
    console.log(`tryApplyDebuffFromDamage: Dominant damage type is ${dominantType} with ${maxDamage} damage`);
    
    // Get debuffs for this damage type
    const typedDebuffs = Object.entries(debuffs).filter(([key, debuff]) => 
        debuff.damageType === dominantType
    );
    
    console.log(`tryApplyDebuffFromDamage: Found ${typedDebuffs.length} debuffs for type ${dominantType}`);
    
    // Check if we should apply a debuff (skill mods may add bonus chance)
    let debuffChance = DEBUFF_BASE_CHANCE;
    if (source && source._activeSkillDebuffBonus) {
        debuffChance += source._activeSkillDebuffBonus;
    }
    const shouldApply = shouldApplyDebuff(debuffChance);
    console.log(`tryApplyDebuffFromDamage: shouldApplyDebuff() returned ${shouldApply}`);
    
    if (shouldApply) {
        // Randomly select one of the debuffs for this type
        const randomIndex = Math.floor(Math.random() * typedDebuffs.length);
        const [debuffKey, debuffInfo] = typedDebuffs[randomIndex];
        
        console.log(`Attempting to apply ${debuffInfo.name} to ${target.name} from ${dominantType} damage`);
        
        // Pass both source and the damage value to applyDebuff
        const result = applyDebuff(target, debuffKey, source, damageInfo.total);
        console.log(`applyDebuff result: ${result}`);
        
        // Log the current state of target.activeDebuffs
        if (target.activeDebuffs) {
            console.log(`${target.name} active debuffs after application:`, 
                target.activeDebuffs.map(d => d.name));
        } else {
            console.log(`${target.name} has no activeDebuffs array after application`);
        }
    }
}
