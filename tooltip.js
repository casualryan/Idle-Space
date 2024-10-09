function getItemTooltipContent(item) {
    let content = `<strong>${item.name}</strong><br>`;
    content += `Type: ${item.type}<br>`;
    if (item.weaponType) {
        content += `Weapon Type: ${item.weaponType}<br>`;
    }

    // Display damage types (flat values or ranges)
    if (item.damageTypes) {
        for (let damageType in item.damageTypes) {
            const damageValue = item.damageTypes[damageType];
            if (typeof damageValue === 'object' && damageValue.min !== undefined && damageValue.max !== undefined) {
                content += `${capitalize(damageType)} Damage: ${damageValue.min} - ${damageValue.max}<br>`;
            } else {
                content += `${capitalize(damageType)} Damage: ${damageValue}<br>`;
            }
        }
    }

    // Display percentage damage type modifiers (with ranges if available)
    if (item.statModifiers && item.statModifiers.damageTypes) {
        for (let damageType in item.statModifiers.damageTypes) {
            const modifierValue = item.statModifiers.damageTypes[damageType];
            if (typeof modifierValue === 'object' && modifierValue.min !== undefined && modifierValue.max !== undefined) {
                content += `+${modifierValue.min}% - +${modifierValue.max}% ${capitalize(damageType)} Damage<br>`;
            } else {
                content += `+${modifierValue}% ${capitalize(damageType)} Damage<br>`;
            }
        }
    }

    // Display other stat modifiers (with ranges if available)
    if (item.statModifiers) {
        for (let stat in item.statModifiers) {
            if (stat !== 'damageTypes') { // Skip damageTypes as it's handled above
                const statValue = item.statModifiers[stat];
                if (typeof statValue === 'object' && statValue.min !== undefined && statValue.max !== undefined) {
                    content += `${capitalize(stat)}: +${statValue.min}% - +${statValue.max}%<br>`;
                } else {
                    content += `${capitalize(stat)}: +${statValue}%<br>`;
                }
            }
        }
    }

    // Display defense types (flat values or ranges)
    if (item.defenseTypes) {
        for (let defenseType in item.defenseTypes) {
            const defenseValue = item.defenseTypes[defenseType];
            if (typeof defenseValue === 'object' && defenseValue.min !== undefined && defenseValue.max !== undefined) {
                content += `+${defenseValue.min} - +${defenseValue.max} ${capitalize(defenseType)}<br>`;
            } else {
                content += `+${defenseValue} ${capitalize(defenseType)}<br>`;
            }
        }
    }

    // Display health bonuses (flat values or ranges)
    if (item.healthBonus) {
        content += `+${item.healthBonus.min} - +${item.healthBonus.max} Health<br>`;
    }
    if (item.healthBonusPercentDisplay !== undefined) {
        content += `+${item.healthBonusPercentDisplay}% Health<br>`;
    }
    if (item.healthBonusPercentRange) {
        content += `+${item.healthBonusPercentRange.min}% - +${item.healthBonusPercentRange.max}% Health<br>`;
    }

    // Display energy shield bonuses (flat values or ranges)
    if (item.energyShieldBonus) {
        content += `+${item.energyShieldBonus.min} - +${item.energyShieldBonus.max} Energy Shield<br>`;
    }
    if (item.energyShieldBonusPercentDisplay !== undefined) {
        content += `+${item.energyShieldBonusPercentDisplay}% Energy Shield<br>`;
    }
    if (item.energyShieldBonusPercentRange) {
        content += `+${item.energyShieldBonusPercentRange.min}% - +${item.energyShieldBonusPercentRange.max}% Energy Shield<br>`;
    }

    // Other stats (with ranges if available)
    if (item.attackSpeedModifierPercent !== undefined) {
        content += `Attack Speed: ${item.attackSpeedModifierPercent}%<br>`;
    }
    if (item.attackSpeedModifierRange) {
        content += `Attack Speed: +${item.attackSpeedModifierRange.min}% - +${item.attackSpeedModifierRange.max}%<br>`;
    }
    if (item.criticalChanceModifierPercent !== undefined) {
        content += `Critical Chance: ${item.criticalChanceModifierPercent}%<br>`;
    }
    if (item.criticalChanceModifierRange) {
        content += `Critical Chance: +${item.criticalChanceModifierRange.min}% - +${item.criticalChanceModifierRange.max}%<br>`;
    }
    if (item.criticalMultiplierModifierPercent !== undefined) {
        content += `Critical Multiplier: ${item.criticalMultiplierModifierPercent}%<br>`;
    }
    if (item.criticalMultiplierModifierRange) {
        content += `Critical Multiplier: +${item.criticalMultiplierModifierRange.min}% - +${item.criticalMultiplierModifierRange.max}%<br>`;
    }

    // Level requirement
    if (item.levelRequirement !== undefined) {
        content += `Level Requirement: ${item.levelRequirement}<br>`;
    }

    // Item description
    if (item.description) {
        content += `<em>${item.description}</em><br>`;
    }

    return content;
}

// Helper function to capitalize the first letter
function capitalize(str) {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}
