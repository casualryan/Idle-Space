// Cross-registry validation for authored items, recipes, loot, shops, locations, and passives.

const CONTENT_EQUIPMENT_SLOTS = new Set(['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves', 'bionic', 'chip']);
const CONTENT_ITEM_SLOTS = new Set([...CONTENT_EQUIPMENT_SLOTS, 'material']);
const CONTENT_DAMAGE_GROUPS = new Set(['physical', 'elemental', 'chemical']);
const CONTENT_WEAPON_FAMILIES = new Set(['blades', 'impact', 'sidearms', 'rifles', 'projectors', 'ordnance', 'conduits']);
const CONTENT_WEAPON_TAGS = new Set([
    'melee', 'ranged', 'oneHanded', 'twoHanded', 'contact', 'projectile',
    'beam', 'stream', 'area', 'rapid', 'deliberate'
]);
const CONTENT_COMBAT_STYLE_IDS = new Set(['balancedStyle', 'heavyStyle', 'twinStyle', 'counterStyle']);
const CONTENT_CONDITIONAL_PASSIVE_KEYS = new Set(['weaponFamilyBonuses', 'weaponTagBonuses', 'combatStyleBonuses']);
const CONTENT_PASSIVE_STAT_KEYS = new Set([
    'attackSpeed', 'damageTypes', 'damageGroups', 'healthPercent', 'energyShieldPercent',
    'criticalChance', 'criticalMultiplier', 'flatDamageTypes', 'flatHealth', 'flatEnergyShield',
    'healthRegen', 'precision', 'deflection', 'defenseTypes', 'armorEfficiency',
    'weaponEfficiency', 'bionicEfficiency', 'bionicSync', 'comboAttack', 'comboEffectiveness',
    'additionalComboAttacks', 'severedLimbChance', 'maxSeveredLimbs', 'maxSeepingWoundStacks',
    'propagationTargets',
    'damageRollFloorBonus', 'debuffChanceBonus', 'debuffDurationBonus', 'directDamageMultiplier',
    'dotDamageMultiplier', 'damageVsDebuffed', 'damageTakenReduction', 'armorPenetration',
    'attackTimeModifier', ...CONTENT_CONDITIONAL_PASSIVE_KEYS
]);
const CONTENT_STYLE_PROFILE_KEYS = new Set([
    'attackTimeMultiplier', 'damageMultiplier', 'hitCount', 'hitDamageMultipliers',
    'procOnHit', 'procOnCritical', 'procCoefficient', 'comboAfterSkill', 'comboFromAggregate',
    'comboProcStrength', 'critChanceMultiplier', 'critChanceBonus', 'criticalDamageBonus',
    'debuffApplyBonus', 'damageRollFloorBonus', 'mechanics'
]);
const CONTENT_STYLE_MECHANICS = new Set([
    'adaptiveCrit', 'alternatingShield', 'perfectThird', 'alternatingPurpose',
    'critHaste20', 'aftershock', 'gatheringForce', 'critHaste25', 'siegeRhythm',
    'executionStroke', 'openingFeint', 'secondHitFloor', 'mirrorFinish',
    'convergingBlows', 'counterCrit', 'counterDebuff', 'bracedGuard', 'storedForce',
    'quickRiposte', 'shieldReprisal', 'perfectParry', 'vengefulLoop', 'unbrokenForm'
]);
const CONTENT_ITEM_TEMPLATE_KEYS = new Set([
    'name', 'description', 'icon', 'color', 'type', 'slot', 'weaponType', 'weaponFamily',
    'weaponFamilyLabel', 'weaponTags', 'levelRequirement',
    'developerOnly', 'disableRandomModifiers', 'stackable', 'quantity', 'salePrice', 'sellValue', 'isDisassembleable',
    'disassembleResults', 'effects', 'passiveBonuses', 'rollGroups', 'wires',
    'weaponBaseDamage', 'weaponLocalFlatDamage', 'weaponLocalTypeIncrease',
    'weaponLocalGroupIncrease', 'weaponDamageConversion', 'weaponLocalAttackSpeedPercent',
    'damageTypes', 'defenseTypes', 'statModifiers', 'bAttackSpeed',
    'attackSpeed', 'attackSpeedModifier', 'attackSpeedModifierRange',
    'criticalChance', 'criticalChanceModifier', 'criticalChanceModifierRange',
    'criticalMultiplier', 'criticalMultiplierModifier', 'criticalMultiplierModifierRange',
    'healthBonus', 'healthBonusPercent', 'healthBonusPercentRange',
    'energyShieldBonus', 'energyShieldBonusPercent', 'energyShieldBonusPercentRange',
    'precision', 'deflection', 'healthRegen', 'armorEfficiency', 'weaponEfficiency',
    'bionicEfficiency', 'bionicSync', 'armorPenetration', 'debuffChanceBonus',
    'debuffDurationBonus', 'damageRollFloorBonus', 'directDamageMultiplier',
    'dotDamageMultiplier', 'damageVsDebuffed', 'damageTakenReduction',
    'statusResistance', 'statusDurationReduction', 'comboAttack', 'comboEffectiveness',
    'additionalComboAttacks', 'kineticMastery', 'slashingMastery', 'severedLimbChance',
    'maxSeveredLimbs', 'maxSeepingWoundStacks', ...RESERVED_ITEM_STAT_KEYS
]);

function isAuthoredNumericValue(value) {
    if (Number.isFinite(Number(value))) return true;
    if (typeof value === 'string') return /^\s*-?\d+(?:\.\d+)?\s*-\s*-?\d+(?:\.\d+)?\s*$/.test(value);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Number.isFinite(Number(value.min)) && Number.isFinite(Number(value.max));
}

function getAuthoredMinimum(value) {
    if (Number.isFinite(Number(value))) return Number(value);
    if (typeof value === 'string') {
        const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/);
        return match ? Math.min(Number(match[1]), Number(match[2])) : NaN;
    }
    if (value && typeof value === 'object') return Math.min(Number(value.min), Number(value.max));
    return NaN;
}

function getAuthoredMaximum(value) {
    if (Number.isFinite(Number(value))) return Number(value);
    if (typeof value === 'string') {
        const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/);
        return match ? Math.max(Number(match[1]), Number(match[2])) : NaN;
    }
    if (value && typeof value === 'object') return Math.max(Number(value.min), Number(value.max));
    return NaN;
}

function validateAuthoredMap(map, allowedKeys, context, errors) {
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
        errors.push(`${context} must be an object`);
        return;
    }
    for (const [key, value] of Object.entries(map)) {
        if (!allowedKeys.has(key)) errors.push(`${context} has unknown key: ${key}`);
        if (!isAuthoredNumericValue(value)) errors.push(`${context}.${key} must be numeric or a numeric range`);
    }
}

function validatePassiveEffectContent(effects, passiveName, report, allowConditional = true) {
    for (const [key, value] of Object.entries(effects || {})) {
        if (!CONTENT_PASSIVE_STAT_KEYS.has(key)) {
            report('passive', passiveName, `unknown stat category: ${key}`);
            continue;
        }
        if (CONTENT_CONDITIONAL_PASSIVE_KEYS.has(key)) {
            if (!allowConditional || !value || typeof value !== 'object' || Array.isArray(value)) {
                report('passive', passiveName, `${key} must be an object of conditional effect packages`);
                continue;
            }
            const allowedTargets = key === 'weaponFamilyBonuses'
                ? CONTENT_WEAPON_FAMILIES
                : key === 'weaponTagBonuses' ? CONTENT_WEAPON_TAGS : CONTENT_COMBAT_STYLE_IDS;
            for (const [target, packageEffects] of Object.entries(value)) {
                if (!allowedTargets.has(target)) report('passive', passiveName, `unknown ${key} target: ${target}`);
                if (!packageEffects || typeof packageEffects !== 'object' || Array.isArray(packageEffects)) {
                    report('passive', passiveName, `${key}.${target} must be an effect package`);
                    continue;
                }
                validatePassiveEffectContent(packageEffects, passiveName, report, false);
            }
        } else if (key === 'damageTypes' || key === 'flatDamageTypes') {
            for (const type of Object.keys(value || {})) {
                if (!COMBAT_DAMAGE_TYPES.includes(type)) report('passive', passiveName, `unknown damage type: ${type}`);
            }
        } else if (key === 'damageGroups') {
            for (const group of Object.keys(value || {})) {
                if (!CONTENT_DAMAGE_GROUPS.has(group)) report('passive', passiveName, `unknown damage group: ${group}`);
            }
        } else if (key === 'defenseTypes') {
            for (const type of Object.keys(value || {})) {
                if (!COMBAT_RESISTANCE_TYPES.includes(type)) report('passive', passiveName, `unknown resistance type: ${type}`);
            }
        } else if (!Number.isFinite(Number(value))) {
            report('passive', passiveName, `${key} must be numeric`);
        }
    }
}

function validateItemContent(item, context = 'item', options = {}) {
    const errors = [];
    const warnings = [];
    const name = item?.name || `Unnamed ${context}`;
    if (!item || typeof item !== 'object') return { name, valid: false, errors: [`${context} must be an object`], warnings };
    if (!item.name || typeof item.name !== 'string') errors.push('name is required');
    if (!item.type || typeof item.type !== 'string') errors.push('type is required');
    if (!options.allowInstanceFields) {
        for (const key of Object.keys(item)) {
            if (!CONTENT_ITEM_TEMPLATE_KEYS.has(key)) errors.push(`unknown item field: ${key}`);
        }
    }
    const normalizedSlot = typeof item.slot === 'string' && item.slot.toLowerCase() === 'material'
        ? 'material'
        : item.slot;
    if (item.slot !== undefined && !CONTENT_ITEM_SLOTS.has(normalizedSlot)) errors.push(`unknown item slot: ${item.slot}`);
    if (CONTENT_EQUIPMENT_SLOTS.has(item.slot)) {
        const level = item.levelRequirement ?? item.level;
        if (!isAuthoredNumericValue(level) || !(getAuthoredMinimum(level) >= 1)) {
            errors.push('equipment requires a positive levelRequirement');
        }
    }

    const isWeapon = String(item.type || '').toLowerCase() === 'weapon' || item.slot === 'mainHand';
    if (isWeapon) {
        const hasRolledBaseDamage = (item.rollGroups || []).some(group => (group?.from || [])
            .some(entry => String(entry?.path || '').startsWith('damageTypes.')));
        if ((!item.weaponBaseDamage || typeof item.weaponBaseDamage !== 'object') && !hasRolledBaseDamage) {
            errors.push('weaponBaseDamage is required');
        }
        if (item.damageTypes) errors.push('weapons cannot retain legacy damageTypes beside weaponBaseDamage');
        if (!CONTENT_WEAPON_FAMILIES.has(item.weaponFamily)) errors.push(`unknown weapon family: ${item.weaponFamily || '(missing)'}`);
        if (!Array.isArray(item.weaponTags) || item.weaponTags.length === 0) {
            errors.push('weaponTags are required');
        } else {
            for (const tag of item.weaponTags) {
                if (!CONTENT_WEAPON_TAGS.has(tag)) errors.push(`unknown weapon tag: ${tag}`);
            }
        }
    }
    if (item.weaponBaseDamage) validateAuthoredMap(item.weaponBaseDamage, new Set(COMBAT_DAMAGE_TYPES), 'weaponBaseDamage', errors);
    if (item.damageTypes) validateAuthoredMap(item.damageTypes, new Set(COMBAT_DAMAGE_TYPES), 'damageTypes', errors);
    if (item.defenseTypes) validateAuthoredMap(item.defenseTypes, new Set(COMBAT_RESISTANCE_TYPES), 'defenseTypes', errors);
    if (item.statModifiers?.damageTypes) {
        validateAuthoredMap(item.statModifiers.damageTypes, new Set(COMBAT_DAMAGE_TYPES), 'statModifiers.damageTypes', errors);
    }
    if (item.statModifiers?.damageGroups) {
        validateAuthoredMap(item.statModifiers.damageGroups, CONTENT_DAMAGE_GROUPS, 'statModifiers.damageGroups', errors);
    }

    const unknownModifierKeys = typeof getUnknownItemStatModifierKeys === 'function'
        ? getUnknownItemStatModifierKeys(item)
        : [];
    unknownModifierKeys.forEach(key => errors.push(`unknown statModifiers key: ${key}`));
    for (const key of Object.keys(item.statModifiers || {})) {
        if (key === 'damageTypes' || key === 'damageGroups') continue;
        if (!isAuthoredNumericValue(item.statModifiers[key])) errors.push(`statModifiers.${key} must be numeric or a numeric range`);
    }
    for (const key of window.coreboundStatPipeline?.reservedStatKeys || []) {
        if (item[key] !== undefined || item.statModifiers?.[key] !== undefined) {
            warnings.push(`${key} is authored but reserved from live stat calculation`);
        }
    }
    return { name, valid: errors.length === 0, errors, warnings };
}

function validateCoreboundContent(registries = {}) {
    const errors = [];
    const warnings = [];
    const items = Array.isArray(registries.items) ? registries.items : [];
    const enemies = Array.isArray(registries.enemies) ? registries.enemies : [];
    const recipes = Array.isArray(registries.recipes) ? registries.recipes : [];
    const shops = Array.isArray(registries.shops) ? registries.shops : [];
    const locations = Array.isArray(registries.locations) ? registries.locations : [];
    const passives = Array.isArray(registries.passives) ? registries.passives : [];
    const combatStyles = Array.isArray(registries.combatStyles) ? registries.combatStyles : [];
    const lootPools = registries.lootPools && typeof registries.lootPools === 'object' ? registries.lootPools : {};
    const lootTiers = registries.lootTiers && typeof registries.lootTiers === 'object' ? registries.lootTiers : {};
    const materialAcquisition = registries.materialAcquisition && typeof registries.materialAcquisition === 'object'
        ? registries.materialAcquisition
        : {};
    const itemNames = new Set(items.map(item => item?.name).filter(Boolean));
    const itemByName = new Map(items.map(item => [item?.name, item]));
    const enemyNames = new Set(enemies.map(enemy => enemy?.name).filter(Boolean));
    const passiveNames = new Set(passives.map(passive => passive?.name).filter(Boolean));
    const passiveIds = new Set(passives.map(passive => passive?.id).filter(Boolean));
    const passiveReferences = new Set([...passiveNames, ...passiveIds]);
    const validTierIds = new Set(Object.values(lootTiers).map(tier => Number(tier?.id)).filter(Number.isFinite));

    const report = (section, name, message, severity = 'error') => {
        const entry = `${section} ${name}: ${message}`;
        (severity === 'warning' ? warnings : errors).push(entry);
    };
    const findDuplicates = (entries, section) => {
        const seen = new Set();
        for (const name of entries) {
            if (seen.has(name)) report(section, name, 'duplicate name');
            seen.add(name);
        }
    };

    findDuplicates(items.map(item => item?.name).filter(Boolean), 'item');
    findDuplicates(enemies.map(enemy => enemy?.name).filter(Boolean), 'enemy');
    findDuplicates(recipes.map(recipe => recipe?.name).filter(Boolean), 'recipe');
    findDuplicates(shops.map(shop => shop?.name).filter(Boolean), 'shop');
    findDuplicates(locations.map(location => location?.name).filter(Boolean), 'location');
    findDuplicates(passives.map(passive => passive?.id).filter(Boolean), 'passive ID');
    findDuplicates(combatStyles.map(style => style?.id).filter(Boolean), 'combat style ID');

    for (const item of items) {
        const validation = validateItemContent(item);
        validation.errors.forEach(error => report('item', validation.name, error));
        validation.warnings.forEach(warning => report('item', validation.name, warning, 'warning'));
        for (const result of item?.disassembleResults || []) {
            if (!itemNames.has(result?.name)) report('item', validation.name, `unknown disassembly result: ${result?.name}`);
            if (!(Number(result?.quantity) > 0)) report('item', validation.name, `invalid disassembly quantity for ${result?.name}`);
        }
        for (const passiveName of Object.keys(item?.passiveBonuses || {})) {
            if (!passiveReferences.has(passiveName)) report('item', validation.name, `unknown passive bonus: ${passiveName}`);
        }
        for (const [groupIndex, group] of (item?.rollGroups || []).entries()) {
            if (!Array.isArray(group?.from) || group.from.length === 0) {
                report('item', validation.name, `rollGroups[${groupIndex}] requires candidates`);
                continue;
            }
            const authoredPick = group.pick ?? 1;
            const minimumPick = getAuthoredMinimum(authoredPick);
            const maximumPick = getAuthoredMaximum(authoredPick);
            if (!isAuthoredNumericValue(authoredPick)
                || !Number.isInteger(minimumPick)
                || !Number.isInteger(maximumPick)
                || minimumPick < 1
                || maximumPick > group.from.length) {
                report('item', validation.name, `rollGroups[${groupIndex}] has invalid pick count`);
            }
            for (const candidate of group.from) {
                const path = String(candidate?.path || '');
                const [root, category, key] = path.split('.');
                let validPath = false;
                if (root === 'damageTypes') validPath = COMBAT_DAMAGE_TYPES.includes(category);
                else if (root === 'defenseTypes') validPath = COMBAT_RESISTANCE_TYPES.includes(category);
                else if (root === 'passiveBonuses') validPath = passiveReferences.has(category);
                else if (root === 'statModifiers' && category === 'damageTypes') validPath = COMBAT_DAMAGE_TYPES.includes(key);
                else if (root === 'statModifiers' && category === 'damageGroups') validPath = CONTENT_DAMAGE_GROUPS.has(key);
                else if (window.coreboundStatPipeline?.scalarStatRules?.[root]) validPath = true;
                else if ((window.coreboundStatPipeline?.reservedStatKeys || []).includes(root)) validPath = true;
                if (!validPath) report('item', validation.name, `unknown roll-group path: ${path}`);
                if (!isAuthoredNumericValue(candidate?.value)) {
                    report('item', validation.name, `roll-group value for ${path} must be numeric or a numeric range`);
                }
            }
        }
    }

    for (const recipe of recipes) {
        const name = recipe?.name || 'Unnamed recipe';
        if (!itemNames.has(name)) report('recipe', name, 'output item is not registered');
        if (!recipe?.ingredients || typeof recipe.ingredients !== 'object') report('recipe', name, 'ingredients are required');
        const output = itemByName.get(name);
        const outputLevel = getAuthoredMinimum(output?.levelRequirement ?? output?.level);
        const ingredientSets = [{ label: 'default', ingredients: recipe?.ingredients || {} }];
        if (recipe?.weaponChassis) {
            const damageOptions = Array.isArray(recipe.damageOptions) ? recipe.damageOptions : [];
            if (damageOptions.length !== COMBAT_DAMAGE_TYPES.length
                || damageOptions.some(type => !COMBAT_DAMAGE_TYPES.includes(type))) {
                report('recipe', name, 'weapon chassis must support every canonical damage type');
            }
            if (!recipe.ingredientsByDamage || typeof recipe.ingredientsByDamage !== 'object') {
                report('recipe', name, 'weapon chassis requires ingredientsByDamage');
            } else {
                for (const damageType of damageOptions) {
                    ingredientSets.push({
                        label: `${damageType} core`,
                        ingredients: recipe.ingredientsByDamage[damageType] || {}
                    });
                }
            }
        }
        for (const ingredientSet of ingredientSets) {
            for (const [ingredient, quantity] of Object.entries(ingredientSet.ingredients)) {
                if (!itemNames.has(ingredient)) report('recipe', name, `unknown ${ingredientSet.label} ingredient: ${ingredient}`);
                if (!(Number(quantity) > 0)) report('recipe', name, `invalid ${ingredientSet.label} ingredient quantity: ${ingredient}`);
                const source = materialAcquisition[ingredient];
                if (!source) {
                    report('recipe', name, `${ingredientSet.label} ingredient has no documented acquisition source: ${ingredient}`);
                } else if (Number.isFinite(outputLevel) && Number(source.level) > outputLevel) {
                    report('recipe', name, `${ingredient} first appears at level ${source.level}, after this level ${outputLevel} ${ingredientSet.label} recipe`);
                }
            }
        }
        if (recipe?.craftingTime !== undefined && Number(recipe.craftingTime) !== 5) {
            report('recipe', name, 'craftingTime must be five seconds');
        }
    }

    for (const [poolName, pool] of Object.entries(lootPools)) {
        if (!validTierIds.has(Number(pool?.tier))) report('loot pool', poolName, `unknown tier: ${pool?.tier}`);
        if (!Array.isArray(pool?.items) || pool.items.length === 0) report('loot pool', poolName, 'items are required');
        for (const entry of pool?.items || []) {
            if (!itemNames.has(entry?.itemName)) report('loot pool', poolName, `unknown item: ${entry?.itemName}`);
            if (!(Number(entry?.weight) > 0)) report('loot pool', poolName, `invalid weight for ${entry?.itemName}`);
            const minimumQuantity = Number(entry?.minQuantity ?? 1);
            const maximumQuantity = Number(entry?.maxQuantity ?? minimumQuantity);
            if (!Number.isInteger(minimumQuantity) || minimumQuantity < 1) {
                report('loot pool', poolName, `invalid minimum quantity for ${entry?.itemName}`);
            }
            if (!Number.isInteger(maximumQuantity) || maximumQuantity < minimumQuantity) {
                report('loot pool', poolName, `invalid maximum quantity for ${entry?.itemName}`);
            }
        }
    }

    for (const enemy of enemies) {
        const name = enemy?.name || 'Unnamed enemy';
        if (!/^images\/enemies\/[a-z0-9-]+\.png$/.test(String(enemy?.portrait || ''))) {
            report('enemy', name, 'portrait must reference a generated enemy PNG');
        }
        if (enemy?.tauntAbility) {
            for (const field of ['initialDelay', 'duration', 'cooldown']) {
                if (!(Number(enemy.tauntAbility[field]) > 0)) report('enemy', name, `taunt ${field} must be positive`);
            }
        }
        for (const [tier, pools] of Object.entries(enemy?.lootConfig?.poolsByTier || {})) {
            if (!validTierIds.has(Number(tier))) report('enemy', name, `unknown loot tier: ${tier}`);
            if (!Array.isArray(pools)) report('enemy', name, `loot tier ${tier} pools must be an array`);
            for (const poolName of pools || []) {
                if (!lootPools[poolName]) report('enemy', name, `unknown loot pool: ${poolName}`);
            }
        }
        const dropChance = Number(enemy?.lootConfig?.baseDropChance);
        if (!Number.isFinite(dropChance) || dropChance < 0 || dropChance > 1) report('enemy', name, 'baseDropChance must be between 0 and 1');
    }

    for (const location of locations) {
        const name = location?.name || 'Unnamed location';
        if (!(Number(location?.recommendedLevel) >= 1)) report('location', name, 'recommendedLevel must be positive');
        if (!(Number(location?.numFights) >= 1)) report('location', name, 'numFights must be positive');
        for (const encounter of location?.enemies || []) {
            if (!enemyNames.has(encounter?.name)) report('location', name, `unknown enemy: ${encounter?.name}`);
            if (!(Number(encounter?.spawnRate) > 0)) report('location', name, `invalid spawnRate for ${encounter?.name}`);
            const empoweredChance = Number(encounter?.empoweredChance ?? 0);
            if (!Number.isFinite(empoweredChance) || empoweredChance < 0 || empoweredChance > 1) {
                report('location', name, `invalid empoweredChance for ${encounter?.name}`);
            }
        }
    }

    for (const shop of shops) {
        const name = shop?.name || 'Unnamed shop';
        if (!shop?.name) report('shop', name, 'name is required');
        for (const entry of shop?.inventory || []) {
            if (entry?.developerOnly && !registries.developerMode) continue;
            if (!entry?.isService && !itemNames.has(entry?.itemName)) report('shop', name, `unknown item: ${entry?.itemName}`);
            if (!(Number(entry?.price) >= 0)) report('shop', name, `invalid price for ${entry?.itemName}`);
            if (!(Number(entry?.levelReq) >= 1)) report('shop', name, `invalid level requirement for ${entry?.itemName}`);
        }
    }

    for (const passive of passives) {
        const name = passive?.name || 'Unnamed passive';
        if (!passive?.id) report('passive', name, 'id is required');
        if (!passive?.type) report('passive', name, 'node type is required');
        if (!Number.isFinite(passive?.x) || !Number.isFinite(passive?.y)) report('passive', name, 'coordinates are required');
        if (!Array.isArray(passive?.connections)) report('passive', name, 'connections are required');
        for (const connection of passive?.connections || []) {
            if (!passiveIds.has(connection)) report('passive', name, `unknown connection: ${connection}`);
        }
        if (!passive?.effects || typeof passive.effects !== 'object') report('passive', name, 'effects are required');
        validatePassiveEffectContent(passive?.effects, name, report);
    }

    const styleChoiceIds = new Set();
    for (const style of combatStyles) {
        const name = style?.name || 'Unnamed combat style';
        if (!style?.id) report('combat style', name, 'id is required');
        if (!style?.description) report('combat style', name, 'description is required');
        if (!style?.base || typeof style.base !== 'object') report('combat style', name, 'base profile is required');
        for (const key of Object.keys(style?.base || {})) {
            if (!CONTENT_STYLE_PROFILE_KEYS.has(key)) report('combat style', name, `unknown base profile key: ${key}`);
        }
        if (!Array.isArray(style?.masteries) || style.masteries.length !== 3) {
            report('combat style', name, 'exactly three mastery tiers are required');
            continue;
        }
        for (const [index, mastery] of style.masteries.entries()) {
            if (Number(mastery?.tier) !== index + 1) report('combat style', name, `mastery tier ${index + 1} is out of order`);
            if (!(Number(mastery?.unlockLevel) >= 1)) report('combat style', name, `mastery tier ${index + 1} has an invalid unlock level`);
            if (!Array.isArray(mastery?.choices) || mastery.choices.length !== 3) {
                report('combat style', name, `mastery tier ${index + 1} requires exactly three choices`);
                continue;
            }
            for (const choice of mastery.choices) {
                const choiceName = choice?.name || 'Unnamed choice';
                if (!choice?.id) report('combat style', name, `${choiceName} requires an ID`);
                else if (styleChoiceIds.has(choice.id)) report('combat style', name, `duplicate mastery choice ID: ${choice.id}`);
                else styleChoiceIds.add(choice.id);
                if (!choice?.description) report('combat style', name, `${choiceName} requires a description`);
                for (const group of ['add', 'multiply', 'set']) {
                    const entries = choice?.modifiers?.[group] || {};
                    for (const key of Object.keys(entries)) {
                        if (!CONTENT_STYLE_PROFILE_KEYS.has(key)) report('combat style', name, `${choiceName} has unknown modifier: ${key}`);
                    }
                }
                for (const mechanic of choice?.mechanics || []) {
                    if (!CONTENT_STYLE_MECHANICS.has(mechanic)) report('combat style', name, `${choiceName} has unknown mechanic: ${mechanic}`);
                }
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

function assertCoreboundContent(registries = {}) {
    const validation = validateCoreboundContent(registries);
    validation.warnings.forEach(warning => console.warn(`Content warning: ${warning}`));
    if (!validation.valid) throw new TypeError(`Invalid Corebound content: ${validation.errors.join(' | ')}`);
    return validation;
}

window.coreboundContentSchema = Object.freeze({ validateItemContent, validateCoreboundContent, assertCoreboundContent });

if (typeof window.registerCoreboundInitializer === 'function') {
    window.registerCoreboundInitializer(() => {
        assertCoreboundContent({
            items: window.items || [],
            enemies: window.enemies || [],
            recipes: window.recipes || [],
            shops: typeof npcs !== 'undefined' ? npcs : [],
            locations: typeof locations !== 'undefined' ? locations : [],
            passives: typeof passives !== 'undefined' ? passives : [],
            combatStyles: window.combatStyles || [],
            lootPools: typeof LOOT_POOLS !== 'undefined' ? LOOT_POOLS : {},
            lootTiers: typeof LOOT_TIERS !== 'undefined' ? LOOT_TIERS : {},
            materialAcquisition: typeof MATERIAL_ACQUISITION !== 'undefined' ? MATERIAL_ACQUISITION : {},
            developerMode: Boolean(window.coreboundConfig?.developerMode)
        });
    });
}
