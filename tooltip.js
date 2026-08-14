// ===============================
// TOOLTIP SYSTEM - GLOBAL APPROACH
// ===============================

function formatLevelRequirement(levelRequirement, showRanges = false) {
    if (levelRequirement == null) return '';
    if (typeof levelRequirement === 'number') return String(levelRequirement);
    if (typeof levelRequirement === 'object') {
        const min = levelRequirement.min;
        const max = levelRequirement.max;
        if (typeof min === 'number' && typeof max === 'number') {
            if (!showRanges || min === max) return String(min);
            return `${min}-${max}`;
        }
        if (typeof min === 'number') return String(min);
        if (typeof max === 'number') return String(max);
    }
    return '';
}

function isWeaponTooltipItem(item) {
    if (!item) return false;
    return (item.type || '').toLowerCase() === 'weapon' || item.slot === 'mainHand' || !!item.weaponType;
}

function getTooltipWeaponTaxonomy(item) {
    if (!isWeaponTooltipItem(item)) return null;
    const resolved = window.coreboundWeaponTaxonomy?.resolveWeapon?.(item);
    if (resolved) return resolved;
    if (!item.weaponFamily) return null;
    return {
        family: item.weaponFamily,
        familyLabel: item.weaponFamilyLabel || capitalize(item.weaponFamily),
        tags: Array.isArray(item.weaponTags) ? item.weaponTags : [],
        tagLabels: Array.isArray(item.weaponTags) ? item.weaponTags.map(tag => capitalize(tag)) : []
    };
}

function normalizeTooltipDamageType(type) {
    if (type === 'mental') return 'slashing';
    if (type === 'magnetic') return 'electric';
    if (type === 'chemical') return 'corrosive';
    return type;
}

function formatWeaponRangeValue(value, showRanges = false) {
    if (typeof value === 'number') return `${Math.round(value)}`;
    if (value && typeof value === 'object') {
        const min = Number(value.min);
        const max = Number(value.max);
        if (Number.isFinite(min) || Number.isFinite(max)) {
            const safeMin = Number.isFinite(min) ? min : (Number.isFinite(max) ? max : 0);
            const safeMax = Number.isFinite(max) ? max : safeMin;
            if (!showRanges || Math.round(safeMin) === Math.round(safeMax)) return `${Math.round(safeMin)}`;
            return `${Math.round(safeMin)}-${Math.round(safeMax)}`;
        }
    }
    return '0';
}

function buildWeaponLocalPreview(item, showRanges = false) {
    if (!item) return null;
    if (window.computeWeaponLocalProfile && !showRanges) {
        return window.computeWeaponLocalProfile(item);
    }
    const baseSource = item.weaponBaseDamage || item.baseDamageTypes || item.damageTypes || {};
    const baseDamage = {};
    Object.keys(baseSource).forEach((rawType) => {
        const type = normalizeTooltipDamageType(rawType);
        baseDamage[type] = baseSource[rawType];
    });
    return {
        baseDamage,
        finalDamage: item.finalWeaponDamageTypes || baseDamage,
        conversion: item.weaponDamageConversion || null,
        localAttackSpeedPercent: Number(item.weaponLocalAttackSpeedPercent || 0),
        localAttackSpeedMultiplier: 1 + (Number(item.weaponLocalAttackSpeedPercent || 0) / 100)
    };
}

const TOOLTIP_SLOT_LABELS = {
    mainHand: 'Main Hand',
    offHand: 'Off Hand',
    head: 'Head',
    chest: 'Chest',
    legs: 'Legs',
    feet: 'Boots',
    gloves: 'Gloves',
    bionic: 'Bionic',
    chip: 'Chip'
};

const TOOLTIP_DAMAGE_LABELS = {
    kinetic: 'Kinetic',
    slashing: 'Slashing',
    pyro: 'Fire',
    cryo: 'Cold',
    electric: 'Electric',
    corrosive: 'Corrosive',
    radiation: 'Radiation'
};

const TOOLTIP_DAMAGE_COLORS = {
    kinetic: '#ffd166',
    slashing: '#ff8787',
    pyro: '#ff6b6b',
    cryo: '#74c0fc',
    electric: '#ffd43b',
    corrosive: '#69db7c',
    radiation: '#da77f2'
};

const TOOLTIP_DEFENSE_LABELS = {
    physicalResistance: 'Physical Resistance',
    elementalResistance: 'Elemental Resistance',
    chemicalResistance: 'Chemical Resistance'
};

function tooltipTitle(value) {
    return String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, character => character.toUpperCase());
}

function cloneTooltipValue(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function formatTooltipNumber(value, options = {}) {
    const { showRanges = false, storedAsFraction = false, suffix = '', decimals = 2 } = options;
    const normalize = raw => {
        let number = Number(raw);
        if (!Number.isFinite(number)) return null;
        if (storedAsFraction) number *= 100;
        const rounded = Number(number.toFixed(decimals));
        return Number.isInteger(rounded) ? String(rounded) : String(rounded);
    };

    if (typeof value === 'string') {
        const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
        if (match) {
            const min = normalize(match[1]);
            const max = normalize(match[2]);
            if (min !== null && max !== null) return `${min === max ? min : `${min}-${max}`}${suffix}`;
        }
    }

    if (value && typeof value === 'object') {
        const min = normalize(value.min);
        const max = normalize(value.max !== undefined ? value.max : value.min);
        if (min === null && max === null) return '';
        if (!showRanges || min === max || max === null) return `${min ?? max}${suffix}`;
        return `${min ?? max}-${max}${suffix}`;
    }

    const formatted = normalize(value);
    return formatted === null ? '' : `${formatted}${suffix}`;
}

function getTooltipValueAtPath(source, path) {
    return String(path || '').split('.').reduce((node, key) => (
        node && typeof node === 'object' ? node[key] : undefined
    ), source);
}

function subtractTooltipValueAtPath(source, path, amount) {
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length || !Number.isFinite(Number(amount))) return;
    let node = source;
    for (let index = 0; index < parts.length - 1; index++) {
        node = node?.[parts[index]];
        if (!node || typeof node !== 'object') return;
    }
    const key = parts[parts.length - 1];
    const current = Number(node[key]);
    if (!Number.isFinite(current)) return;
    const remaining = Number((current - Number(amount)).toFixed(6));
    if (Math.abs(remaining) < 0.000001) delete node[key];
    else node[key] = remaining;
}

function getTooltipModifierStoragePath(item, modifier) {
    const path = modifier?.statPath || '';
    if (!isWeaponTooltipItem(item)) return path;
    if (path.startsWith('damageTypes.')) return path.replace('damageTypes.', 'weaponLocalFlatDamage.');
    if (path.startsWith('statModifiers.damageTypes.')) return path.replace('statModifiers.damageTypes.', 'weaponLocalTypeIncrease.');
    if (path.startsWith('statModifiers.damageGroups.')) return path.replace('statModifiers.damageGroups.', 'weaponLocalGroupIncrease.');
    if (path === 'attackSpeedModifier') return 'weaponLocalAttackSpeedPercent';
    return path;
}

function getTooltipBaseRollSource(item) {
    if (!item || typeof item !== 'object') return {};
    if (item.baseRolls && typeof item.baseRolls === 'object') return cloneTooltipValue(item.baseRolls);

    const base = cloneTooltipValue(item);
    if (!Array.isArray(item.rolledModifiers)) return base;

    item.rolledModifiers.forEach(modifier => {
        if (!modifier || typeof modifier !== 'object') return;
        const amount = Number(modifier.value);
        if (!Number.isFinite(amount)) return;
        if (modifier.id === 'allResistances' || modifier.statPath === 'defenseTypes') {
            ['physicalResistance', 'elementalResistance', 'chemicalResistance'].forEach(key => {
                subtractTooltipValueAtPath(base, `defenseTypes.${key}`, amount);
            });
            return;
        }
        subtractTooltipValueAtPath(base, getTooltipModifierStoragePath(item, modifier), amount);
    });
    return base;
}

function renderTooltipLine(value, label, color = '#cfe6ff', options = {}) {
    if (value === undefined || value === null || value === '') return '';
    const prefix = options.prefix === undefined ? '+' : options.prefix;
    return `<div style="color:${color};"><span style="color:${color}; font-weight:600;">${prefix}${value}</span> <span style="color:#d9eaff;">${label}</span>${options.detail || ''}</div>`;
}

function renderTooltipSection(title, lines, color = '#66ffcc') {
    const visibleLines = lines.filter(Boolean);
    if (!visibleLines.length) return '';
    return `<div style="background:rgba(0, 20, 45, 0.6); padding:5px 6px; margin-bottom:6px; border-radius:3px; border-left:2px solid ${color};">` +
        `<div style="color:${color}; font-weight:bold; margin-bottom:3px;">${title}</div>${visibleLines.join('')}</div>`;
}

function collectTooltipBaseRollLines(item, source, showRanges) {
    const lines = [];
    const push = (value, label, color, options = {}) => {
        const formatted = formatTooltipNumber(value, { showRanges, ...options });
        if (formatted) lines.push(renderTooltipLine(formatted, label, color, options));
    };

    const isWeapon = isWeaponTooltipItem(item);
    const damageSource = isWeapon
        ? (source.weaponBaseDamage || source.baseDamageTypes || source.damageTypes)
        : source.damageTypes;
    if (damageSource && typeof damageSource === 'object') {
        Object.entries(damageSource).forEach(([rawType, value]) => {
            const type = normalizeTooltipDamageType(rawType);
            push(value, `${TOOLTIP_DAMAGE_LABELS[type] || tooltipTitle(type)} Damage`, TOOLTIP_DAMAGE_COLORS[type] || '#ffd166', { prefix: '' });
        });
    }

    if (isWeapon && source.bAttackSpeed !== undefined) {
        push(source.bAttackSpeed, 'Attacks per Second', '#ffd3a5', { prefix: '', decimals: 2 });
    }

    if (source.defenseTypes && typeof source.defenseTypes === 'object') {
        Object.entries(source.defenseTypes).forEach(([key, value]) => {
            push(value, TOOLTIP_DEFENSE_LABELS[key] || tooltipTitle(key), '#8ab6ff', { suffix: '%' });
        });
    }

    const percentRangeValue = (key, legacyRangeKey) => {
        if (source[key] !== undefined) return source[key];
        return source[legacyRangeKey];
    };
    const actualFraction = key => !showRanges && source[key] !== undefined;
    const standardStats = [
        ['healthBonus', 'Health', '#51cf88', {}],
        ['energyShieldBonus', 'Energy Shield', '#74c0fc', {}],
        ['healthBonusPercent', 'Maximum Health', '#51cf88', { suffix: '%', storedAsFraction: actualFraction('healthBonusPercent'), legacy: 'healthBonusPercentRange' }],
        ['energyShieldBonusPercent', 'Maximum Energy Shield', '#74c0fc', { suffix: '%', storedAsFraction: actualFraction('energyShieldBonusPercent'), legacy: 'energyShieldBonusPercentRange' }],
        ['healthRegen', 'Health Regeneration', '#51cf88', { suffix: '/s' }],
        ['attackSpeedModifier', 'Attack Speed', '#ffd3a5', { suffix: '%', storedAsFraction: actualFraction('attackSpeedModifier'), legacy: 'attackSpeedModifierRange' }],
        ['criticalChanceModifier', 'Critical Chance', '#da77f2', { suffix: '%', storedAsFraction: actualFraction('criticalChanceModifier'), legacy: 'criticalChanceModifierRange' }],
        ['criticalMultiplierModifier', 'Critical Multiplier', '#da77f2', { suffix: '%', storedAsFraction: actualFraction('criticalMultiplierModifier'), legacy: 'criticalMultiplierModifierRange' }],
        ['precision', 'Precision', '#ffd166', {}],
        ['deflection', 'Deflection', '#8ab6ff', {}],
        ['armorEfficiency', 'Armor Efficiency', '#a8e6cf', { suffix: '%' }],
        ['weaponEfficiency', 'Weapon Efficiency', '#ffd3a5', { suffix: '%' }],
        ['bionicEfficiency', 'Bionic Efficiency', '#c5a3ff', { suffix: '%' }],
        ['bionicSync', 'Bionic Sync', '#b19cd9', { suffix: '%' }],
        ['comboAttack', 'Combo Attack Chance', '#ffcc80', { suffix: '%' }],
        ['comboEffectiveness', 'Combo Effectiveness', '#ffcc80', { suffix: '%' }],
        ['additionalComboAttacks', 'Additional Combo Attacks', '#ffcc80', {}],
        ['armorPenetration', 'Armor Penetration', '#ffd166', { suffix: '%' }],
        ['debuffChanceBonus', 'Status Application Chance', '#b197fc', { suffix: '%', maybeFraction: true }],
        ['debuffDurationBonus', 'Status Duration', '#b197fc', { suffix: '%', maybeFraction: true }],
        ['statusResistance', 'Status Resistance', '#8ab6ff', { suffix: '%', maybeFraction: true }],
        ['statusDurationReduction', 'Reduced Status Duration', '#8ab6ff', { suffix: '%', maybeFraction: true }],
        ['damageRollFloorBonus', 'Damage Roll Floor', '#ffd166', { suffix: '%', maybeFraction: true }],
        ['directDamageMultiplier', 'Direct Damage Multiplier', '#ffd166', { suffix: 'x', prefix: '' }],
        ['dotDamageMultiplier', 'Damage over Time Multiplier', '#b197fc', { suffix: 'x', prefix: '' }],
        ['damageVsDebuffed', 'Damage Against Debuffed Targets', '#ffd166', { suffix: '%', maybeFraction: true }],
        ['damageTakenReduction', 'Damage Taken Reduction', '#8ab6ff', { suffix: '%', maybeFraction: true }],
        ['kineticMastery', 'Kinetic Mastery', TOOLTIP_DAMAGE_COLORS.kinetic, {}],
        ['slashingMastery', 'Slashing Mastery', TOOLTIP_DAMAGE_COLORS.slashing, {}],
        ['severedLimbChance', 'Severed Limb Chance', TOOLTIP_DAMAGE_COLORS.slashing, { suffix: '%' }],
        ['maxSeveredLimbs', 'Maximum Severed Limbs', TOOLTIP_DAMAGE_COLORS.slashing, {}],
        ['maxSeepingWoundStacks', 'Maximum Seeping Wound Stacks', TOOLTIP_DAMAGE_COLORS.slashing, {}]
    ];

    standardStats.forEach(([key, label, color, options]) => {
        let value = options.legacy ? percentRangeValue(key, options.legacy) : source[key];
        if (value === undefined && source.statModifiers?.[key] !== undefined) {
            value = source.statModifiers[key];
        }
        const normalizedOptions = { ...options };
        delete normalizedOptions.legacy;
        if (normalizedOptions.maybeFraction) {
            delete normalizedOptions.maybeFraction;
            const probe = value && typeof value === 'object' ? Math.max(Math.abs(Number(value.min) || 0), Math.abs(Number(value.max) || 0)) : Math.abs(Number(value) || 0);
            normalizedOptions.storedAsFraction = !showRanges && probe > 0 && probe <= 1.5;
        }
        push(value, label, color, normalizedOptions);
    });

    const localMaps = [
        ['weaponLocalFlatDamage', 'Weapon {type} Damage', false],
        ['weaponLocalTypeIncrease', 'Increased Weapon {type} Damage', true],
        ['weaponLocalGroupIncrease', 'Increased Weapon {type} Damage', true]
    ];
    if (isWeapon) {
        localMaps.forEach(([key, labelTemplate, percent]) => {
            const map = source[key];
            if (!map || typeof map !== 'object') return;
            Object.entries(map).forEach(([type, value]) => {
                const label = TOOLTIP_DAMAGE_LABELS[type] || tooltipTitle(type);
                push(value, labelTemplate.replace('{type}', label), TOOLTIP_DAMAGE_COLORS[type] || '#ffd3a5', percent ? { suffix: '%' } : {});
            });
        });
        if (source.weaponLocalAttackSpeedPercent !== undefined) {
            push(source.weaponLocalAttackSpeedPercent, 'Increased Weapon Attack Speed', '#ffd3a5', { suffix: '%' });
        }
        if (source.weaponDamageConversion?.source && source.weaponDamageConversion?.target) {
            const from = TOOLTIP_DAMAGE_LABELS[source.weaponDamageConversion.source] || tooltipTitle(source.weaponDamageConversion.source);
            const to = TOOLTIP_DAMAGE_LABELS[source.weaponDamageConversion.target] || tooltipTitle(source.weaponDamageConversion.target);
            const percent = formatTooltipNumber(source.weaponDamageConversion.percent ?? 100, { showRanges, suffix: '%' });
            lines.push(renderTooltipLine(percent, `${from} Weapon Damage Converted to ${to}`, TOOLTIP_DAMAGE_COLORS[source.weaponDamageConversion.target] || '#cfe6ff', { prefix: '' }));
        }
    }

    const statModifiers = source.statModifiers;
    if (statModifiers && typeof statModifiers === 'object') {
        if (statModifiers.damageGroups) {
            Object.entries(statModifiers.damageGroups).forEach(([group, value]) => {
                push(value, `${tooltipTitle(group)} Damage`, '#ffd166', { suffix: '%' });
            });
        }
        if (statModifiers.damageTypes) {
            Object.entries(statModifiers.damageTypes).forEach(([type, value]) => {
                push(value, `${TOOLTIP_DAMAGE_LABELS[type] || tooltipTitle(type)} Damage`, TOOLTIP_DAMAGE_COLORS[type] || '#ffd166', { suffix: '%' });
            });
        }
        const mirrored = new Set(standardStats.map(([key]) => key));
        Object.entries(statModifiers).forEach(([key, value]) => {
            if (key === 'damageGroups' || key === 'damageTypes' || mirrored.has(key)) return;
            push(value, tooltipTitle(key), '#cfe6ff');
        });
    }

    if (source.passiveBonuses && typeof source.passiveBonuses === 'object') {
        Object.entries(source.passiveBonuses).forEach(([name, value]) => {
            push(value, name, '#a6fff2');
        });
    }

    const effects = Array.isArray(source.effects) ? source.effects : [];
    effects.forEach(effect => {
        if (!effect || typeof effect !== 'object') return;
        const chance = formatTooltipNumber(effect.chance ?? effect.chancePercent, { showRanges, suffix: '%' });
        const parameters = effect.parameters || {};
        if (effect.action === 'applyDebuff' || effect.action === 'applyStackingDebuff') {
            const name = parameters.debuffName || effect.debuffName || 'Status';
            const duration = parameters.duration ? ` <span style="color:#9fb4c8;">(${parameters.duration}s)</span>` : '';
            lines.push(renderTooltipLine(chance || '100%', `${tooltipTitle(name)} Chance`, '#b197fc', { prefix: '', detail: duration }));
        }
    });

    return lines;
}

function formatTooltipModifierChoice(choice, showRanges) {
    if (!choice || !choice.path) return '';
    const parts = choice.path.split('.');
    const key = parts[0];
    const leaf = parts[parts.length - 1];
    const percent = key === 'statModifiers' || ['attackSpeedModifier', 'criticalChanceModifier', 'criticalMultiplierModifier', 'healthBonusPercent', 'energyShieldBonusPercent'].includes(key);
    const value = formatTooltipNumber(choice.value, { showRanges, suffix: percent ? '%' : '' });
    let label = tooltipTitle(leaf);
    if (parts[0] === 'damageTypes') label = `${TOOLTIP_DAMAGE_LABELS[leaf] || tooltipTitle(leaf)} Damage`;
    if (parts[0] === 'defenseTypes') label = TOOLTIP_DEFENSE_LABELS[leaf] || tooltipTitle(leaf);
    if (parts[0] === 'passiveBonuses') label = parts.slice(1).join('.');
    return `<span style="color:#cfe6ff;">+${value} ${label}</span>`;
}

function collectTooltipModifierLines(item, showRanges) {
    const lines = [];
    if (!showRanges && Array.isArray(item.rolledModifiers)) {
        item.rolledModifiers.forEach(modifier => {
            if (!modifier || typeof modifier !== 'object') return;
            let value = modifier.displayValue;
            if (value === undefined || value === null) {
                value = modifier.value;
                if (modifier.isPercent && typeof value === 'number' && Math.abs(value) <= 1.5) value *= 100;
            }
            const formatted = formatTooltipNumber(value, { suffix: modifier.isPercent ? '%' : '' });
            if (!formatted) return;
            const grade = modifier.gradeLabel || (typeof window.getModifierGradeLabel === 'function'
                ? window.getModifierGradeLabel(modifier.grade)
                : `Grade ${modifier.grade || '?'}`);
            const colorPath = String(modifier.statPath || '').split('.').pop();
            const color = TOOLTIP_DAMAGE_COLORS[colorPath] || (/health/i.test(modifier.displayName || '') ? '#51cf88' : /shield/i.test(modifier.displayName || '') ? '#74c0fc' : '#cfe6ff');
            const detail = ` <span style="color:#9cc5ff;">[${grade}]</span>`;
            lines.push(renderTooltipLine(formatted, modifier.displayName || modifier.id || 'Modifier', color, { detail }));
        });
        return lines;
    }

    if (showRanges && typeof window.getRandomModifierPreviewInfo === 'function') {
        const preview = window.getRandomModifierPreviewInfo(item);
        if (preview) {
            const countLabel = String(preview.countRange) === '1' ? 'Random Modifier' : 'Random Modifiers';
            lines.push(`<div><span style="color:#cfe6ff; font-weight:600;">${preview.countRange} ${countLabel}</span> <span style="color:#9cc5ff;">(up to ${preview.maxGradeLabel})</span></div>`);
        }
    }

    if (showRanges && Array.isArray(item.rollGroups)) {
        item.rollGroups.forEach(group => {
            if (!group || !Array.isArray(group.from) || !group.from.length) return;
            const pick = typeof group.pick === 'object'
                ? formatTooltipNumber(group.pick, { showRanges: true })
                : String(group.pick ?? 1);
            const choices = group.from.map(choice => formatTooltipModifierChoice(choice, true)).filter(Boolean);
            if (choices.length) {
                lines.push(`<div style="margin-top:2px;"><span style="color:#9cc5ff;">Choose ${pick}:</span> ${choices.join('<span style="color:#5f7890;"> • </span>')}</div>`);
            }
        });
    }
    return lines;
}

function collectTooltipWireLines(item, showRanges) {
    const colorBadge = color => ({ red: '#ff6b6b', green: '#51cf66', blue: '#74c0fc', black: '#ced4da' }[color] || '#adb5bd');
    if (Array.isArray(item.rolledWires) && item.rolledWires.length > 0) {
        return item.rolledWires.map(wire => {
            const color = colorBadge(wire.color);
            const badge = `<span style="display:inline-block; border:1px solid ${color}; color:${color}; padding:1px 4px; margin:1px 0; border-radius:3px; font-size:11px;">${tooltipTitle(wire.color)}${wire.chip ? ` • ${wire.chip.name}` : ''}</span>`;
            if (!wire.chip) return `<div>${badge}</div>`;
            const chipLines = collectTooltipBaseRollLines(wire.chip, getTooltipBaseRollSource(wire.chip), false);
            return `<div>${badge}${chipLines.length ? `<div style="margin-left:4px; font-size:11px;">${chipLines.join('')}</div>` : ''}</div>`;
        });
    }
    if (showRanges && item.wires?.totalSlots !== undefined) {
        const total = formatTooltipNumber(item.wires.totalSlots, { showRanges: true });
        return total ? [renderTooltipLine(total, 'Wire Slots', '#66ffcc', { prefix: '' })] : [];
    }
    return [];
}

function getItemTooltipContent(item, showRanges = false) {
    if (!item) return '';
    let content = `<div style="color:#e0f2ff; font-family:'Orbitron', sans-serif; text-shadow:0 0 5px rgba(0, 255, 204, 0.5); max-width:300px;">`;
    content += `<div style="background:linear-gradient(to right, #00306e, #003f8f); padding:5px; margin-bottom:6px; border-left:3px solid #00ffcc; border-radius:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">` +
        `<strong style="font-size:110%; color:#ffffff;">${item.name || 'Unknown Item'}</strong></div>`;

    const metadata = [];
    if (item.slot) metadata.push(`<div><span style="color:#7fdbff;">Slot:</span> <span style="color:#ffffff;">${TOOLTIP_SLOT_LABELS[item.slot] || tooltipTitle(item.slot)}</span></div>`);
    if (item.type) metadata.push(`<div><span style="color:#7fdbff;">Type:</span> <span style="color:#ffffff;">${item.type}</span></div>`);
    if (item.levelRequirement !== undefined) {
        const level = formatLevelRequirement(item.levelRequirement, showRanges);
        if (level) metadata.push(`<div><span style="color:#ffd166;">Requires Level:</span> <span style="color:#ffffff;">${level}</span></div>`);
    }
    if (item.weaponType) metadata.push(`<div><span style="color:#7fdbff;">Weapon Type:</span> <span style="color:#ffffff;">${item.weaponType}</span></div>`);
    const taxonomy = getTooltipWeaponTaxonomy(item);
    if (taxonomy) {
        metadata.push(`<div><span style="color:#7fdbff;">Weapon Family:</span> <span style="color:#e8c77a;">${taxonomy.familyLabel}</span></div>`);
        if (taxonomy.tagLabels.length) metadata.push(`<div><span style="color:#7fdbff;">Weapon Tags:</span> <span style="color:#b8cee0;">${taxonomy.tagLabels.join(' • ')}</span></div>`);
    }
    if (metadata.length) content += `<div style="background:rgba(0, 15, 40, 0.5); padding:4px 6px; margin-bottom:6px; border-radius:2px;">${metadata.join('')}</div>`;

    const baseSource = showRanges ? item : getTooltipBaseRollSource(item);
    content += renderTooltipSection('BASE ROLLS', collectTooltipBaseRollLines(item, baseSource, showRanges), '#66ffcc');
    content += renderTooltipSection('MODIFIERS', collectTooltipModifierLines(item, showRanges), '#9cc5ff');
    content += renderTooltipSection('WIRES', collectTooltipWireLines(item, showRanges), '#66ffcc');
    content += `</div>`;
    return content;
}


// TOOLTIP DEBUGGING UTILITIES
const DEBUG_TOOLTIPS = false;

function debugTooltip(message, data = {}) {
    if (!DEBUG_TOOLTIPS) return;
    
    // Format the message with a timestamp
    const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm format
    console.log(`[Tooltip Debug ${timestamp}] ${message}`, data);
}

// This creates a single global tooltip that moves around instead of creating multiple tooltips
window.registerCoreboundInitializer(() => {
    debugTooltip('Initializing global tooltip system');

    // Prefer reusing an existing global tooltip if one was already created.
    let globalTooltip = document.getElementById('global-tooltip');
    if (!globalTooltip) {
        globalTooltip = document.createElement('div');
        globalTooltip.id = 'global-tooltip';
        globalTooltip.className = 'tooltip';
        document.body.appendChild(globalTooltip);
    }

    globalTooltip.style.display = 'none';
    globalTooltip.style.position = 'fixed';
    globalTooltip.style.zIndex = '100002';
    globalTooltip.style.background = 'rgba(0, 0, 0, 0.95)';
    globalTooltip.style.color = 'white';
    globalTooltip.style.border = '1px solid #00ffcc';
    globalTooltip.style.borderRadius = '4px';
    globalTooltip.style.padding = '8px';
    globalTooltip.style.maxWidth = '250px';
    globalTooltip.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
    globalTooltip.style.pointerEvents = 'none';

    let currentTarget = null;
    let isTooltipVisible = false;
    let tooltipSuppressed = false;
    let hideTimeout = null;

    function clearHideTimeout() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    }

    function hideAllLegacyTooltips() {
        const tooltips = document.querySelectorAll('.tooltip:not(#global-tooltip)');
        tooltips.forEach(tooltip => {
            tooltip.style.opacity = '0';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.display = 'none';
        });
    }

    function findTooltipTarget(element) {
        if (!(element instanceof Element)) return null;
        return element.closest('[data-has-tooltip="true"]');
    }

    function getTooltipContent(target) {
        if (target.hasAttribute('data-tooltip-content')) {
            return target.getAttribute('data-tooltip-content') || '';
        }
        const nested = target.querySelector('.tooltip');
        return nested ? nested.innerHTML : '';
    }

    function positionTooltip(target) {
        const targetRect = target.getBoundingClientRect();
        globalTooltip.style.left = '0px';
        globalTooltip.style.top = '0px';
        const tooltipRect = globalTooltip.getBoundingClientRect();

        let left = targetRect.right + 5;
        let top = targetRect.top;

        if (left + tooltipRect.width > window.innerWidth - 5) {
            left = targetRect.left - tooltipRect.width - 5;
            if (left < 5) {
                left = Math.max(5, Math.min(window.innerWidth - tooltipRect.width - 5, targetRect.left));
                top = targetRect.bottom + 5;
                if (top + tooltipRect.height > window.innerHeight - 5) {
                    top = targetRect.top - tooltipRect.height - 5;
                }
            }
        }

        top = Math.max(5, Math.min(window.innerHeight - tooltipRect.height - 5, top));
        globalTooltip.style.left = `${left}px`;
        globalTooltip.style.top = `${top}px`;
    }

    function showTooltipForTarget(target) {
        const content = getTooltipContent(target);
        if (!content) return;
        globalTooltip.innerHTML = content;
        globalTooltip.style.display = 'block';
        positionTooltip(target);
        isTooltipVisible = true;
    }

    function hideTooltip() {
        clearHideTimeout();
        globalTooltip.style.display = 'none';
        isTooltipVisible = false;
        currentTarget = null;
    }

    function handleMouseOver(event) {
        if (tooltipSuppressed) return;
        const target = findTooltipTarget(event.target);
        if (!target) return;

        const from = event.relatedTarget;
        if (from instanceof Element && target.contains(from)) {
            return;
        }

        clearHideTimeout();
        if (currentTarget !== target) {
            currentTarget = target;
            showTooltipForTarget(target);
        } else if (isTooltipVisible) {
            positionTooltip(target);
        }
    }

    function handleMouseOut(event) {
        if (tooltipSuppressed) return;
        const target = findTooltipTarget(event.target);
        if (!target) return;

        const to = event.relatedTarget;
        if (to instanceof Element && target.contains(to)) {
            return;
        }

        const nextTooltipTarget = findTooltipTarget(to);
        if (nextTooltipTarget && nextTooltipTarget !== target) {
            clearHideTimeout();
            currentTarget = nextTooltipTarget;
            showTooltipForTarget(nextTooltipTarget);
            return;
        }

        hideTimeout = setTimeout(() => {
            if (currentTarget === target) {
                hideTooltip();
            }
        }, 60);
    }

    hideAllLegacyTooltips();
    document.body.addEventListener('mouseover', handleMouseOver, true);
    document.body.addEventListener('mouseout', handleMouseOut, true);
    document.body.addEventListener('click', hideTooltip, true);

    document.addEventListener('dragstart', () => {
        tooltipSuppressed = true;
        hideTooltip();
    }, true);
    document.addEventListener('dragend', () => { tooltipSuppressed = false; }, true);
    document.addEventListener('drop', () => { tooltipSuppressed = false; }, true);
    document.addEventListener('mouseup', () => { tooltipSuppressed = false; }, true);

    window.addEventListener('resize', () => {
        if (currentTarget && isTooltipVisible) {
            positionTooltip(currentTarget);
        }
    });
    document.addEventListener('scroll', () => {
        if (currentTarget && isTooltipVisible) {
            positionTooltip(currentTarget);
        }
    }, true);

    window.forceHideTooltip = hideTooltip;
    window._globalTooltip = globalTooltip;
});

// Export functions that need to be accessed from other files
window.getItemTooltipContent = getItemTooltipContent;
