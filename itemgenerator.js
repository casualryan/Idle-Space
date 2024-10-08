// itemgenerator.js

function createItemInstance(template) {
    const item = { ...template };
    if (typeof item.quantity === 'undefined') {
        item.quantity = 1;
    }
    // Do not overwrite item.quantity if it is already set
    return item;
}

function generateItemInstance(template) {
    const item = { ...template }; // Shallow copy of the template

    // Roll damage types with ranges
    if (template.damageTypes) {
        item.damageTypes = {};
        for (let damageType in template.damageTypes) {
            const range = template.damageTypes[damageType];
            if (typeof range === 'object' && range.min !== undefined && range.max !== undefined) {
                item.damageTypes[damageType] = getRandomInt(range.min, range.max);
            } else {
                item.damageTypes[damageType] = range; // Fixed value
            }
        }
    }

    if (template.defenseTypes) {
        item.defenseTypes = {};
        for (let defenseType in template.defenseTypes) {
            const range = template.defenseTypes[defenseType];
            if (typeof range === 'object' && range.min !== undefined && range.max !== undefined) {
                item.defenseTypes[defenseType] = getRandomInt(range.min, range.max);
            } else {
                item.defenseTypes[defenseType] = range; // Fixed value
            }
        }
    }

    // Roll percentage damage modifiers
    if (template.statModifiers && template.statModifiers.damageTypes) {
        item.statModifiers = { damageTypes: {} };
        for (let damageType in template.statModifiers.damageTypes) {
            const range = template.statModifiers.damageTypes[damageType];
            if (typeof range === 'object' && range.min !== undefined && range.max !== undefined) {
                const percent = getRandomInt(range.min, range.max);
                item.statModifiers.damageTypes[damageType] = percent;
            } else {
                item.statModifiers.damageTypes[damageType] = template.statModifiers.damageTypes[damageType]; // Fixed value
            }
        }
    }

    if (template.healthBonus) {
        if (typeof template.healthBonus === 'object') {
            item.healthBonus = getRandomInt(template.healthBonus.min, template.healthBonus.max);
        } else {
            item.healthBonus = template.healthBonus; // Fixed value
        }
    }

    // Roll energy shield bonus
    if (template.energyShieldBonus) {
        if (typeof template.energyShieldBonus === 'object') {
            item.energyShieldBonus = getRandomInt(template.energyShieldBonus.min, template.energyShieldBonus.max);
        } else {
            item.energyShieldBonus = template.energyShieldBonus; // Fixed value
        }
    }

    // Roll percentage health bonus
    if (template.healthBonusPercentRange) {
        const percent = getRandomInt(template.healthBonusPercentRange.min, template.healthBonusPercentRange.max);
        item.healthBonusPercent = percent / 100; // For calculations
        item.healthBonusPercentDisplay = percent; // For display
    } else if (template.healthBonusPercent !== undefined) {
        item.healthBonusPercent = template.healthBonusPercent;
        item.healthBonusPercentDisplay = item.healthBonusPercent * 100;
    }

    // Roll percentage energy shield bonus
    if (template.energyShieldBonusPercentRange) {
        const percent = getRandomInt(template.energyShieldBonusPercentRange.min, template.energyShieldBonusPercentRange.max);
        item.energyShieldBonusPercent = percent / 100; // For calculations
        item.energyShieldBonusPercentDisplay = percent; // For display
    } else if (template.energyShieldBonusPercent !== undefined) {
        item.energyShieldBonusPercent = template.energyShieldBonusPercent;
        item.energyShieldBonusPercentDisplay = item.energyShieldBonusPercent * 100;
    }

    // Roll attack speed modifier
    if (template.attackSpeedModifierRange) {
        const percent = getRandomInt(template.attackSpeedModifierRange.min, template.attackSpeedModifierRange.max);
        item.attackSpeedModifier = percent / 100; // For calculations
        item.attackSpeedModifierPercent = percent; // For display
    }

    // Roll critical chance modifier
    if (template.criticalChanceModifierRange) {
        const percent = getRandomInt(template.criticalChanceModifierRange.min, template.criticalChanceModifierRange.max);
        item.criticalChanceModifier = percent / 100; // For calculations
        item.criticalChanceModifierPercent = percent; // For display
    }

    // Roll critical multiplier modifier
    if (template.criticalMultiplierModifierRange) {
        const percent = getRandomInt(template.criticalMultiplierModifierRange.min, template.criticalMultiplierModifierRange.max);
        item.criticalMultiplierModifier = percent / 100; // For calculations
        item.criticalMultiplierModifierPercent = percent; // For display
    }

    // Copy other properties
    if (typeof item.quantity === 'undefined') {
        item.quantity = 1; // Default quantity for non-stackable items
    }

    return item;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
