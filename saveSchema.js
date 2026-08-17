// Ordered, non-destructive migrations and validation for persisted game snapshots.

const COREBOUND_SAVE_VERSION = 20;
const SAVE_MATERIAL_STACK_CAP = 50000;
const SAVE_MAX_PLAYER_LEVEL = 50;
const SAVE_PASSIVE_TREE_VERSION = 6;
const SAVE_COMBAT_STYLE_VERSION = 2;
const SAVE_DAMAGE_TYPE_ALIASES = Object.freeze({
    mental: 'slashing',
    magnetic: 'electric',
    chemical: 'corrosive'
});
const SAVE_DEFENSE_TYPE_ALIASES = Object.freeze({
    toughness: ['physicalResistance', 1],
    fortitude: ['physicalResistance', 0.5],
    heatResistance: ['elementalResistance', 1],
    antimagnet: ['elementalResistance', 1],
    immunity: ['chemicalResistance', 1]
});
const SAVE_EQUIPMENT_SLOTS = Object.freeze(['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves']);
const SAVE_CORE_IDS = Object.freeze(['reclamation', 'accelerator', 'targeting', 'aegis', 'salvager', 'flux-seeker', 'escalation', 'overload']);
const SAVE_CACHE_IDS = Object.freeze(['kinetic', 'slashing', 'pyro', 'cryo', 'electric', 'corrosive', 'radiation', 'flux', 'core']);
const SAVE_RETIRED_MATERIAL_CONVERSIONS = Object.freeze({
    'Partical Fuser': ['Advanced Electronic Circuit', 1],
    'Spider Leg Segment': ['Titanium Thorn', 1],
    'Optic Sensor': ['Targeting Module', 1],
    'Memory Chip': ['Minor Electronic Circuit', 1],
    'Basic Sensor Array': ['Targeting Module', 1],
    'Power Converter': ['Advanced Electronic Circuit', 1],
    'Neural Processor': ['Neural Network Module', 1],
    'Pristine Metal Plate': ['Scrap Metal', 3],
    'Pure Iron Nugget': ['Iron Ore', 3],
    'Copper Vein Sample': ['Copper Ore', 3],
    'Titanium Alloy Fragment': ['Titanium', 2],
    'Corrosive Fluid': ['Synthetic Biofluid', 1],
    'Small Power Cell': ['Wire Bundle', 2]
});

function cloneSaveValue(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeSavedDamageMap(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
    const normalized = {};
    for (const [rawType, value] of Object.entries(source)) {
        const type = SAVE_DAMAGE_TYPE_ALIASES[rawType] || rawType;
        if (normalized[type] === undefined || rawType === type) normalized[type] = value;
    }
    return normalized;
}

function normalizeSavedDefenseMap(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
    const normalized = { ...source };
    for (const [legacyKey, [targetKey, multiplier]] of Object.entries(SAVE_DEFENSE_TYPE_ALIASES)) {
        if (normalized[legacyKey] === undefined) continue;
        const legacyValue = Number(normalized[legacyKey]);
        const currentValue = Number(normalized[targetKey]);
        normalized[targetKey] = (Number.isFinite(currentValue) ? currentValue : 0)
            + (Number.isFinite(legacyValue) ? legacyValue * multiplier : 0);
        delete normalized[legacyKey];
    }
    for (const key of ['physicalResistance', 'elementalResistance', 'chemicalResistance']) {
        const value = Number(normalized[key]);
        normalized[key] = Number.isFinite(value) ? value : 0;
    }
    return normalized;
}

function normalizeLegacyFraction(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return undefined;
    return Math.abs(number) > 1 ? number / 100 : number;
}

function normalizeSavedItemData(savedItem) {
    if (!savedItem || typeof savedItem !== 'object') return null;
    const item = cloneSaveValue(savedItem);

    if (item.levelRequirement == null && Number.isFinite(Number(item.level))) {
        item.levelRequirement = Number(item.level);
    }
    delete item.level;

    if (item.defenseTypes) item.defenseTypes = normalizeSavedDefenseMap(item.defenseTypes);
    for (const key of ['damageTypes', 'weaponBaseDamage', 'baseDamageTypes', 'weaponLocalFlatDamage', 'weaponLocalTypeIncrease']) {
        if (item[key]) item[key] = normalizeSavedDamageMap(item[key]);
    }
    if (item.statModifiers?.damageTypes) {
        item.statModifiers.damageTypes = normalizeSavedDamageMap(item.statModifiers.damageTypes);
    }
    if (item.weaponDamageConversion) {
        item.weaponDamageConversion.source = SAVE_DAMAGE_TYPE_ALIASES[item.weaponDamageConversion.source]
            || item.weaponDamageConversion.source;
        item.weaponDamageConversion.target = SAVE_DAMAGE_TYPE_ALIASES[item.weaponDamageConversion.target]
            || item.weaponDamageConversion.target;
    }

    const isWeapon = String(item.type || '').toLowerCase() === 'weapon'
        || item.slot === 'mainHand'
        || Boolean(item.weaponType);
    if (isWeapon) {
        if (!item.weaponBaseDamage && item.baseDamageTypes) item.weaponBaseDamage = item.baseDamageTypes;
        if (!item.weaponBaseDamage && item.damageTypes) item.weaponBaseDamage = item.damageTypes;
        delete item.baseDamageTypes;
        delete item.damageTypes;
        const normalizedWeapon = window.coreboundWeaponTaxonomy?.normalizeWeapon?.(item);
        if (normalizedWeapon) Object.assign(item, normalizedWeapon);
    }

    const legacyPercentFields = [
        ['attackSpeed', 'attackSpeedModifier'],
        ['criticalChance', 'criticalChanceModifier'],
        ['criticalMultiplier', 'criticalMultiplierModifier']
    ];
    for (const [legacyKey, currentKey] of legacyPercentFields) {
        if (item[currentKey] !== undefined || item[legacyKey] === undefined) continue;
        const normalized = normalizeLegacyFraction(item[legacyKey]);
        if (normalized !== undefined) item[currentKey] = normalized;
    }

    if (Array.isArray(item.rolledWires)) {
        item.rolledWires = item.rolledWires.map(wire => {
            if (!wire || typeof wire !== 'object') return wire;
            return { ...wire, chip: wire.chip ? normalizeSavedItemData(wire.chip) : wire.chip };
        });
    }
    if (item.fluxTargetModifierId != null) {
        const validTarget = typeof item.fluxTargetModifierId === 'string'
            && Array.isArray(item.rolledModifiers)
            && item.rolledModifiers.some(modifier => modifier?.id === item.fluxTargetModifierId);
        if (!validTarget) delete item.fluxTargetModifierId;
    }
    return item;
}

function findSavedItemTemplate(savedItem, items = window.items) {
    if (!savedItem || !Array.isArray(items)) return null;
    const exactName = typeof savedItem.name === 'string' ? savedItem.name : '';
    const chassisName = typeof savedItem.chassisTemplateName === 'string'
        ? savedItem.chassisTemplateName
        : '';
    return items.find(item => item?.name === exactName)
        || items.find(item => chassisName && item?.name === chassisName)
        || null;
}

function normalizeSavedResourceMap(source, ids, cap = 9999) {
    const allowed = new Set(ids);
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
    return Object.fromEntries(Object.entries(source)
        .filter(([id]) => allowed.has(id))
        .map(([id, quantity]) => [id, Math.min(cap, Math.max(0, Math.floor(Number(quantity) || 0)))])
        .filter(([, quantity]) => quantity > 0));
}

function normalizeSavedMaterialInventory(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
    return Object.fromEntries(Object.entries(source)
        .map(([name, quantity]) => [name, Math.min(SAVE_MATERIAL_STACK_CAP, Math.max(0, Math.floor(Number(quantity) || 0)))])
        .filter(([, quantity]) => quantity > 0));
}

function convertRetiredMaterialMap(source) {
    const converted = {};
    for (const [rawName, rawQuantity] of Object.entries(normalizeSavedMaterialInventory(source))) {
        const [name, multiplier] = SAVE_RETIRED_MATERIAL_CONVERSIONS[rawName] || [rawName, 1];
        const current = Math.max(0, Number(converted[name]) || 0);
        const quantity = Math.max(0, Math.floor(Number(rawQuantity) * multiplier));
        converted[name] = Math.min(SAVE_MATERIAL_STACK_CAP, current + quantity);
    }
    return Object.fromEntries(Object.entries(converted).filter(([, quantity]) => quantity > 0));
}

function convertRetiredMaterialItem(item) {
    if (!item || typeof item !== 'object') return item;
    const conversion = SAVE_RETIRED_MATERIAL_CONVERSIONS[item.name];
    if (!conversion) return item;
    const [name, multiplier] = conversion;
    return {
        ...item,
        name,
        quantity: Math.max(1, Math.floor((Number(item.quantity) || 1) * multiplier))
    };
}

const SAVE_RETIRED_BIONIC_BOOSTERS = Object.freeze({
    'Kinetic Booster': Object.freeze({ name: 'Physical Booster', group: 'physical', damageType: 'kinetic' }),
    'Slashing Booster': Object.freeze({ name: 'Physical Booster', group: 'physical', damageType: 'slashing' }),
    'Pyro Booster': Object.freeze({ name: 'Elemental Booster', group: 'elemental', damageType: 'pyro' }),
    'Cryo Booster': Object.freeze({ name: 'Elemental Booster', group: 'elemental', damageType: 'cryo' }),
    'Electric Booster': Object.freeze({ name: 'Elemental Booster', group: 'elemental', damageType: 'electric' }),
    'Radiation Booster': Object.freeze({ name: 'Chemical Booster', group: 'chemical', damageType: 'radiation' })
});

function convertRetiredBionicBooster(item) {
    if (!item || typeof item !== 'object') return item;
    const conversion = SAVE_RETIRED_BIONIC_BOOSTERS[item.name];
    if (!conversion) return item;

    const converted = normalizeSavedItemData(item);
    const typeValue = Number(converted.statModifiers?.damageTypes?.[conversion.damageType]);
    const existingGroupValue = Number(converted.statModifiers?.damageGroups?.[conversion.group]);
    const groupValue = (Number.isFinite(existingGroupValue) ? existingGroupValue : 0)
        + (Number.isFinite(typeValue) ? typeValue : 0);
    converted.name = conversion.name;
    converted.statModifiers = converted.statModifiers || {};
    delete converted.statModifiers.damageTypes;
    converted.statModifiers.damageGroups = {
        ...(converted.statModifiers.damageGroups || {}),
        [conversion.group]: groupValue > 0 ? groupValue : 10
    };
    if (Array.isArray(converted.rolledModifiers)) {
        converted.rolledModifiers = converted.rolledModifiers.map(modifier => {
            if (!String(modifier?.id || '').startsWith('globalDamageTypePercent_')) return modifier;
            return {
                ...modifier,
                id: `globalDamageGroupPercent_${conversion.group}`,
                displayName: `${conversion.group.charAt(0).toUpperCase()}${conversion.group.slice(1)} Damage`,
                statPath: `statModifiers.damageGroups.${conversion.group}`
            };
        });
    }
    return converted;
}

function mapSavedEquipment(equipment, mapper) {
    const source = equipment && typeof equipment === 'object' ? equipment : {};
    const mapped = {};
    for (const slot of SAVE_EQUIPMENT_SLOTS) mapped[slot] = source[slot] ? mapper(source[slot]) : null;
    const bionics = Array.isArray(source.bionicSlots) ? source.bionicSlots.slice(0, 4) : [];
    mapped.bionicSlots = bionics.map(item => item ? mapper(item) : null);
    while (mapped.bionicSlots.length < 4) mapped.bionicSlots.push(null);
    return mapped;
}

function mapPersistedItems(state, mapper) {
    state.inventory = Array.isArray(state.inventory) ? state.inventory.map(mapper).filter(Boolean) : [];
    state.player.equipment = mapSavedEquipment(state.player.equipment, mapper);
    for (const containerKey of ['delveBag', 'delveClaimCache']) {
        const container = state[containerKey] && typeof state[containerKey] === 'object'
            ? state[containerKey]
            : { items: [], credits: 0 };
        container.items = Array.isArray(container.items) ? container.items.map(mapper).filter(Boolean) : [];
        container.credits = Math.max(0, Number(container.credits) || 0);
        state[containerKey] = container;
    }
}

const SAVE_MIGRATIONS = Object.freeze([
    function migrateToVersion1(state) {
        state.player = state.player && typeof state.player === 'object' ? state.player : {};
        state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
    },
    function migrateToVersion2(state) {
        if (state.player.baseStats?.defenseTypes) {
            state.player.baseStats.defenseTypes = normalizeSavedDefenseMap(state.player.baseStats.defenseTypes);
        }
        mapPersistedItems(state, item => {
            const clone = cloneSaveValue(item);
            if (clone?.defenseTypes) clone.defenseTypes = normalizeSavedDefenseMap(clone.defenseTypes);
            return clone;
        });
    },
    function migrateToVersion3(state) {
        if (state.player.baseStats?.damageTypes) {
            state.player.baseStats.damageTypes = normalizeSavedDamageMap(state.player.baseStats.damageTypes);
        }
        mapPersistedItems(state, item => normalizeSavedItemData(item));
    },
    function migrateToVersion4(state) {
        mapPersistedItems(state, item => normalizeSavedItemData(item));
    },
    function migrateToVersion5(state) {
        if (!state.player.combatStyles && state.player.skills) {
            state.player.combatStyles = {
                equipped: state.player.skills.equipped || null,
                unlocked: Array.isArray(state.player.skills.unlocked) ? state.player.skills.unlocked : [],
                allocations: {}
            };
        }
        delete state.player.skills;
    },
    function migrateToVersion6(state) {
        state.player.equipment = mapSavedEquipment(state.player.equipment, item => normalizeSavedItemData(item));
        state.player.maxInventorySlots = Math.max(30, Math.floor(Number(state.player.maxInventorySlots) || 30));
    },
    function migrateToVersion7(state) {
        state.componentDropCounts = state.componentDropCounts && typeof state.componentDropCounts === 'object'
            ? state.componentDropCounts
            : {};
        state.completedDelveLocations = state.completedDelveLocations && typeof state.completedDelveLocations === 'object'
            ? state.completedDelveLocations
            : {};
        state.activityState = state.activityState && typeof state.activityState === 'object'
            ? state.activityState
            : { active: false, currentActivity: null };
        state.fabricationState = Array.isArray(state.fabricationState) ? state.fabricationState.slice(0, 1) : [];
    },
    function migrateToVersion8(state) {
        mapPersistedItems(state, item => normalizeSavedItemData(item));
        state.player.passives = state.player.passives && typeof state.player.passives === 'object'
            ? state.player.passives
            : { allocations: {}, points: 2 };
        // Gear passive bonuses are derived from equipped items and must never be authoritative save data.
        delete state.player.passives.gearBonuses;
        state.player.activeBuffs = Array.isArray(state.player.activeBuffs) ? state.player.activeBuffs : [];
        state.player.level = Math.max(1, Math.floor(Number(state.player.level) || 1));
        state.player.experience = Math.max(0, Number(state.player.experience) || 0);
        const currency = Number(state.player.currency);
        state.player.currency = Math.max(0, Number.isFinite(currency) ? currency : 1000);
        state.componentDropCounts = Object.fromEntries(Object.entries(state.componentDropCounts || {})
            .map(([name, count]) => [name, Math.max(0, Math.floor(Number(count) || 0))]));
    },
    function migrateToVersion9(state) {
        const passives = state.player.passives && typeof state.player.passives === 'object'
            ? state.player.passives
            : { allocations: {}, points: 2 };
        const allocations = passives.allocations && typeof passives.allocations === 'object'
            ? passives.allocations
            : {};
        let points = Math.max(0, Math.floor(Number(passives.points) || 0));

        // The current graph does not guess at mappings from a retired tree.
        // Every legitimately spent rank is returned so an old character loses nothing.
        if (Number(passives.treeVersion) !== SAVE_PASSIVE_TREE_VERSION) {
            points += Object.values(allocations).reduce((total, rank) => {
                const value = Math.floor(Number(rank));
                return total + (Number.isFinite(value) && value > 0 ? value : 0);
            }, 0);
            passives.allocations = {};
        } else {
            passives.allocations = Object.fromEntries(Object.entries(allocations)
                .filter(([, rank]) => Number(rank) > 0)
                .map(([id]) => [id, 1]));
        }
        passives.points = points;
        passives.treeVersion = SAVE_PASSIVE_TREE_VERSION;
        delete passives.gearBonuses;
        state.player.passives = passives;
    },
    function migrateToVersion10(state) {
        const combatStyles = state.player.combatStyles && typeof state.player.combatStyles === 'object'
            ? state.player.combatStyles
            : {};
        combatStyles.equipped = typeof combatStyles.equipped === 'string'
            ? combatStyles.equipped
            : 'balancedStyle';
        // The retired point tree cannot express one-choice mastery intent. Its
        // allocations are discarded; mastery availability is derived from level.
        combatStyles.allocations = {};
        combatStyles.unlocked = [];
        combatStyles.version = SAVE_COMBAT_STYLE_VERSION;
        state.player.combatStyles = combatStyles;
    },
    function migrateToVersion11(state) {
        const materialInventory = normalizeSavedMaterialInventory(state.materialInventory);
        const ordinaryInventory = [];
        for (const item of Array.isArray(state.inventory) ? state.inventory : []) {
            if (String(item?.type || '').toLowerCase() !== 'material') {
                if (item) ordinaryInventory.push(item);
                continue;
            }
            const itemName = String(item.name || '');
            if (!itemName) continue;
            const current = Math.max(0, Number(materialInventory[itemName]) || 0);
            const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
            const next = Math.min(SAVE_MATERIAL_STACK_CAP, current + quantity);
            if (next > 0) materialInventory[itemName] = next;
        }
        state.inventory = ordinaryInventory;
        state.materialInventory = materialInventory;
    },
    function migrateToVersion12(state) {
        state.materialInventory = convertRetiredMaterialMap(state.materialInventory);
        for (const containerKey of ['delveBag', 'delveClaimCache']) {
            const container = state[containerKey];
            if (!container || !Array.isArray(container.items)) continue;
            container.items = container.items.map(item => convertRetiredMaterialItem(item));
        }
        state.componentDropCounts = convertRetiredMaterialMap(state.componentDropCounts);
    },
    function migrateToVersion13(state) {
        const passives = state.player.passives && typeof state.player.passives === 'object'
            ? state.player.passives
            : { allocations: {}, points: 2 };
        const allocations = passives.allocations && typeof passives.allocations === 'object'
            ? passives.allocations
            : {};
        let points = Math.max(0, Math.floor(Number(passives.points) || 0));

        if (Number(passives.treeVersion) !== SAVE_PASSIVE_TREE_VERSION) {
            points += Object.values(allocations).reduce((total, rank) => {
                const value = Math.floor(Number(rank));
                return total + (Number.isFinite(value) && value > 0 ? value : 0);
            }, 0);
            passives.allocations = {};
        } else {
            passives.allocations = Object.fromEntries(Object.entries(allocations)
                .filter(([, rank]) => Number(rank) > 0)
                .map(([id]) => [id, 1]));
        }

        const allocatedPoints = Object.keys(passives.allocations).length;
        const progressionTotal = Math.max(2, Math.floor(Number(state.player.level) || 1) * 2);
        passives.points = Math.max(points, progressionTotal - allocatedPoints);
        passives.treeVersion = SAVE_PASSIVE_TREE_VERSION;
        delete passives.gearBonuses;
        state.player.passives = passives;
    },
    function migrateToVersion14(state) {
        mapPersistedItems(state, item => normalizeSavedItemData(item));
        const passives = state.player.passives && typeof state.player.passives === 'object'
            ? state.player.passives
            : { allocations: {}, points: 2 };
        const allocations = passives.allocations && typeof passives.allocations === 'object'
            ? passives.allocations
            : {};
        let points = Math.max(0, Math.floor(Number(passives.points) || 0));
        if (Number(passives.treeVersion) !== SAVE_PASSIVE_TREE_VERSION) {
            points += Object.values(allocations).reduce((total, rank) => {
                const value = Math.floor(Number(rank));
                return total + (Number.isFinite(value) && value > 0 ? value : 0);
            }, 0);
            passives.allocations = {};
        } else {
            passives.allocations = Object.fromEntries(Object.entries(allocations)
                .filter(([, rank]) => Number(rank) > 0)
                .map(([id]) => [id, 1]));
        }
        const allocatedPoints = Object.keys(passives.allocations).length;
        const progressionTotal = Math.max(2, Math.floor(Number(state.player.level) || 1) * 2);
        passives.points = Math.max(points, progressionTotal - allocatedPoints);
        passives.treeVersion = SAVE_PASSIVE_TREE_VERSION;
        delete passives.gearBonuses;
        state.player.passives = passives;
    },
    function migrateToVersion15(state) {
        const passives = state.player.passives && typeof state.player.passives === 'object'
            ? state.player.passives
            : { allocations: {}, points: 2 };
        const allocations = passives.allocations && typeof passives.allocations === 'object'
            ? passives.allocations
            : {};
        let points = Math.max(0, Math.floor(Number(passives.points) || 0));
        if (Number(passives.treeVersion) !== SAVE_PASSIVE_TREE_VERSION) {
            points += Object.values(allocations).reduce((total, rank) => {
                const value = Math.floor(Number(rank));
                return total + (Number.isFinite(value) && value > 0 ? value : 0);
            }, 0);
            passives.allocations = {};
        } else {
            passives.allocations = Object.fromEntries(Object.entries(allocations)
                .filter(([, rank]) => Number(rank) > 0)
                .map(([id]) => [id, 1]));
        }
        const allocatedPoints = Object.keys(passives.allocations).length;
        const progressionTotal = Math.max(2, Math.floor(Number(state.player.level) || 1) * 2);
        passives.points = Math.max(points, progressionTotal - allocatedPoints);
        passives.treeVersion = SAVE_PASSIVE_TREE_VERSION;
        delete passives.gearBonuses;
        state.player.passives = passives;
    },
    function migrateToVersion16(state) {
        mapPersistedItems(state, item => convertRetiredBionicBooster(item));
    },
    function migrateToVersion17(state) {
        const legacyCurrency = Number(state.player.currency);
        const currentFeed = Number(state.player.feed);
        state.player.feed = Math.max(0, Number.isFinite(currentFeed)
            ? currentFeed
            : (Number.isFinite(legacyCurrency) ? legacyCurrency : 1000));
        delete state.player.currency;

        for (const containerKey of ['delveBag', 'delveClaimCache']) {
            const container = state[containerKey] && typeof state[containerKey] === 'object'
                ? state[containerKey]
                : { items: [], feed: 0 };
            container.items = Array.isArray(container.items)
                ? container.items.map(item => normalizeSavedItemData(item)).filter(Boolean)
                : [];
            container.feed = Math.max(0, Number(container.feed ?? container.credits) || 0);
            delete container.credits;
            state[containerKey] = container;
        }

        mapPersistedItems(state, item => normalizeSavedItemData(item));
        // mapPersistedItems is retained for old migrations and may recreate the
        // retired container key. Normalize it back to Feed after item mapping.
        for (const containerKey of ['delveBag', 'delveClaimCache']) {
            state[containerKey].feed = Math.max(0, Number(state[containerKey].feed ?? state[containerKey].credits) || 0);
            delete state[containerKey].credits;
        }
        state.coreInventory = normalizeSavedResourceMap(state.coreInventory, SAVE_CORE_IDS);
        state.cacheInventory = normalizeSavedResourceMap(state.cacheInventory, SAVE_CACHE_IDS);
        state.pendingCacheResolution = state.pendingCacheResolution && typeof state.pendingCacheResolution === 'object'
            && Array.isArray(state.pendingCacheResolution.rewards)
            ? state.pendingCacheResolution
            : null;
        state.currentRunMode = state.currentRunMode === 'patrol' ? 'patrol' : (state.isDelveInProgress ? 'operation' : null);
        state.operationState = state.operationState && typeof state.operationState === 'object'
            ? state.operationState
            : null;
    },
    function migrateToVersion18(state) {
        state.operationBoard = state.operationBoard && typeof state.operationBoard === 'object' && !Array.isArray(state.operationBoard)
            ? state.operationBoard
            : { version: 2, generation: 0, playerLevel: Math.max(1, Math.min(50, Math.floor(Number(state.player?.level) || 1))), offers: [] };
        state.completedOperationSeeds = Array.isArray(state.completedOperationSeeds)
            ? state.completedOperationSeeds.filter(seed => typeof seed === 'string' && seed).slice(-10)
            : [];
        const legacyClearCount = Object.values(state.completedDelveLocations || {})
            .reduce((total, count) => total + Math.max(0, Math.floor(Number(count) || 0)), 0);
        state.completedOperationCount = Math.max(
            legacyClearCount,
            Math.max(0, Math.floor(Number(state.completedOperationCount) || 0))
        );
    },
    function migrateToVersion19(state) {
        const previousLevel = Math.max(1, Math.floor(Number(state.player.level) || 1));
        const overflowLevels = Math.max(0, previousLevel - SAVE_MAX_PLAYER_LEVEL);
        state.player.level = Math.min(SAVE_MAX_PLAYER_LEVEL, previousLevel);
        if (state.player.level >= SAVE_MAX_PLAYER_LEVEL) state.player.experience = 0;

        const passives = state.player.passives && typeof state.player.passives === 'object'
            ? state.player.passives
            : { allocations: {}, points: 2 };
        passives.points = Math.max(0, Math.floor(Number(passives.points) || 0) - overflowLevels * 2);
        state.player.passives = passives;

        // Version 2 boards contain six level-banded offers. Rebuild legacy
        // three-offer boards the next time the deployment terminal opens.
        state.operationBoard = { version: 2, generation: 0, playerLevel: state.player.level, offers: [] };
    },
    function migrateToVersion20(state) {
        const source = state.deepSectorProgress && typeof state.deepSectorProgress === 'object' && !Array.isArray(state.deepSectorProgress)
            ? state.deepSectorProgress
            : {};
        const rawShop = source.shop && typeof source.shop === 'object' && !Array.isArray(source.shop) ? source.shop : {};
        const highestUnlockedLevel = Math.max(55, Math.min(100, Math.floor(Number(source.highestUnlockedLevel) || 55)));
        state.deepSectorProgress = {
            intel: Math.max(0, Math.floor(Number(source.intel) || 0)),
            highestUnlockedLevel: 55 + Math.floor((highestUnlockedLevel - 55) / 5) * 5,
            selectedLevel: 55,
            shop: Object.fromEntries(['cache', 'flux', 'material', 'feed'].map(id => [
                id,
                Math.max(0, Math.min(10, Math.floor(Number(rawShop[id]) || 0)))
            ]))
        };
        const selectedLevel = Math.max(55, Math.min(state.deepSectorProgress.highestUnlockedLevel, Math.floor(Number(source.selectedLevel) || state.deepSectorProgress.highestUnlockedLevel)));
        state.deepSectorProgress.selectedLevel = 55 + Math.floor((selectedLevel - 55) / 5) * 5;
        state.operationBoard = { version: 3, generation: Math.max(0, Math.floor(Number(state.operationBoard?.generation) || 0)), playerLevel: state.player.level, offers: [] };
    }
]);

function getSaveVersion(state) {
    const version = Math.floor(Number(state?.meta?.version));
    return Number.isFinite(version) && version >= 0 ? version : 0;
}

function migrateGameStateSnapshot(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new TypeError('Save payload must be an object.');
    }
    const state = cloneSaveValue(input);
    const fromVersion = getSaveVersion(state);
    if (fromVersion > COREBOUND_SAVE_VERSION) {
        throw new RangeError(`Save version ${fromVersion} is newer than supported version ${COREBOUND_SAVE_VERSION}.`);
    }
    const appliedVersions = [];
    for (let version = fromVersion + 1; version <= COREBOUND_SAVE_VERSION; version++) {
        const migration = SAVE_MIGRATIONS[version - 1];
        if (typeof migration !== 'function') throw new Error(`Missing save migration for version ${version}.`);
        migration(state);
        state.meta = { ...(state.meta || {}), version };
        appliedVersions.push(version);
    }
    state.meta = {
        ...(state.meta || {}),
        version: COREBOUND_SAVE_VERSION,
        migratedFrom: appliedVersions.length > 0 ? fromVersion : (state.meta?.migratedFrom ?? null)
    };
    return { state, fromVersion, toVersion: COREBOUND_SAVE_VERSION, appliedVersions };
}

function validateGameStateSnapshot(state, options = {}) {
    const errors = [];
    const warnings = [];
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
        return { valid: false, errors: ['snapshot must be an object'], warnings };
    }
    if (!state.player || typeof state.player !== 'object') errors.push('player object is required');
    if (getSaveVersion(state) !== COREBOUND_SAVE_VERSION) errors.push(`save version must be ${COREBOUND_SAVE_VERSION}`);
    if (!Array.isArray(state.inventory)) errors.push('inventory must be an array');
    if (!state.operationBoard || typeof state.operationBoard !== 'object' || Array.isArray(state.operationBoard)) {
        errors.push('operation board must be an object');
    } else if (!Array.isArray(state.operationBoard.offers)) {
        errors.push('operation board offers must be an array');
    }
    const deepSector = state.deepSectorProgress;
    if (!deepSector || typeof deepSector !== 'object' || Array.isArray(deepSector)) {
        errors.push('Deep Sector progress must be an object');
    } else {
        if (!Number.isInteger(Number(deepSector.intel)) || Number(deepSector.intel) < 0) errors.push('Deep Sector Intel is invalid');
        if (!Number.isInteger(Number(deepSector.highestUnlockedLevel)) || Number(deepSector.highestUnlockedLevel) < 55 || Number(deepSector.highestUnlockedLevel) > 100 || (Number(deepSector.highestUnlockedLevel) - 55) % 5 !== 0) {
            errors.push('Deep Sector highest unlocked level is invalid');
        }
        if (!Number.isInteger(Number(deepSector.selectedLevel)) || Number(deepSector.selectedLevel) < 55 || Number(deepSector.selectedLevel) > Number(deepSector.highestUnlockedLevel) || (Number(deepSector.selectedLevel) - 55) % 5 !== 0) {
            errors.push('Deep Sector selected level is invalid');
        }
        if (!deepSector.shop || typeof deepSector.shop !== 'object' || Array.isArray(deepSector.shop)
            || ['cache', 'flux', 'material', 'feed'].some(id => !Number.isInteger(Number(deepSector.shop[id])) || Number(deepSector.shop[id]) < 0 || Number(deepSector.shop[id]) > 10)) {
            errors.push('Deep Sector Intel Shop ranks are invalid');
        }
    }
    if (!Array.isArray(state.completedOperationSeeds) || state.completedOperationSeeds.length > 10
        || state.completedOperationSeeds.some(seed => typeof seed !== 'string' || !seed)) {
        errors.push('completed Operation seed history is invalid');
    }
    if (!Number.isInteger(Number(state.completedOperationCount)) || Number(state.completedOperationCount) < 0) {
        errors.push('completed Operation count is invalid');
    }
    if (!state.materialInventory || typeof state.materialInventory !== 'object' || Array.isArray(state.materialInventory)) {
        errors.push('material inventory must be an object');
    } else {
        for (const [name, quantity] of Object.entries(state.materialInventory)) {
            if (!name || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0 || Number(quantity) > SAVE_MATERIAL_STACK_CAP) {
                errors.push(`material inventory quantity is invalid: ${name || '(unnamed)'}`);
            }
        }
    }
    if (Array.isArray(state.inventory) && state.inventory.some(item => String(item?.type || '').toLowerCase() === 'material')) {
        errors.push('ordinary inventory cannot contain materials');
    }
    if (!state.player?.equipment || typeof state.player.equipment !== 'object') errors.push('player equipment is required');
    if (!Array.isArray(state.player?.equipment?.bionicSlots) || state.player.equipment.bionicSlots.length !== 4) {
        errors.push('player equipment must contain exactly four bionic slots');
    }
    if (!Number.isFinite(Number(state.player?.level))
        || Number(state.player.level) < 1
        || Number(state.player.level) > SAVE_MAX_PLAYER_LEVEL) {
        errors.push('player level is invalid');
    }
    if (!Number.isFinite(Number(state.player?.feed)) || Number(state.player.feed) < 0) errors.push('player Feed is invalid');
    for (const [label, source, ids] of [
        ['Core', state.coreInventory, SAVE_CORE_IDS],
        ['Cache', state.cacheInventory, SAVE_CACHE_IDS]
    ]) {
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            errors.push(`${label} inventory must be an object`);
            continue;
        }
        for (const [id, quantity] of Object.entries(source)) {
            if (!ids.includes(id) || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0 || Number(quantity) > 9999) {
                errors.push(`${label} inventory quantity is invalid: ${id}`);
            }
        }
    }
    const passives = state.player?.passives;
    if (!passives || typeof passives !== 'object') errors.push('player passives are required');
    else {
        if (!passives.allocations || typeof passives.allocations !== 'object' || Array.isArray(passives.allocations)) {
            errors.push('passive allocations must be an object');
        }
        if (!Number.isFinite(Number(passives.points)) || Number(passives.points) < 0) {
            errors.push('passive points are invalid');
        }
        if (Number(passives.treeVersion) !== SAVE_PASSIVE_TREE_VERSION) {
            errors.push(`passive tree version must be ${SAVE_PASSIVE_TREE_VERSION}`);
        }
        const passiveTree = window.coreboundPassiveTree;
        if (passiveTree?.getNode && passives.allocations && typeof passives.allocations === 'object') {
            for (const [nodeId, rank] of Object.entries(passives.allocations)) {
                if (!passiveTree.getNode(nodeId) || nodeId === passiveTree.originId) {
                    errors.push(`unknown passive allocation: ${nodeId}`);
                }
                if (Number(rank) !== 1) errors.push(`passive allocation ${nodeId} must have rank one`);
            }
        }
    }

    const combatStyles = state.player?.combatStyles;
    if (!combatStyles || typeof combatStyles !== 'object' || Array.isArray(combatStyles)) {
        errors.push('player combat styles are required');
    } else {
        if (Number(combatStyles.version) !== SAVE_COMBAT_STYLE_VERSION) {
            errors.push(`combat style version must be ${SAVE_COMBAT_STYLE_VERSION}`);
        }
        if (!combatStyles.allocations || typeof combatStyles.allocations !== 'object' || Array.isArray(combatStyles.allocations)) {
            errors.push('combat style allocations must be an object');
        }
        if (!Array.isArray(combatStyles.unlocked)) errors.push('unlocked combat styles must be an array');
    }

    const knownItemNames = options.knownItemNames instanceof Set ? options.knownItemNames : null;
    if (knownItemNames) {
        const inspectItem = (item, context) => {
            if (!item?.name) errors.push(`${context} item is missing a name`);
            else if (!knownItemNames.has(item.name) && !knownItemNames.has(item.chassisTemplateName)) {
                warnings.push(`${context} references retired item: ${item.name}`);
            }
        };
        state.inventory.forEach((item, index) => inspectItem(item, `inventory[${index}]`));
        Object.keys(state.materialInventory || {}).forEach(name => {
            if (!knownItemNames.has(name)) warnings.push(`material inventory references retired item: ${name}`);
        });
        for (const slot of SAVE_EQUIPMENT_SLOTS) {
            if (state.player.equipment[slot]) inspectItem(state.player.equipment[slot], `equipment.${slot}`);
        }
        state.player.equipment.bionicSlots.forEach((item, index) => {
            if (item) inspectItem(item, `equipment.bionicSlots[${index}]`);
        });
    }
    return { valid: errors.length === 0, errors, warnings };
}

function assertGameStateSnapshot(state, options = {}) {
    const validation = validateGameStateSnapshot(state, options);
    if (!validation.valid) throw new TypeError(`Invalid save snapshot: ${validation.errors.join('; ')}`);
    return validation;
}

window.coreboundSaveSchema = Object.freeze({
    currentVersion: COREBOUND_SAVE_VERSION,
    migrateGameStateSnapshot,
    validateGameStateSnapshot,
    assertGameStateSnapshot,
    normalizeSavedItemData,
    findSavedItemTemplate,
    normalizeSavedMaterialInventory
});
