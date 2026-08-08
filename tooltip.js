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

// Keep the getItemTooltipContent function as it is since it just generates the content
function getItemTooltipContent(item, showRanges = false) {
    // Style the tooltip with sci-fi colors and modern formatting
    const REARRANGE_TOOLTIP = true;
    let content = `<div style="color: #e0f2ff; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 5px rgba(0, 255, 204, 0.5); max-width: 300px;">`;
    let renderedCritical = false;
    
    // Item name with gradient background - fixed to prevent awkward wrapping
    content += `<div style="background: linear-gradient(to right, #00306e, #003f8f); padding: 5px; margin-bottom: 6px; border-left: 3px solid #00ffcc; border-radius: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <strong style="font-size: 110%; color: #ffffff;">${item.name}</strong>
                </div>`;
    
    const isWeapon = isWeaponTooltipItem(item);
    const weaponPreview = isWeapon ? buildWeaponLocalPreview(item, showRanges) : null;

    // Item type info with subtle background
    content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
    content += `<span style="color: #7fdbff;">Type:</span> ${item.type}<br>`;
    if (item.weaponType) {
        content += `<span style=\"color: #7fdbff;\">Weapon Type:</span> ${item.weaponType}<br>`;
    }
    if (item.levelRequirement !== undefined) {
        const levelText = formatLevelRequirement(item.levelRequirement, showRanges);
        if (levelText) {
            content += `<span style="color: #ffd166;">Level Requirement:</span> ${levelText}<br>`;
        }
    }
    content += `</div>`;

    if (isWeapon && weaponPreview) {
        const finalDamage = weaponPreview.finalDamage || {};
        const baseDamage = weaponPreview.baseDamage || {};
        content += `<div style="background: rgba(0, 20, 45, 0.6); padding: 6px; margin-bottom: 6px; border-radius: 4px; border-left: 2px solid #00ffcc;">`;
        content += `<div style="color:#66ffcc; font-weight:bold; margin-bottom:4px;">Weapon Damage</div>`;
        const finalTypes = Object.keys(finalDamage);
        if (finalTypes.length === 0) {
            content += `<div style="color:#ffb3b3;">No valid weapon base damage.</div>`;
        } else {
            finalTypes.forEach((type) => {
                const rangeText = formatWeaponRangeValue(finalDamage[type], showRanges);
                content += `<div><span style="color:#cfe6ff;">${rangeText} ${capitalize(type)}</span></div>`;
            });
            content += `<div style="color:#7fa7c6; font-size:11px; margin-top:2px;">Weapon Damage includes local weapon modifiers.</div>`;
        }
        const baseTypes = Object.keys(baseDamage);
        if (baseTypes.length > 0) {
            content += `<div style="color:#66ccff; margin-top:6px;">Base Weapon Damage:</div>`;
            baseTypes.forEach((type) => {
                const rangeText = formatWeaponRangeValue(baseDamage[type], showRanges);
                content += `<div><span style="color:#a7d9ff;">${rangeText} ${capitalize(type)}</span></div>`;
            });
        }

        const baseSpeed = Number(item.bAttackSpeed || 1);
        const localMultiplier = Number(weaponPreview.localAttackSpeedMultiplier || 1);
        const finalSpeed = baseSpeed * localMultiplier;
        content += `<div style="color:#66ccff; margin-top:6px;">Attack Speed:</div>`;
        content += `<div><span style="color:#cfe6ff;">${finalSpeed.toFixed(2)} attacks/sec</span></div>`;
        if (Math.abs(localMultiplier - 1) > 0.0001) {
            content += `<div><span style="color:#a7d9ff;">Base: ${baseSpeed.toFixed(2)} attacks/sec</span></div>`;
        }

        const weaponMods = [];
        if (item.weaponLocalFlatDamage) {
            Object.keys(item.weaponLocalFlatDamage).forEach((type) => {
                const v = Number(item.weaponLocalFlatDamage[type]);
                if (Number.isFinite(v) && v !== 0) weaponMods.push(`+${Math.round(v)} to Weapon ${capitalize(type)} Damage`);
            });
        }
        if (item.weaponLocalTypeIncrease) {
            Object.keys(item.weaponLocalTypeIncrease).forEach((type) => {
                const v = Number(item.weaponLocalTypeIncrease[type]);
                if (Number.isFinite(v) && v !== 0) weaponMods.push(`+${Math.round(v)}% Increased Weapon ${capitalize(type)} Damage`);
            });
        }
        if (item.weaponLocalGroupIncrease) {
            Object.keys(item.weaponLocalGroupIncrease).forEach((group) => {
                const v = Number(item.weaponLocalGroupIncrease[group]);
                if (Number.isFinite(v) && v !== 0) weaponMods.push(`+${Math.round(v)}% Increased Weapon ${capitalize(group)} Damage`);
            });
        }
        if (item.weaponDamageConversion && item.weaponDamageConversion.source && item.weaponDamageConversion.target) {
            weaponMods.push(`${capitalize(item.weaponDamageConversion.source)} Weapon Damage Converted to ${capitalize(item.weaponDamageConversion.target)}`);
        }
        if (item.weaponLocalAttackSpeedPercent) {
            weaponMods.push(`+${Math.round(Number(item.weaponLocalAttackSpeedPercent))}% Increased Weapon Attack Speed`);
        }
        if (weaponMods.length > 0) {
            content += `<div style="color:#66ccff; margin-top:6px;">Weapon Modifiers:</div>`;
            weaponMods.forEach((line) => {
                content += `<div style="color:#cfe6ff;">${line}</div>`;
            });
        }
        content += `</div>`;
    }
    
    // // Flat damage section (placed immediately after header) - single compact line
    // if (item && item.damageTypes && !showRanges) {
    //     const dt = item.damageTypes;
    //     const entries = Object.keys(dt).map(k => {
    //         const v = dt[k];
    //         if (typeof v === 'number') return `${capitalize(k)} ${v}`;
    //         if (v && typeof v === 'object') {
    //             const min = (typeof v.min === 'number') ? v.min : 0;
    //             const max = (typeof v.max === 'number') ? v.max : min;
    //             return min === max ? `${capitalize(k)} ${min}` : `${capitalize(k)} ${min}-${max}`;
    //         }
    //         return '';
    //     }).filter(Boolean);
    //     if (entries.length > 0) {
    //         content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
    //         content += `<span style=\"color: #ffcc00;\">Physical Damage:</span> <span style=\"color:#cfe6ff;\">${entries.join(' • ')}</span>`;
    //         content += `</div>`;
    //     }
    // }
    
    // Roll Groups (Possible Mods) - structured preview for shop/fabricator
    if (showRanges && Array.isArray(item.rollGroups) && item.rollGroups.length > 0) {
        const safeNum = (n) => (typeof n === 'number' && isFinite(n)) ? n : 0;
        const pct = (value, min, max) => {
            if (min === max) return 1;
            return Math.max(0, Math.min(1, (value - min) / (max - min)));
        };
        const rollColor = (value, min, max) => {
            // Colors per spec: min, below35, avg(35-65), above65, max
            if (value === min) return '#888888';
            if (value === max) return '#51cf66';
            const p = pct(value, min, max) * 100;
            if (p < 35) return '#ffa94d';
            if (p <= 65) return '#cfe6ff';
            return '#74c0fc';
        };
        const formatRange = (val, suffix = '') => {
            if (val === undefined || val === null) return '';
            if (typeof val === 'string') {
                return `${val}${suffix}`;
            }
            if (typeof val === 'number') {
                return `${safeNum(val)}${suffix}`;
            }
            if (typeof val === 'object' && val.min !== undefined && val.max !== undefined) {
                return `${safeNum(val.min)}${suffix}-${safeNum(val.max)}${suffix}`;
            }
            return '';
        };
        const toTitle = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
        const resistanceDisplay = key => ({
            physicalResistance: 'Physical Resistance',
            elementalResistance: 'Elemental Resistance',
            chemicalResistance: 'Chemical Resistance'
        })[key] || toTitle(key);
        const groupLabel = key => ({
            physical: 'Physical', elemental: 'Elemental', chemical: 'Chemical'
        })[key] || toTitle(key);
        const isTopLevelPercent = k => (
            k === 'attackSpeedModifier' || k === 'criticalChanceModifier' ||
            k === 'criticalMultiplierModifier' || k === 'healthBonusPercent' ||
            k === 'energyShieldBonusPercent'
        );
        const dmgTypeDisplay = t => ({ pyro: 'Fire', cryo: 'Cold', electric: 'Elec', kinetic: 'Kinetic', slashing: 'Slashing', corrosive: 'Corrosive', radiation: 'Radiation' }[t] || toTitle(t));
        const dmgTypeGroup = t => {
            if (t === 'kinetic' || t === 'slashing') return 'Physical';
            if (t === 'pyro' || t === 'cryo' || t === 'electric') return 'Elemental';
            if (t === 'corrosive' || t === 'radiation') return 'Chemical';
            return 'Mods';
        };
        const nicerTopName = key => ({
            attackSpeedModifier: 'Attack Speed',
            criticalChanceModifier: 'Critical Chance',
            criticalMultiplierModifier: 'Critical Multiplier',
            healthBonusPercent: 'Health %',
            energyShieldBonusPercent: 'Energy Shield %',
        })[key] || toTitle(key);
        const fmtChoice = (choice) => {
            if (!choice || !choice.path) return '';
            const parts = choice.path.split('.');
            const key = parts[0];
            const sub = parts[1];
            const restName = parts.slice(1).join('.');
            const val = choice.value;
            switch (key) {
                case 'damageTypes':
                    return `${dmgTypeDisplay(sub)} ${formatRange(val)}`;
                case 'defenseTypes':
                    return `${resistanceDisplay(sub)} +${formatRange(val)}`;
                case 'statModifiers':
                    if (sub === 'damageTypes') {
                        const dtype = parts[2];
                        return `+${formatRange(val, '%')} ${dmgTypeDisplay(dtype)} dmg`;
                    }
                    if (sub === 'damageGroups') {
                        const g = parts[2];
                        return `+${formatRange(val, '%')} ${groupLabel(g)}`;
                    }
                    return `${toTitle(parts.slice(1).join(' '))}: +${formatRange(val)}`;
                case 'passiveBonuses': {
                    const pName = restName; // supports spaces
                    return `+${formatRange(val)} to ${pName}`;
                }
                default: {
                    // top-level fields
                    if (isTopLevelPercent(key)) {
                        return `+${formatRange(val, '%')} ${nicerTopName(key)}`;
                    }
                    return `${toTitle(key)} +${formatRange(val)}`;
                }
            }
        };
        const fmtPick = (pick) => {
            if (typeof pick === 'number') return `${pick}`;
            if (typeof pick === 'string') return pick;
            if (pick && pick.min !== undefined && pick.max !== undefined) return `${pick.min}-${pick.max}`;
            return '?';
        };

        // Build grouped sections as requested (Category (N slots) + bullets)
        let poolsHtml = '';
        item.rollGroups.forEach((grp) => {
            if (!grp || !Array.isArray(grp.from) || grp.from.length === 0) return;
            const pickTxt = fmtPick(grp.pick);

            // Derive a sensible group title
            let title = 'Enhancements';
            const kinds = new Set();
            grp.from.forEach(ch => {
                if (!ch || !ch.path) return;
                const p = ch.path.split('.');
                if (p[0] === 'damageTypes') kinds.add(dmgTypeGroup(p[1]));
                else if (p[0] === 'statModifiers' && p[1] === 'damageTypes') kinds.add(dmgTypeGroup(p[2]));
                else if (p[0] === 'statModifiers' && p[1] === 'damageGroups') kinds.add(groupLabel(p[2]));
            });
            if (kinds.size === 1) title = Array.from(kinds)[0];

            const bullets = grp.from.map(choice => {
                if (!choice || !choice.path) return '';
                // If choice.value is a range, colorize ends; if number, colorize value relative to itself (treat as max)
                let colored = fmtChoice(choice);
                const v = choice.value;
                if (typeof v === 'object' && v.min !== undefined && v.max !== undefined && v.min !== v.max) {
                    const colorMin = rollColor(v.min, v.min, v.max);
                    const colorMax = rollColor(v.max, v.min, v.max);
                    colored = colored.replace(`${v.min}`, `<span style=\"color:${colorMin}\">${v.min}</span>`)
                                     .replace(`${v.max}`, `<span style=\"color:${colorMax}\">${v.max}</span>`);
                }
                return `* ${colored}`;
            }).filter(Boolean).join('<br>');
            if (bullets) {
                const slotsLabel = `(${pickTxt} ${pickTxt === '1' ? 'slot' : 'slots'})`;
                poolsHtml += `<div style="margin-top:6px;">
                    <div style="color:#66ffcc; font-weight:bold; margin-bottom:2px;">${title} ${slotsLabel}</div>
                    <div style="color:#cfe6ff;">${bullets}</div>
                </div>`;
            }
        });

        if (poolsHtml) {
            content += `<div style="background: rgba(0, 20, 45, 0.6); padding: 6px; margin-bottom: 6px; border-radius: 4px; border-left: 2px solid #00ffcc;">
                ${poolsHtml}
            </div>`;
        }
    }

    // Capture Passive Bonuses for later placement (just above Wires)
    let capturedPassiveContent = '';
    if (item.passiveBonuses && Object.keys(item.passiveBonuses).length > 0) {
        let hasPassives = false;
        let passiveContent = `<div style="background: rgba(0, 255, 204, 0.1); padding: 4px; margin-bottom: 6px; border-radius: 2px; border-left: 2px solid #00ffcc;">`;
        passiveContent += `<span style="color: #00ffcc; font-weight: bold;">Passive Bonuses:</span><br>`;
        for (const passiveName in item.passiveBonuses) {
            const bonusValue = item.passiveBonuses[passiveName];
            const formattedValue = typeof bonusValue === 'object' ? (bonusValue.value || bonusValue.min || 0) : bonusValue;
            if (formattedValue > 0) {
                passiveContent += `<span style=\"color: #a6fff2;\">+${formattedValue} to ${passiveName}</span><br>`;
                hasPassives = true;
            }
        }
        passiveContent += `</div>`;
        if (hasPassives) {
            capturedPassiveContent = passiveContent;
        }
    }

    // Remove extra section additions per request (no new sections beyond existing ones)
    
    // Stats section with organized formatting - only create if there are stats
    let statsContent = '';
    let hasStats = false;
    
    // Add this function to group damage types by their category
    function getDamageTypeCategory(damageType) {
        // Physical Group
        if (damageType === 'kinetic' || damageType === 'slashing') {
            return 'Physical';
        }
        // Elemental Group
        else if (damageType === 'pyro' || damageType === 'cryo' || damageType === 'electric') {
            return 'Elemental';
        }
        // Chemical Group
        else if (damageType === 'corrosive' || damageType === 'radiation') {
            return 'Chemical';
        }
        // Legacy support
        else if (damageType === 'mental') {
            return 'Physical (Legacy)';
        }
        else if (damageType === 'magnetic') {
            return 'Elemental (Legacy)';
        }
        else if (damageType === 'chemical') {
            return 'Chemical (Legacy)';
        }
        
        return 'Unknown';
    }

    // Damage Types
    if (item.damageTypes && Object.keys(item.damageTypes).length > 0) {
        if (!hasStats) {
            statsContent += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
            hasStats = true;
        }
        
        // Group damage types by category
        const damageByCategory = {};
        
        for (let damageType in item.damageTypes) {
            const category = getDamageTypeCategory(damageType);
            if (!damageByCategory[category]) {
                damageByCategory[category] = [];
            }
            
            damageByCategory[category].push({
                type: damageType,
                value: item.damageTypes[damageType]
            });
        }
        
        // Display damage types by category
        for (let category in damageByCategory) {
            statsContent += `<div style="margin-top: 4px;"><span style="color: #ffcc00;">${category} Damage:</span></div>`;
            
            for (let damage of damageByCategory[category]) {
                const damageValue = damage.value;
                const damageType = capitalize(damage.type);
                
                if (
                    showRanges &&
                    typeof damageValue === 'object' &&
                    damageValue.min !== undefined &&
                    damageValue.max !== undefined
                ) {
                    statsContent += `<div><span style="color: #ffcc00;">• ${damageType}:</span> <span style="color: #ffffff;">${damageValue.min}-${damageValue.max}</span></div>`;
                } else if (typeof damageValue === 'object') {
                    // Fix for [object Object] display - show min value if available
                    const minVal = damageValue.min !== undefined ? damageValue.min : 0;
                    const maxVal = damageValue.max !== undefined ? damageValue.max : minVal;
                    
                    if (minVal === maxVal) {
                        statsContent += `<div><span style="color: #ffcc00;">• ${damageType}:</span> <span style="color: #ffffff;">${minVal}</span></div>`;
                    } else {
                        statsContent += `<div><span style="color: #ffcc00;">• ${damageType}:</span> <span style="color: #ffffff;">${minVal}-${maxVal}</span></div>`;
                    }
                } else {
                    statsContent += `<div><span style="color: #ffcc00;">• ${damageType}:</span> <span style="color: #ffffff;">${damageValue}</span></div>`;
                }
            }
        }
        // Close Flat Damage box to keep it separate from following sections
        if (hasStats) {
            statsContent += `</div>`;
            content += statsContent;
            statsContent = '';
            hasStats = false;
        }
    }

    // Damage % Bonus (groups + types in one box)
    let openedDamagePercentBox = false;
    if ((item.statModifiers && item.statModifiers.damageGroups && Object.keys(item.statModifiers.damageGroups).length > 0) ||
        (item.statModifiers && item.statModifiers.damageTypes && Object.keys(item.statModifiers.damageTypes).length > 0)) {
        if (!hasStats) {
            statsContent += `<div style=\"background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;\">`;
            hasStats = true;
        }
        openedDamagePercentBox = true;
        statsContent += `<div style=\"margin-top: 4px;\"><span style=\"color: #ffcc00;\">Damage % Bonus:</span></div>`;
    }
    if (item.statModifiers && item.statModifiers.damageGroups && Object.keys(item.statModifiers.damageGroups).length > 0) {
        
        // Define group display names
        const groupDisplayNames = {
            'physical': 'Physical Damage',
            'elemental': 'Elemental Damage',
            'chemical': 'Chemical Damage'
        };
        
        for (let group in item.statModifiers.damageGroups) {
            const modValue = item.statModifiers.damageGroups[group];
            const displayName = groupDisplayNames[group] || capitalize(group);
            
            if (
                showRanges &&
                typeof modValue === 'object' &&
                modValue.min !== undefined &&
                modValue.max !== undefined
            ) {
                statsContent += `<div><span style="color: #ffcc00;">• ${displayName}:</span> <span style="color: #ffffff;">+${modValue.min}% to +${modValue.max}%</span></div>`;
            } else if (typeof modValue === 'object') {
                // Fix for [object Object] display - show min value if available
                const minVal = modValue.min !== undefined ? modValue.min : 0;
                const maxVal = modValue.max !== undefined ? modValue.max : minVal;
                
                if (minVal === maxVal) {
                    statsContent += `<div><span style="color: #ffcc00;">• ${displayName}:</span> <span style="color: #ffffff;">+${minVal}%</span></div>`;
                } else {
                    statsContent += `<div><span style="color: #ffcc00;">• ${displayName}:</span> <span style="color: #ffffff;">+${minVal}% to +${maxVal}%</span></div>`;
                }
            } else {
                statsContent += `<div><span style="color: #ffcc00;">• ${displayName}:</span> <span style="color: #ffffff;">+${modValue}%</span></div>`;
            }
        }
    }

    // Percentage Damage Modifiers (types) - append under same box
    if (item.statModifiers && item.statModifiers.damageTypes && Object.keys(item.statModifiers.damageTypes).length > 0) {
        for (let damageType in item.statModifiers.damageTypes) {
            const modifierValue = item.statModifiers.damageTypes[damageType];
            if (showRanges && typeof modifierValue === 'object' && modifierValue.min !== undefined && modifierValue.max !== undefined) {
                statsContent += `<span style=\"color: #ffd166;\">+${modifierValue.min}% - +${modifierValue.max}% ${capitalize(damageType)} Damage</span><br>`;
            } else if (typeof modifierValue === 'object') {
                statsContent += `<span style=\"color: #ffd166;\">+${modifierValue.value || 0}% ${capitalize(damageType)} Damage</span><br>`;
            } else {
                statsContent += `<span style=\"color: #ffd166;\">+${modifierValue}% ${capitalize(damageType)} Damage</span><br>`;
            }
        }
    }
    if (openedDamagePercentBox && hasStats) {
        statsContent += `</div>`;
        content += statsContent;
        statsContent = '';
        hasStats = false;
    }

    // Critical modifiers (place right after Damage % Bonus)
    if (item.criticalChanceModifier !== undefined || item.criticalMultiplierModifier !== undefined ||
        (showRanges && (item.criticalChanceModifierRange || item.criticalMultiplierModifierRange))) {
        content += `<div style=\"background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;\">`;
        content += `<span style=\"color: #ffd166; font-weight: bold;\">Critical Modifiers:</span><br>`;
        if (item.criticalChanceModifier !== undefined) {
            content += `<span style=\"color: #ffd166;\">Critical Chance:</span> +${(item.criticalChanceModifier * 100).toFixed(2)}%<br>`;
        }
        if (showRanges && item.criticalChanceModifierRange) {
            content += `<span style=\"color: #ffd166;\">Critical Chance:</span> +${item.criticalChanceModifierRange.min}% - +${item.criticalChanceModifierRange.max}%<br>`;
        }
        if (item.criticalMultiplierModifier !== undefined) {
            content += `<span style=\"color: #ffd166;\">Critical Multiplier:</span> +${(item.criticalMultiplierModifier * 100).toFixed(2)}%<br>`;
        }
        if (showRanges && item.criticalMultiplierModifierRange) {
            content += `<span style=\"color: #ffd166;\">Critical Multiplier:</span> +${item.criticalMultiplierModifierRange.min}% - +${item.criticalMultiplierModifierRange.max}%<br>`;
        }
        content += `</div>`;
        renderedCritical = true;
    }

    // Other Stat Modifiers (we will later separate crit/combo/misc order by rendering order below)
    if (item.statModifiers) {
        const percentageStats = ['attackSpeed', 'criticalChance', 'criticalMultiplier'];
        let hasOtherStats = false;
        
        for (let stat in item.statModifiers) {
            if (
                stat !== 'damageTypes' &&
                stat !== 'precision' &&
                stat !== 'deflection' &&
                stat !== 'severedLimbChance' &&
                stat !== 'maxSeveredLimbs'
            ) {
                hasOtherStats = true;
                break;
            }
        }
        
        if (hasOtherStats) {
            if (!hasStats) {
                statsContent += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
                hasStats = true;
            }
            
            for (let stat in item.statModifiers) {
                if (
                    stat !== 'damageTypes' &&
                    stat !== 'precision' &&
                    stat !== 'deflection' &&
                    stat !== 'severedLimbChance' &&
                    stat !== 'maxSeveredLimbs'
                ) {
                    const statValue = item.statModifiers[stat];
                    const statName = capitalize(stat);
                    if (
                        showRanges &&
                        typeof statValue === 'object' &&
                        statValue.min !== undefined &&
                        statValue.max !== undefined
                    ) {
                        if (percentageStats.includes(stat)) {
                            statsContent += `<span style="color: #56cfe1;">${statName}:</span> +${statValue.min}% - +${statValue.max}%<br>`;
                        } else {
                            statsContent += `<span style="color: #56cfe1;">${statName}:</span> +${statValue.min} - +${statValue.max}<br>`;
                        }
                    } else if (typeof statValue === 'object') {
                        // Handle cases where statValue is an object without min/max
                        if (percentageStats.includes(stat)) {
                            statsContent += `<span style="color: #56cfe1;">${statName}:</span> +${statValue.value || 0}%<br>`;
                        } else {
                            statsContent += `<span style="color: #56cfe1;">${statName}:</span> +${statValue.value || 0}<br>`;
                        }
                    } else if (typeof statValue === 'number' || typeof statValue === 'string') {
                        if (percentageStats.includes(stat)) {
                            statsContent += `<span style="color: #56cfe1;">${statName}:</span> +${statValue}%<br>`;
                        } else {
                            statsContent += `<span style="color: #56cfe1;">${statName}:</span> +${statValue}<br>`;
                        }
                    }
                }
            }
        }
    }

    // Defense Types
    if (item.defenseTypes && Object.keys(item.defenseTypes).length > 0) {
        if (!hasStats) {
            statsContent += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
            hasStats = true;
        }
        
        // Define defense type descriptions
        const defenseDescriptions = {
            'physicalResistance': 'Physical Resistance',
            'elementalResistance': 'Elemental Resistance',
            'chemicalResistance': 'Chemical Resistance',
            'toughness': 'Physical Resistance (Legacy)',
            'fortitude': 'Mental Resistance (Legacy)',
            'heatResistance': 'Heat Resistance (Legacy)',
            'immunity': 'Chemical Resistance (Legacy)',
            'antimagnet': 'Magnetic Resistance (Legacy)'
        };
        
        for (let defenseType in item.defenseTypes) {
            const defenseValue = item.defenseTypes[defenseType];
            const description = defenseDescriptions[defenseType] || capitalize(defenseType);
            
            if (
                showRanges &&
                typeof defenseValue === 'object' &&
                defenseValue.min !== undefined &&
                defenseValue.max !== undefined
            ) {
                statsContent += `<div><span style="color: #64dfdf;">${description}:</span> <span style="color: #ffffff;">${defenseValue.min}-${defenseValue.max}</span></div>`;
            } else {
                statsContent += `<div><span style="color: #64dfdf;">${description}:</span> <span style="color: #ffffff;">${defenseValue}</span></div>`;
            }
        }
    }
    
    if (hasStats) {
        statsContent += `</div>`;
        content += statsContent;
    }

    // Health and shield section - only create if there are stats
    let healthShieldContent = '';
    let hasHealthShield = false;
    
    // Health Bonuses
    if (item.healthBonus !== undefined) {
        if (!hasHealthShield) {
            healthShieldContent += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
            hasHealthShield = true;
        }
        
        if (
            showRanges &&
            typeof item.healthBonus === 'object' &&
            item.healthBonus.min !== undefined &&
            item.healthBonus.max !== undefined
        ) {
            healthShieldContent += `<span style="color: #48bf91;">+${item.healthBonus.min} - +${item.healthBonus.max} Health</span><br>`;
        } else if (typeof item.healthBonus === 'object') {
            // Fix for [object Object] display
            const minVal = item.healthBonus.min !== undefined ? item.healthBonus.min : 0;
            const maxVal = item.healthBonus.max !== undefined ? item.healthBonus.max : minVal;
            
            if (minVal === maxVal) {
                healthShieldContent += `<span style="color: #48bf91;">+${minVal} Health</span><br>`;
            } else {
                healthShieldContent += `<span style="color: #48bf91;">+${minVal} - +${maxVal} Health</span><br>`;
            }
        } else {
            healthShieldContent += `<span style="color: #48bf91;">+${item.healthBonus} Health</span><br>`;
        }
    }
    // Health percent – show range for previews, rolled value for actual items
    if (showRanges ? (item.healthBonusPercentRange !== undefined) : (item.healthBonusPercentDisplay !== undefined || item.healthBonusPercent !== undefined)) {
        if (!hasHealthShield) {
            healthShieldContent += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
            hasHealthShield = true;
        }
        if (showRanges && typeof item.healthBonusPercentRange === 'object' && item.healthBonusPercentRange.min !== undefined && item.healthBonusPercentRange.max !== undefined) {
            healthShieldContent += `<span style="color: #48bf91;">+${item.healthBonusPercentRange.min}% - +${item.healthBonusPercentRange.max}% Health</span><br>`;
        } else {
            const pct = (item.healthBonusPercentDisplay !== undefined)
                ? item.healthBonusPercentDisplay
                : Math.round((item.healthBonusPercent || 0) * 100);
            healthShieldContent += `<span style="color: #48bf91;">+${pct}% Health</span><br>`;
        }
    }

    // Health Regen
    if (item.healthRegen !== undefined) {
        if (!hasHealthShield) {
            healthShieldContent += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
            hasHealthShield = true;
        }
        
        if (
            showRanges &&
            typeof item.healthRegen === 'object' &&
            item.healthRegen.min !== undefined &&
            item.healthRegen.max !== undefined
        ) {
            healthShieldContent += `<span style="color: #48bf91;">Health Regeneration:</span> +${item.healthRegen.min.toFixed(2)} - +${item.healthRegen.max.toFixed(2)} per second<br>`;
        } else {
            healthShieldContent += `<span style="color: #48bf91;">Health Regeneration:</span> +${item.healthRegen.toFixed(2)} per second<br>`;
        }
    }
    
    // If we have health/shield content, close the div and add it to the main content
    if (hasHealthShield) {
        healthShieldContent += `</div>`;
        content += healthShieldContent;
    }

    // Energy Shield Bonuses
    if (item.energyShieldBonus !== undefined) {
        if (!hasHealthShield) {
            healthShieldContent += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
            hasHealthShield = true;
        }
        
        if (
            showRanges &&
            typeof item.energyShieldBonus === 'object' &&
            item.energyShieldBonus.min !== undefined &&
            item.energyShieldBonus.max !== undefined
        ) {
            healthShieldContent += `<span style="color: #06d6a0;">+${item.energyShieldBonus.min} - +${item.energyShieldBonus.max} Energy Shield</span><br>`;
        } else if (typeof item.energyShieldBonus === 'object') {
            // Fix for [object Object] display
            const minVal = item.energyShieldBonus.min !== undefined ? item.energyShieldBonus.min : 0;
            const maxVal = item.energyShieldBonus.max !== undefined ? item.energyShieldBonus.max : minVal;
            
            if (minVal === maxVal) {
                healthShieldContent += `<span style="color: #06d6a0;">+${minVal} Energy Shield</span><br>`;
            } else {
                healthShieldContent += `<span style="color: #06d6a0;">+${minVal} - +${maxVal} Energy Shield</span><br>`;
            }
        } else {
            healthShieldContent += `<span style="color: #06d6a0;">+${item.energyShieldBonus} Energy Shield</span><br>`;
        }
    }
    
    // Energy Shield Percentage Bonuses
    // Energy Shield percent – range for previews, rolled value for actual items
    if (showRanges ? (item.energyShieldBonusPercentRange !== undefined) : (item.energyShieldBonusPercentDisplay !== undefined || item.energyShieldBonusPercent !== undefined)) {
        if (!hasHealthShield) {
            healthShieldContent += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
            hasHealthShield = true;
        }
        if (showRanges && typeof item.energyShieldBonusPercentRange === 'object' && item.energyShieldBonusPercentRange.min !== undefined && item.energyShieldBonusPercentRange.max !== undefined) {
            healthShieldContent += `<span style="color: #06d6a0;">+${item.energyShieldBonusPercentRange.min}% - +${item.energyShieldBonusPercentRange.max}% Energy Shield</span><br>`;
        } else {
            const pct = (item.energyShieldBonusPercentDisplay !== undefined)
                ? item.energyShieldBonusPercentDisplay
                : Math.round((item.energyShieldBonusPercent || 0) * 100);
            healthShieldContent += `<span style="color: #06d6a0;">+${pct}% Energy Shield</span><br>`;
        }
    }

    // Remove old duplicate critical block (handled earlier)

    // Combo attack modifiers
    const hasComboStats = item.comboAttack !== undefined || item.comboEffectiveness !== undefined || item.additionalComboAttacks !== undefined;
    if (hasComboStats) {
        content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
        content += `<span style="color: #ff9999; font-weight: bold;">Combo System:</span><br>`;
        if (item.comboAttack !== undefined) {
            let comboAttack;
            if (showRanges && typeof item.comboAttack === 'object' && item.comboAttack.min !== undefined) {
                comboAttack = `${item.comboAttack.min}% - ${item.comboAttack.max}%`;
            } else {
                comboAttack = `${item.comboAttack}%`;
            }
            content += `<span style="color: #ff9999;">Combo Attack:</span> +${comboAttack}<br>`;
        }
        if (item.comboEffectiveness !== undefined) {
            let comboEff;
            if (showRanges && typeof item.comboEffectiveness === 'object' && item.comboEffectiveness.min !== undefined) {
                comboEff = `${item.comboEffectiveness.min}% - ${item.comboEffectiveness.max}%`;
            } else {
                comboEff = `${item.comboEffectiveness}%`;
            }
            content += `<span style="color: #ffb366;">Combo Effectiveness:</span> +${comboEff}<br>`;
        }
        if (item.additionalComboAttacks !== undefined) {
            let additionalCombo;
            if (showRanges && typeof item.additionalComboAttacks === 'object' && item.additionalComboAttacks.min !== undefined) {
                additionalCombo = `${Math.floor(item.additionalComboAttacks.min)} - ${Math.floor(item.additionalComboAttacks.max)}`;
            } else {
                additionalCombo = `${Math.floor(item.additionalComboAttacks)}`;
            }
            content += `<span style="color: #ff6b6b;">Additional Combo Attacks:</span> +${additionalCombo}<br>`;
        }
        content += `</div>`;
    }

    // Other misc modifiers (precision, deflection)
    // Precision - only add section if it has content
    if (item.precision !== undefined) {
        content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
        if (
            typeof item.precision === 'object' &&
            item.precision.min !== undefined &&
            item.precision.max !== undefined
        ) {
            content += `<span style="color: #ffd166;">Precision:</span> +${item.precision.min} - +${item.precision.max}<br>`;
        } else {
            content += `<span style="color: #ffd166;">Precision:</span> +${item.precision}<br>`;
        }
        content += `</div>`;
    }

    // Deflection - only add section if it has content
    if (item.deflection !== undefined) {
        content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
        if (
            typeof item.deflection === 'object' &&
            item.deflection.min !== undefined &&
            item.deflection.max !== undefined
        ) {
            content += `<span style="color: #ffd166;">Deflection:</span> +${item.deflection.min} - +${item.deflection.max}<br>`;
        } else {
            content += `<span style="color: #ffd166;">Deflection:</span> +${item.deflection}<br>`;
        }
        content += `</div>`;
    }

    // Efficiency Stats - Handle both ranges (for shop) and actual values (for inventory)
    const hasEfficiencyStats = (showRanges && (item.armorEfficiency !== undefined || item.weaponEfficiency !== undefined || item.bionicEfficiency !== undefined)) ||
                              (!showRanges && (item.armorEfficiency !== undefined || item.weaponEfficiency !== undefined || item.bionicEfficiency !== undefined));
                              
    if (hasEfficiencyStats) {
        content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
        content += `<span style="color: #a8e6cf; font-weight: bold;">Efficiency:</span><br>`;
        
        if (item.armorEfficiency !== undefined) {
            let armorEff;
            if (showRanges && typeof item.armorEfficiency === 'object' && item.armorEfficiency.min !== undefined) {
                armorEff = `${item.armorEfficiency.min}% - ${item.armorEfficiency.max}%`;
            } else {
                armorEff = `${item.armorEfficiency}%`;
            }
            content += `<span style="color: #a8e6cf;">Armor Efficiency:</span> +${armorEff}<br>`;
        }
        
        if (item.weaponEfficiency !== undefined) {
            let weaponEff;
            if (showRanges && typeof item.weaponEfficiency === 'object' && item.weaponEfficiency.min !== undefined) {
                weaponEff = `${item.weaponEfficiency.min}% - ${item.weaponEfficiency.max}%`;
            } else {
                weaponEff = `${item.weaponEfficiency}%`;
            }
            content += `<span style="color: #ffd3a5;">Weapon Efficiency:</span> +${weaponEff}<br>`;
        }
        
        if (item.bionicEfficiency !== undefined) {
            let bionicEff;
            if (showRanges && typeof item.bionicEfficiency === 'object' && item.bionicEfficiency.min !== undefined) {
                bionicEff = `${item.bionicEfficiency.min}% - ${item.bionicEfficiency.max}%`;
            } else {
                bionicEff = `${item.bionicEfficiency}%`;
            }
            content += `<span style="color: #c5a3ff;">Bionic Efficiency:</span> +${bionicEff} <span style="color:#9fb4c8;">(increases bionic proc chances)</span><br>`;
        }
        
        content += `</div>`;
    }

    // Debuffs (first chance, then modifiers) and severed limb mechanics
    const effectsArray = Array.isArray(item.effects) ? item.effects : [];
    const severedFromTop = item.severedLimbChance !== undefined ? item.severedLimbChance : undefined;
    const severedFromMods = (item.statModifiers && item.statModifiers.severedLimbChance !== undefined) ? item.statModifiers.severedLimbChance : undefined;
    const maxLimbsFromTop = item.maxSeveredLimbs !== undefined ? item.maxSeveredLimbs : undefined;
    const maxLimbsFromMods = (item.statModifiers && item.statModifiers.maxSeveredLimbs !== undefined) ? item.statModifiers.maxSeveredLimbs : undefined;
    const severedVal = severedFromTop !== undefined ? severedFromTop : severedFromMods;
    const maxLimbsVal = maxLimbsFromTop !== undefined ? maxLimbsFromTop : maxLimbsFromMods;
    const hasSeveredChance = severedVal !== undefined;
    const hasMaxLimbs = maxLimbsVal !== undefined;
    const debuffEffects = effectsArray.filter(e => e && (e.action === 'applyDebuff' || e.action === 'applyStackingDebuff'));
    if (debuffEffects.length > 0 || hasSeveredChance || hasMaxLimbs) {
        content += `<div style=\"background: rgba(30, 0, 60, 0.35); padding: 4px; margin-bottom: 6px; border-radius: 2px; border-left: 2px solid #8ab6ff;\">`;
        content += `<span style=\"color: #8ab6ff; font-weight: bold;\">Debuffs:</span><br>`;
        debuffEffects.forEach((eff) => {
            const name = (eff.parameters && eff.parameters.debuffName) ? eff.parameters.debuffName : (eff.debuffName || 'Unknown');
            const chance = (typeof eff.chance === 'number') ? `${Math.round(eff.chance)}%` : (eff.chancePercent ? `${eff.chancePercent}%` : '—');
            content += `<span style=\"color:#cfe6ff;\">${capitalize(name)}:</span> <span style=\"color:#ffd166;\">${chance} chance</span>`;
            if (eff.parameters && eff.parameters.duration) {
                content += ` <span style=\"color:#a0bfff;\">(${eff.parameters.duration}s)</span>`;
            }
            content += `<br>`;
        });
        if (hasSeveredChance) {
            const val = severedVal;
            const txt = (showRanges && typeof val === 'object' && val.min !== undefined) ? `${val.min}% - ${val.max}%` : `${val}%`;
            content += `<span style=\"color:#cfe6ff;\">Severed Limb Chance:</span> <span style=\"color:#ffd166;\">+${txt}</span><br>`;
        }
        if (hasMaxLimbs) {
            const v2 = maxLimbsVal;
            const txt2 = (showRanges && typeof v2 === 'object' && v2.min !== undefined) ? `${v2.min} - ${v2.max}` : `${v2}`;
            content += `<span style=\"color:#cfe6ff;\">Max Severed Limbs:</span> <span style=\"color:#ffd166;\">${txt2}</span><br>`;
        }
        const seepingStacks = item.maxSeepingWoundStacks ?? item.statModifiers?.maxSeepingWoundStacks;
        if (seepingStacks !== undefined) {
            const stackBonus = (showRanges && typeof seepingStacks === 'object' && seepingStacks.min !== undefined)
                ? `${seepingStacks.min} - ${seepingStacks.max}`
                : `${seepingStacks}`;
            content += `<span style=\"color:#cfe6ff;\">Maximum Seeping Wound Stacks:</span> <span style=\"color:#ffd166;\">+${stackBonus}</span><br>`;
        }
        content += `</div>`;
    }

    // Bionic Sync
    if (item.bionicSync !== undefined) {
        content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
        content += `<span style="color: #b19cd9; font-weight: bold;">Bionic Enhancement:</span><br>`;
        let bionicSync;
        if (showRanges && typeof item.bionicSync === 'object' && item.bionicSync.min !== undefined) {
            bionicSync = `${item.bionicSync.min}% - ${item.bionicSync.max}%`;
        } else {
            bionicSync = `${item.bionicSync}%`;
        }
        content += `<span style="color: #b19cd9;">Bionic Sync:</span> +${bionicSync} <span style="color:#9fb4c8;">(amplifies static stats from equipped bionics)</span><br>`;
        content += `</div>`;
    }


    // Mastery System
    const hasMasteryStats = item.kineticMastery !== undefined || item.slashingMastery !== undefined;
    if (hasMasteryStats) {
        content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
        content += `<span style="color: #ffa500; font-weight: bold;">Mastery:</span><br>`;
        
        if (item.kineticMastery !== undefined) {
            let kineticMast;
            if (showRanges && typeof item.kineticMastery === 'object' && item.kineticMastery.min !== undefined) {
                kineticMast = `${item.kineticMastery.min} - ${item.kineticMastery.max}`;
            } else {
                kineticMast = `${item.kineticMastery}`;
            }
            content += `<span style="color: #ffa500;">Kinetic Mastery:</span> +${kineticMast}<br>`;
        }
        
        if (item.slashingMastery !== undefined) {
            let slashingMast;
            if (showRanges && typeof item.slashingMastery === 'object' && item.slashingMastery.min !== undefined) {
                slashingMast = `${item.slashingMastery.min} - ${item.slashingMastery.max}`;
            } else {
                slashingMast = `${item.slashingMastery}`;
            }
            content += `<span style="color: #dc143c;">Slashing Mastery:</span> +${slashingMast}<br>`;
        }
        
        content += `</div>`;
    }

    // Moved Combat Mechanics (Severed Limb) into Debuffs section below

    // Insert Passive Bonuses just above Wires
    if (capturedPassiveContent) {
        content += capturedPassiveContent;
    }

    // Rolled Modifiers (generated instance only)
    if (!showRanges && Array.isArray(item.rolledModifiers) && item.rolledModifiers.length > 0) {
        const lines = item.rolledModifiers.map(mod => {
            if (!mod || typeof mod !== 'object') return '';
            const gradeText = mod.gradeLabel || (typeof window.getModifierGradeLabel === 'function'
                ? window.getModifierGradeLabel(mod.grade)
                : `Grade ${mod.grade || '?'}`);

            const displayName = mod.displayName || mod.id || 'Modifier';
            let displayValue = mod.displayValue;
            if (displayValue === undefined || displayValue === null) {
                displayValue = mod.value;
                if (mod.isPercent && typeof displayValue === 'number' && Math.abs(displayValue) <= 1.5) {
                    displayValue = displayValue * 100;
                }
            }

            if (typeof displayValue === 'number') {
                displayValue = Number.isInteger(displayValue) ? `${displayValue}` : displayValue.toFixed(2);
            }

            const valueText = mod.isPercent ? `+${displayValue}%` : `+${displayValue}`;
            return `<div style="color:#cfe6ff;">${valueText} ${displayName} <span style="color:#9cc5ff;">[${gradeText}]</span></div>`;
        }).filter(Boolean).join('');

        if (lines) {
            content += `<div style="background: rgba(0, 20, 45, 0.6); padding: 6px; margin-bottom: 6px; border-radius: 4px; border-left: 2px solid #00ffcc;">` +
                `<div style="color:#66ffcc; font-weight:bold; margin-bottom:3px;">Rolled Modifiers</div>${lines}</div>`;
        }
    }

    // Wires (sockets) - show for instantiated items only
    if (Array.isArray(item.rolledWires) && item.rolledWires.length > 0) {
        const colorBadge = c => ({ red: '#ff6b6b', green: '#51cf66', blue: '#74c0fc', black: '#ced4da' }[c] || '#adb5bd');
        const chips = item.rolledWires.map(w => {
            const line1 = `<span style=\"display:inline-block; border:1px solid ${colorBadge(w.color)}; color:${colorBadge(w.color)}; padding:1px 4px; margin:1px; border-radius:3px; font-size:11px;\">${w.color}${w.chip ? ' • ' + w.chip.name : ''}</span>`;
            let statsHtml = '';
            if (w.chip) {
                const chip = w.chip;
                const parts = [];
                // Flat damage types
                if (chip.damageTypes) {
                    for (const dt in chip.damageTypes) {
                        parts.push(`+${chip.damageTypes[dt]} ${dt}`);
                    }
                }
                // statModifiers (show key/basic cases)
                if (chip.statModifiers) {
                    if (chip.statModifiers.damageTypes) {
                        for (const dt in chip.statModifiers.damageTypes) {
                            parts.push(`+${chip.statModifiers.damageTypes[dt]}% ${dt} dmg`);
                        }
                    }
                    for (const k in chip.statModifiers) {
                        if (k === 'damageTypes' || k === 'damageGroups') continue;
                        parts.push(`+${chip.statModifiers[k]} ${k}`);
                    }
                }
                if (chip.precision) parts.push(`+${chip.precision} Precision`);
                if (chip.deflection) parts.push(`+${chip.deflection} Deflection`);
                if (parts.length > 0) {
                    statsHtml = `<div style=\"color:#cfe6ff; font-size:11px; margin-left:4px;\">${parts.join(' • ')}</div>`;
                }
            }
            return `${line1}${statsHtml}`;
        }).join('<br>');
        content += `<div style=\"background: rgba(0, 20, 45, 0.6); padding: 4px; margin-bottom: 6px; border-radius: 4px; border-left: 2px solid #00ffcc;\">\n` +
                   `<div style=\"color:#66ffcc; font-weight:bold; margin-bottom:2px;\">Wires</div>` +
                   `${chips}</div>`;
    }

    // Description - only add section if it has content
    if (item.description) {
        content += `<div style="background: rgba(0, 15, 40, 0.5); padding: 4px; margin-bottom: 6px; border-radius: 2px;">`;
        content += `<em style="color: #7fdbff;">${item.description}</em><br>`;
        content += `</div>`;
    }
    
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
document.addEventListener('DOMContentLoaded', () => {
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
