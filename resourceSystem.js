// Stackable Core and Cache storage, enemy special drops, and safe Cache opening.

const CORE_STORAGE_CAP = 9999;
const CACHE_STORAGE_CAP = 9999;

const CORE_DEFINITIONS = Object.freeze([
    Object.freeze({ id: 'reclamation', name: 'Reclamation Core', icon: 'icons/core_reclamation.png', minLevel: 1, family: 'universal', effect: 'Restore 12% maximum HP after every encounter.', modifiers: Object.freeze({ healAfterEncounter: 0.12 }) }),
    Object.freeze({ id: 'accelerator', name: 'Accelerator Core', icon: 'icons/core_accelerator.png', minLevel: 1, family: 'electric', effect: '+15% Attack Speed for the Operation.', modifiers: Object.freeze({ attackSpeedPercent: 0.15 }) }),
    Object.freeze({ id: 'targeting', name: 'Targeting Core', icon: 'icons/core_targeting.png', minLevel: 6, family: 'kinetic', effect: '+8% Critical Chance for the Operation.', modifiers: Object.freeze({ criticalChance: 0.08 }) }),
    Object.freeze({ id: 'aegis', name: 'Aegis Core', icon: 'icons/core_aegis.png', minLevel: 11, family: 'cryo', effect: '+25% Energy Shield for the Operation.', modifiers: Object.freeze({ energyShieldPercent: 0.25 }) }),
    Object.freeze({ id: 'salvager', name: 'Salvager Core', icon: 'icons/core_salvager.png', minLevel: 16, family: 'corrosive', effect: '+35% material drops for the Operation.', modifiers: Object.freeze({ materialFind: 0.35 }) }),
    Object.freeze({ id: 'flux-seeker', name: 'Flux-Seeker Core', icon: 'icons/core_flux_seeker.png', minLevel: 26, family: 'radiation', effect: '+50% Flux drop chance; take 10% more damage.', modifiers: Object.freeze({ fluxFind: 0.5, damageTaken: 0.1 }) }),
    Object.freeze({ id: 'escalation', name: 'Escalation Core', icon: 'icons/core_escalation.png', minLevel: 31, family: 'slashing', effect: '+4% damage after each encounter; enemies gain +2% damage.', modifiers: Object.freeze({ damagePerEncounter: 0.04, enemyDamagePerEncounter: 0.02 }) }),
    Object.freeze({ id: 'overload', name: 'Overload Core', icon: 'icons/core_overload.png', minLevel: 41, family: 'pyro', effect: '+25% Attack Speed and +10% Critical Chance; take 18% more damage.', modifiers: Object.freeze({ attackSpeedPercent: 0.25, criticalChance: 0.1, damageTaken: 0.18 }) })
]);

const CACHE_DEFINITIONS = Object.freeze([
    Object.freeze({ id: 'kinetic', name: 'Kinetic Cache', icon: 'icons/cache_kinetic.png', theme: 'kinetic', sellValue: 105 }),
    Object.freeze({ id: 'slashing', name: 'Slashing Cache', icon: 'icons/cache_slashing.png', theme: 'slashing', sellValue: 105 }),
    Object.freeze({ id: 'pyro', name: 'Pyro Cache', icon: 'icons/cache_pyro.png', theme: 'pyro', sellValue: 110 }),
    Object.freeze({ id: 'cryo', name: 'Cryo Cache', icon: 'icons/cache_cryo.png', theme: 'cryo', sellValue: 110 }),
    Object.freeze({ id: 'electric', name: 'Electric Cache', icon: 'icons/cache_electric.png', theme: 'electric', sellValue: 110 }),
    Object.freeze({ id: 'corrosive', name: 'Corrosive Cache', icon: 'icons/cache_corrosive.png', theme: 'chemical', sellValue: 115 }),
    Object.freeze({ id: 'radiation', name: 'Radiation Cache', icon: 'icons/cache_radiation.png', theme: 'radiation', sellValue: 120 }),
    Object.freeze({ id: 'flux', name: 'Flux Cache', icon: 'icons/cache_flux.png', theme: 'flux', sellValue: 180 }),
    Object.freeze({ id: 'core', name: 'Core Cache', icon: 'icons/cache_core.png', theme: 'core', sellValue: 210 })
]);

const CACHE_THEME_MATERIALS = Object.freeze({
    kinetic: Object.freeze(['Stabilizer', 'Advanced Barrel', 'Precision Mechanism']),
    slashing: Object.freeze(['Titanium Thorn', 'Metal Scorpion Fang', 'Enhanced Cutting Edge']),
    pyro: Object.freeze(['Flame Shell', 'Pyro Core', 'Flux Crystal']),
    cryo: Object.freeze(['Cryo Cell', 'Unstable Phase Core', 'Temporal Stabilizer']),
    electric: Object.freeze(['Copper Coil', 'High-Density Power Cell', 'Quantum Capacitor']),
    chemical: Object.freeze(['Toxic Residue', 'Synthetic Poison Gland', 'Synthetic Biofluid']),
    radiation: Object.freeze(['Unstable Photon', 'Crystalized Light', 'Nanite Cluster'])
});

window.coreInventory = window.coreInventory && typeof window.coreInventory === 'object' ? window.coreInventory : {};
window.cacheInventory = window.cacheInventory && typeof window.cacheInventory === 'object' ? window.cacheInventory : {};
window.pendingCacheResolution = window.pendingCacheResolution && typeof window.pendingCacheResolution === 'object'
    ? window.pendingCacheResolution
    : null;

function normalizeStackMap(source, definitions, cap) {
    const allowed = new Set(definitions.map(definition => definition.id));
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
    return Object.fromEntries(Object.entries(source)
        .filter(([id]) => allowed.has(id))
        .map(([id, quantity]) => [id, Math.min(cap, Math.max(0, Math.floor(Number(quantity) || 0)))])
        .filter(([, quantity]) => quantity > 0));
}

function normalizeCoreInventory(source) {
    return normalizeStackMap(source, CORE_DEFINITIONS, CORE_STORAGE_CAP);
}

function normalizeCacheInventory(source) {
    return normalizeStackMap(source, CACHE_DEFINITIONS, CACHE_STORAGE_CAP);
}

function getCoreDefinition(idOrName) {
    return CORE_DEFINITIONS.find(definition => definition.id === idOrName || definition.name === idOrName) || null;
}

function getCacheDefinition(idOrName) {
    return CACHE_DEFINITIONS.find(definition => definition.id === idOrName || definition.name === idOrName) || null;
}

function getCoreQuantity(id) {
    return Math.max(0, Math.floor(Number(window.coreInventory?.[id]) || 0));
}

function getCacheQuantity(id) {
    return Math.max(0, Math.floor(Number(window.cacheInventory?.[id]) || 0));
}

function addStackToMap(map, id, quantity, cap) {
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));
    if (amount <= 0) return 0;
    const current = Math.max(0, Math.floor(Number(map[id]) || 0));
    const accepted = Math.min(amount, Math.max(0, cap - current));
    if (accepted > 0) map[id] = current + accepted;
    return accepted;
}

function removeStackFromMap(map, id, quantity) {
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));
    const current = Math.max(0, Math.floor(Number(map[id]) || 0));
    if (amount <= 0) return true;
    if (current < amount) return false;
    const next = current - amount;
    if (next > 0) map[id] = next;
    else delete map[id];
    return true;
}

function addCoreToStorage(idOrItem, quantity = null) {
    const definition = getCoreDefinition(typeof idOrItem === 'string' ? idOrItem : (idOrItem?.coreId || idOrItem?.name));
    if (!definition) return false;
    const requested = Math.max(1, Math.floor(Number(quantity ?? idOrItem?.quantity ?? 1) || 1));
    if (getCoreQuantity(definition.id) + requested > CORE_STORAGE_CAP) return false;
    const accepted = addStackToMap(window.coreInventory, definition.id, requested, CORE_STORAGE_CAP);
    if (accepted > 0) refreshResourceStorageUI();
    return accepted === requested;
}

function addCacheToStorage(idOrItem, quantity = null) {
    const definition = getCacheDefinition(typeof idOrItem === 'string' ? idOrItem : (idOrItem?.cacheId || idOrItem?.name));
    if (!definition) return false;
    const requested = Math.max(1, Math.floor(Number(quantity ?? idOrItem?.quantity ?? 1) || 1));
    if (getCacheQuantity(definition.id) + requested > CACHE_STORAGE_CAP) return false;
    const accepted = addStackToMap(window.cacheInventory, definition.id, requested, CACHE_STORAGE_CAP);
    if (accepted > 0) refreshResourceStorageUI();
    return accepted === requested;
}

function makeCoreItem(definition, quantity = 1) {
    return { type: 'Core', coreId: definition.id, name: definition.name, icon: definition.icon, stackable: true, quantity };
}

function makeCacheItem(definition, quantity = 1) {
    return { type: 'Cache', cacheId: definition.id, name: definition.name, icon: definition.icon, stackable: true, quantity, sellValue: definition.sellValue };
}

function getEnemyTheme(enemy) {
    const present = Object.entries(enemy?.damageTypes || {})
        .filter(([, value]) => Number(value) > 0)
        .sort((left, right) => Number(right[1]) - Number(left[1]))
        .map(([type]) => type === 'chemical' ? 'corrosive' : type);
    if (present.length > 0) return present[0];
    const name = String(enemy?.name || '').toLowerCase();
    if (/(blade|saw|cutter|reaper|guillotine)/.test(name)) return 'slashing';
    if (/(fire|flame|furnace|heat|pyro)/.test(name)) return 'pyro';
    if (/(cryo|cold|frost|coolant|freeze)/.test(name)) return 'cryo';
    if (/(arc|storm|volt|signal|electric)/.test(name)) return 'electric';
    if (/(acid|corros|caustic|bio)/.test(name)) return 'corrosive';
    if (/(rad|isotope|reactor|waste)/.test(name)) return 'radiation';
    return 'kinetic';
}

function getSpecialDropMultipliers() {
    if (typeof getActiveOperationRewardModifiers === 'function') return getActiveOperationRewardModifiers();
    return { core: 1, cache: 1, flux: 1, material: 1 };
}

function rollEnemySpecialDrops(enemy, random = Math.random) {
    const level = Math.max(1, Number(enemy?.level || currentLocation?.recommendedLevel || 1));
    const theme = getEnemyTheme(enemy);
    const multipliers = getSpecialDropMultipliers();
    const rewards = [];
    const empowered = enemy?.isEmpowered ? 1.35 : 1;
    const encounterRewardScale = Math.max(0, Number(enemy?._rewardScale ?? 1));
    const coreChance = Math.min(0.11, (0.012 + level * 0.00065) * empowered * encounterRewardScale * Math.max(0, Number(multipliers.core) || 1));
    const cacheChance = Math.min(0.16, (0.02 + level * 0.0009) * empowered * encounterRewardScale * Math.max(0, Number(multipliers.cache) || 1));
    const fluxChance = Math.min(0.12, (0.006 + level * 0.0007) * empowered * encounterRewardScale * Math.max(0, Number(multipliers.flux) || 1));

    if (random() < coreChance) {
        const eligible = CORE_DEFINITIONS.filter(definition => definition.minLevel <= level && (definition.family === theme || definition.family === 'universal'));
        const pool = eligible.length > 0 ? eligible : CORE_DEFINITIONS.filter(definition => definition.minLevel <= level);
        const definition = pool[Math.floor(random() * pool.length)] || CORE_DEFINITIONS[0];
        rewards.push(makeCoreItem(definition));
    }
    if (random() < cacheChance) {
        const cacheId = random() < 0.08 ? 'core' : random() < 0.2 ? 'flux' : theme;
        rewards.push(makeCacheItem(getCacheDefinition(cacheId) || getCacheDefinition('kinetic')));
    }
    if (random() < fluxChance) {
        const name = getFluxNameForLevel(level, random);
        const template = (window.materials || []).find(material => material.name === name);
        if (template) rewards.push({ ...template, quantity: 1, stackable: true });
    }
    return rewards;
}

function chooseWeighted(entries, random = Math.random) {
    const total = entries.reduce((sum, entry) => sum + Number(entry.weight || 0), 0);
    let roll = random() * total;
    for (const entry of entries) {
        roll -= Number(entry.weight || 0);
        if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
}

function getFluxNameForLevel(level, random = Math.random) {
    const maximum = level >= 41 ? 5 : level >= 31 ? 4 : level >= 21 ? 3 : level >= 11 ? 2 : 1;
    const grade = Math.max(1, maximum - (random() < 0.6 ? 1 : 0));
    return `Flux ${['I', 'II', 'III', 'IV', 'V'][grade - 1]}`;
}

function rollCacheContents(cacheId, random = Math.random) {
    const definition = getCacheDefinition(cacheId);
    if (!definition) return [];
    const level = Math.max(1, Number(player?.level) || 1);
    const table = definition.theme === 'flux'
        ? [{ kind: 'whiff', weight: 12 }, { kind: 'flux', weight: 50 }, { kind: 'feed', weight: 28 }, { kind: 'core', weight: 10 }]
        : definition.theme === 'core'
            ? [{ kind: 'whiff', weight: 10 }, { kind: 'core', weight: 55 }, { kind: 'feed', weight: 25 }, { kind: 'flux', weight: 10 }]
            : [{ kind: 'whiff', weight: 14 }, { kind: 'material', weight: 54 }, { kind: 'feed', weight: 24 }, { kind: 'flux', weight: 8 }];
    const outcome = chooseWeighted(table, random).kind;
    if (outcome === 'whiff') return [];
    if (outcome === 'feed') return [{ kind: 'feed', name: 'Feed', quantity: Math.max(20, Math.round(definition.sellValue * (0.35 + random() * 1.5))) }];
    if (outcome === 'flux') {
        const name = getFluxNameForLevel(level, random);
        return [{ kind: 'material', name, quantity: 1 + (random() < 0.18 ? 1 : 0) }];
    }
    if (outcome === 'core') {
        const eligible = CORE_DEFINITIONS.filter(core => core.minLevel <= level);
        const core = eligible[Math.floor(random() * eligible.length)] || CORE_DEFINITIONS[0];
        return [{ kind: 'core', id: core.id, name: core.name, quantity: 1 }];
    }

    const materialPool = CACHE_THEME_MATERIALS[definition.theme] || CACHE_THEME_MATERIALS.kinetic;
    const band = level >= 31 ? 2 : level >= 11 ? 1 : 0;
    const index = Math.max(0, Math.min(materialPool.length - 1, band - (random() < 0.35 ? 1 : 0)));
    const quantity = index === 0 ? 2 + Math.floor(random() * 5) : index === 1 ? 1 + Math.floor(random() * 3) : 1;
    const rewards = [{ kind: 'material', name: materialPool[index], quantity }];
    if (random() < 0.3) rewards.push({ kind: 'feed', name: 'Feed', quantity: Math.round(definition.sellValue * (0.2 + random() * 0.55)) });
    return rewards;
}

function storeCacheReward(reward) {
    const quantity = Math.max(0, Math.floor(Number(reward?.quantity) || 0));
    if (quantity <= 0) return 0;
    if (reward.kind === 'feed') {
        if (typeof updateFeed === 'function') updateFeed(quantity);
        else playerFeed += quantity;
        return quantity;
    }
    if (reward.kind === 'core') {
        return addStackToMap(window.coreInventory, reward.id, quantity, CORE_STORAGE_CAP);
    }
    if (reward.kind === 'material') {
        const current = getMaterialQuantity(reward.name);
        const accepted = Math.min(quantity, Math.max(0, MATERIAL_STORAGE_CAP - current));
        if (accepted > 0) addMaterialToStorage(reward.name, accepted);
        return accepted;
    }
    return 0;
}

function getCacheRewardSaleValue(reward) {
    const quantity = Math.max(0, Math.floor(Number(reward?.quantity) || 0));
    if (reward.kind === 'feed') return quantity;
    if (reward.kind === 'core') return quantity * 125;
    const template = (window.materials || []).find(material => material.name === reward.name);
    return quantity * Math.max(8, Math.floor(Number(template?.sellValue) || 20));
}

function attemptResolvePendingCache() {
    if (!window.pendingCacheResolution) return true;
    const remaining = [];
    for (const reward of window.pendingCacheResolution.rewards || []) {
        const accepted = storeCacheReward(reward);
        if (accepted < reward.quantity) remaining.push({ ...reward, quantity: reward.quantity - accepted });
    }
    window.pendingCacheResolution.rewards = remaining;
    if (remaining.length === 0) {
        const cacheName = window.pendingCacheResolution.cacheName;
        window.pendingCacheResolution = null;
        closeCacheResolutionPopup();
        logMessage(`${cacheName} contents secured.`);
        refreshResourceStorageUI();
        if (typeof updateInventoryDisplay === 'function') updateInventoryDisplay();
        return true;
    }
    showCacheResolutionPopup();
    refreshResourceStorageUI();
    return false;
}

function openCache(cacheId) {
    if (window.pendingCacheResolution) {
        showCacheResolutionPopup();
        return false;
    }
    const definition = getCacheDefinition(cacheId);
    if (!definition || !removeStackFromMap(window.cacheInventory, definition.id, 1)) return false;
    const rewards = rollCacheContents(definition.id);
    window.pendingCacheResolution = {
        cacheId: definition.id,
        cacheName: definition.name,
        rewards,
        openedAt: Date.now()
    };
    if (rewards.length === 0) {
        window.pendingCacheResolution = null;
        logMessage(`${definition.name} contained no recoverable matter.`);
        refreshResourceStorageUI();
        return true;
    }
    logMessage(`Opened ${definition.name}: ${rewards.map(reward => `${reward.name} ×${reward.quantity}`).join(', ')}.`);
    return attemptResolvePendingCache();
}

function sellCache(cacheId, quantity = 1) {
    const definition = getCacheDefinition(cacheId);
    const amount = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!definition || !removeStackFromMap(window.cacheInventory, definition.id, amount)) return false;
    const feed = definition.sellValue * amount;
    if (typeof updateFeed === 'function') updateFeed(feed);
    else playerFeed += feed;
    logMessage(`Sold ${amount} × ${definition.name} for ${feed} Feed.`);
    refreshResourceStorageUI();
    if (typeof updateCurrencyDisplay === 'function') updateCurrencyDisplay();
    return true;
}

function sellPendingCacheRewards() {
    if (!window.pendingCacheResolution) return false;
    const value = (window.pendingCacheResolution.rewards || []).reduce((sum, reward) => sum + getCacheRewardSaleValue(reward), 0);
    const cacheName = window.pendingCacheResolution.cacheName;
    if (typeof updateFeed === 'function') updateFeed(value);
    else playerFeed += value;
    window.pendingCacheResolution = null;
    closeCacheResolutionPopup();
    logMessage(`Sold unresolved ${cacheName} contents for ${value} Feed.`);
    refreshResourceStorageUI();
    if (typeof updateCurrencyDisplay === 'function') updateCurrencyDisplay();
    return true;
}

function closeCacheResolutionPopup() {
    document.getElementById('cache-resolution-overlay')?.remove();
}

function showCacheResolutionPopup() {
    closeCacheResolutionPopup();
    const pending = window.pendingCacheResolution;
    if (!pending) return;
    const overlay = document.createElement('div');
    overlay.id = 'cache-resolution-overlay';
    overlay.className = 'resource-overlay';
    const popup = document.createElement('section');
    popup.className = 'resource-resolution-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.innerHTML = `
        <header><span>CAPACITY CONFLICT</span><h2>${pending.cacheName}</h2></header>
        <p>These rolled contents are reserved until you make room or sell them.</p>
        <ul>${(pending.rewards || []).map(reward => `<li><span>${reward.name}</span><strong>×${reward.quantity}</strong></li>`).join('')}</ul>
        <div class="resource-resolution-actions">
            <button type="button" data-cache-resolution="retry">Store What Fits</button>
            <button type="button" data-cache-resolution="sell">Sell Remaining</button>
            <button type="button" data-cache-resolution="close">Make Room</button>
        </div>`;
    popup.querySelector('[data-cache-resolution="retry"]').addEventListener('click', attemptResolvePendingCache);
    popup.querySelector('[data-cache-resolution="sell"]').addEventListener('click', sellPendingCacheRewards);
    popup.querySelector('[data-cache-resolution="close"]').addEventListener('click', closeCacheResolutionPopup);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

function renderResourceCard(definition, quantity, kind) {
    const card = document.createElement('article');
    card.className = `resource-storage-card ${quantity > 0 ? 'is-owned' : 'is-empty'}`;
    const detail = kind === 'core' ? definition.effect : `Open for themed rewards or sell for ${definition.sellValue} Feed.`;
    card.innerHTML = `
        <img src="${definition.icon}" alt="${definition.name}">
        <div class="resource-storage-copy"><strong>${definition.name}</strong><span>${detail}</span></div>
        <b>×${quantity.toLocaleString()}</b>`;
    if (kind === 'cache' && quantity > 0) {
        const actions = document.createElement('div');
        actions.className = 'resource-storage-actions';
        actions.innerHTML = '<button type="button" data-resource-action="open">Open</button><button type="button" data-resource-action="sell">Sell</button>';
        actions.querySelector('[data-resource-action="open"]').addEventListener('click', () => openCache(definition.id));
        actions.querySelector('[data-resource-action="sell"]').addEventListener('click', () => sellCache(definition.id));
        card.appendChild(actions);
    }
    return card;
}

function refreshResourceStorageUI() {
    const coreGrid = document.getElementById('core-storage-grid');
    const cacheGrid = document.getElementById('cache-storage-grid');
    if (coreGrid) {
        coreGrid.innerHTML = '';
        CORE_DEFINITIONS.forEach(definition => coreGrid.appendChild(renderResourceCard(definition, getCoreQuantity(definition.id), 'core')));
    }
    if (cacheGrid) {
        cacheGrid.innerHTML = '';
        CACHE_DEFINITIONS.forEach(definition => cacheGrid.appendChild(renderResourceCard(definition, getCacheQuantity(definition.id), 'cache')));
    }
    const pendingButton = document.getElementById('cache-overflow-open');
    if (pendingButton) pendingButton.hidden = !window.pendingCacheResolution;
}

window.CORE_STORAGE_CAP = CORE_STORAGE_CAP;
window.CACHE_STORAGE_CAP = CACHE_STORAGE_CAP;
window.CORE_DEFINITIONS = CORE_DEFINITIONS;
window.CACHE_DEFINITIONS = CACHE_DEFINITIONS;
window.normalizeCoreInventory = normalizeCoreInventory;
window.normalizeCacheInventory = normalizeCacheInventory;
window.getCoreDefinition = getCoreDefinition;
window.getCacheDefinition = getCacheDefinition;
window.getCoreQuantity = getCoreQuantity;
window.getCacheQuantity = getCacheQuantity;
window.addCoreToStorage = addCoreToStorage;
window.addCacheToStorage = addCacheToStorage;
window.removeStackFromMap = removeStackFromMap;
window.rollEnemySpecialDrops = rollEnemySpecialDrops;
window.rollCacheContents = rollCacheContents;
window.openCache = openCache;
window.sellCache = sellCache;
window.showCacheResolutionPopup = showCacheResolutionPopup;
window.refreshResourceStorageUI = refreshResourceStorageUI;

window.registerCoreboundInitializer(() => {
    window.coreInventory = normalizeCoreInventory(window.coreInventory);
    window.cacheInventory = normalizeCacheInventory(window.cacheInventory);
    refreshResourceStorageUI();
    document.getElementById('cache-overflow-open')?.addEventListener('click', showCacheResolutionPopup);
});
