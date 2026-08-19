// Dedicated, slotless material storage. Material names are the stable keys used
// by recipes, loot, gathering, saves, and the fixed-position inventory UI.

const MATERIAL_STORAGE_CAP = 50000;
const FLUX_STORAGE_GRADES = Object.freeze(['Flux I', 'Flux II', 'Flux III', 'Flux IV', 'Flux V']);

const MATERIAL_STORAGE_GROUPS = Object.freeze([
    Object.freeze({
        id: 'foundational',
        label: 'Foundational Stockpile',
        description: 'Predictable bulk construction supplies used across the entire fabrication ladder.',
        materials: Object.freeze([
            'Scrap Metal',
            'Iron Ore',
            'Copper Ore',
            'Titanium',
            'Metal Fasteners',
            'Wire Bundle',
            'Minor Electronic Circuit',
            'Advanced Electronic Circuit',
            'Basic Servo',
            'Advanced Servo',
            'Titanium Plating',
            'Advanced Alloy'
        ])
    }),
    Object.freeze({
        id: 'kinetic',
        label: 'Kinetic Components',
        description: 'Impact materials progress from common stabilizers to precision driver assemblies.',
        materials: Object.freeze([
            'Stabilizer',
            'Advanced Barrel',
            'Precision Mechanism'
        ])
    }),
    Object.freeze({
        id: 'slashing',
        label: 'Slashing Components',
        description: 'Cutting components progress from raw thorns to perfected high-energy edges.',
        materials: Object.freeze([
            'Titanium Thorn',
            'Metal Scorpion Fang',
            'Enhanced Cutting Edge'
        ])
    }),
    Object.freeze({
        id: 'pyro',
        label: 'Pyro Components',
        description: 'Thermal components progress from Flame Shells through Pyro Cores to Flux Crystals.',
        materials: Object.freeze([
            'Flame Shell',
            'Pyro Core',
            'Flux Crystal'
        ])
    }),
    Object.freeze({
        id: 'cryo',
        label: 'Cryo Components',
        description: 'Cooling components progress from sealed Cryo Cells to temporal-grade regulation.',
        materials: Object.freeze([
            'Cryo Cell',
            'Unstable Phase Core',
            'Temporal Stabilizer'
        ])
    }),
    Object.freeze({
        id: 'electric',
        label: 'Electric Components',
        description: 'Electrical components progress from copper windings to quantum charge storage.',
        materials: Object.freeze([
            'Copper Coil',
            'High-Density Power Cell',
            'Quantum Capacitor'
        ])
    }),
    Object.freeze({
        id: 'chemical',
        label: 'Corrosive Components',
        description: 'Chemical components progress from residue to stable synthetic biofluids.',
        materials: Object.freeze([
            'Toxic Residue',
            'Synthetic Poison Gland',
            'Synthetic Biofluid'
        ])
    }),
    Object.freeze({
        id: 'radiation',
        label: 'Radiation Components',
        description: 'Isotope components progress from unstable emissions to programmable nanite matter.',
        materials: Object.freeze([
            'Unstable Photon',
            'Crystalized Light',
            'Nanite Cluster'
        ])
    }),
    Object.freeze({
        id: 'exceptional',
        label: 'Exceptional Technology',
        description: 'Rare neutral components reserved for equipment with unusual or especially powerful identities.',
        materials: Object.freeze([
            'Targeting Module',
            'Neural Network Module',
            'AI Core Fragment',
            'Phase Converter',
            'Quantum Core'
        ])
    }),
    Object.freeze({
        id: 'flux',
        label: 'Flux Reserves',
        description: 'Condensed fabrication energy used to reroll one permanently bound equipment modifier.',
        materials: Object.freeze([
            'Flux I',
            'Flux II',
            'Flux III',
            'Flux IV',
            'Flux V'
        ])
    })
]);

const MATERIAL_STORAGE_ROLE = Object.freeze({
    foundational: 'Foundational material',
    kinetic: 'Kinetic thematic ladder',
    slashing: 'Slashing thematic ladder',
    pyro: 'Pyro thematic ladder',
    cryo: 'Cryo thematic ladder',
    electric: 'Electric thematic ladder',
    chemical: 'Corrosive thematic ladder',
    radiation: 'Radiation thematic ladder',
    exceptional: 'Exceptional neutral material',
    flux: 'Equipment modification resource'
});

const MATERIAL_STORAGE_NAMES = Object.freeze(MATERIAL_STORAGE_GROUPS.flatMap(group => group.materials));
const MATERIAL_STORAGE_NAME_SET = new Set(MATERIAL_STORAGE_NAMES);

window.materialInventory = window.materialInventory && typeof window.materialInventory === 'object'
    ? window.materialInventory
    : {};

function normalizeMaterialStorage(source = {}) {
    const normalized = {};
    MATERIAL_STORAGE_NAMES.forEach(name => {
        const value = Math.floor(Number(source?.[name]) || 0);
        if (value > 0) normalized[name] = Math.min(MATERIAL_STORAGE_CAP, value);
    });
    return normalized;
}

function isMaterialName(itemName) {
    return MATERIAL_STORAGE_NAME_SET.has(itemName);
}

function isMaterialItem(item) {
    return Boolean(item && (item.type === 'Material' || isMaterialName(item.name)));
}

function getMaterialQuantity(itemName) {
    if (!isMaterialName(itemName)) return 0;
    return Math.max(0, Math.min(MATERIAL_STORAGE_CAP, Math.floor(Number(window.materialInventory?.[itemName]) || 0)));
}

function addMaterialToStorage(itemOrName, quantity = null) {
    const itemName = typeof itemOrName === 'string' ? itemOrName : itemOrName?.name;
    if (!isMaterialName(itemName)) return false;
    const amount = Math.max(0, Math.floor(Number(quantity ?? itemOrName?.quantity ?? 1) || 0));
    if (amount <= 0) return true;
    const next = Math.min(MATERIAL_STORAGE_CAP, getMaterialQuantity(itemName) + amount);
    if (next > 0) window.materialInventory[itemName] = next;
    return true;
}

function removeMaterialFromStorage(itemName, quantity = 1) {
    if (!isMaterialName(itemName)) return false;
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));
    if (amount <= 0) return true;
    const current = getMaterialQuantity(itemName);
    if (current < amount) return false;
    const next = current - amount;
    if (next > 0) window.materialInventory[itemName] = next;
    else delete window.materialInventory[itemName];
    return true;
}

function convertFluxStorage(sourceGrade, targetGrade) {
    const sourceIndex = Math.floor(Number(sourceGrade)) - 1;
    const targetIndex = Math.floor(Number(targetGrade)) - 1;
    if (sourceIndex < 0 || sourceIndex >= FLUX_STORAGE_GRADES.length) return null;
    if (targetIndex < 0 || targetIndex >= FLUX_STORAGE_GRADES.length) return null;
    if (Math.abs(sourceIndex - targetIndex) !== 1) return null;

    const upgrading = targetIndex > sourceIndex;
    const sourceCost = upgrading ? 5 : 1;
    const outputQuantity = upgrading ? 1 : 3;
    const sourceName = FLUX_STORAGE_GRADES[sourceIndex];
    const targetName = FLUX_STORAGE_GRADES[targetIndex];
    if (getMaterialQuantity(sourceName) < sourceCost) return null;
    if (getMaterialQuantity(targetName) + outputQuantity > MATERIAL_STORAGE_CAP) return null;
    if (!removeMaterialFromStorage(sourceName, sourceCost)) return null;
    if (!addMaterialToStorage(targetName, outputQuantity)) {
        addMaterialToStorage(sourceName, sourceCost);
        return null;
    }
    return { sourceName, targetName, sourceCost, outputQuantity };
}

function migrateLooseMaterialsToStorage(items = window.inventory) {
    if (!Array.isArray(items)) return [];
    const ordinaryItems = [];
    items.forEach(item => {
        if (isMaterialItem(item)) addMaterialToStorage(item, item.quantity);
        else if (item) ordinaryItems.push(item);
    });
    return ordinaryItems;
}

function getMaterialTemplate(itemName) {
    return (window.materials || []).find(material => material.name === itemName) || null;
}

function getMaterialDropSourceRows(itemName, limit = 4) {
    const poolRegistry = typeof LOOT_POOLS !== 'undefined' ? LOOT_POOLS : {};
    const matchingPools = new Set(Object.entries(poolRegistry)
        .filter(([, pool]) => pool?.items?.some(entry => entry.itemName === itemName))
        .map(([poolName]) => poolName));
    if (matchingPools.size === 0) return [];

    const enemyRegistry = new Map((window.enemies || []).map(enemy => [enemy.name, enemy]));
    const locationRegistry = typeof locations !== 'undefined' ? locations : [];
    const rows = [];
    const seen = new Set();
    const orderedLocations = locationRegistry.slice().sort((a, b) => Number(a.recommendedLevel || 1) - Number(b.recommendedLevel || 1));

    for (const location of orderedLocations) {
        for (const spawn of location.enemies || []) {
            const enemy = enemyRegistry.get(spawn.name);
            const pools = Object.values(enemy?.lootConfig?.poolsByTier || {}).flat();
            const identityPools = [
                ...(enemy?.lootConfig?.poolsByTier?.[2] || []),
                ...(enemy?.lootConfig?.poolsByTier?.[3] || [])
            ];
            const matchingEnemyPools = pools.filter(poolName => matchingPools.has(poolName));
            if (matchingEnemyPools.length === 0) continue;
            const key = `${spawn.name}|${location.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({
                enemy: spawn.name,
                location: location.name,
                level: Number(location.recommendedLevel || 1),
                targeted: identityPools.some(poolName => matchingPools.has(poolName))
            });
        }
    }
    return rows
        .sort((a, b) => Number(b.targeted) - Number(a.targeted) || a.level - b.level)
        .slice(0, limit);
}

function escapeMaterialTooltipText(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getMaterialStorageTooltipContent(itemName, groupLabel) {
    const quantity = getMaterialQuantity(itemName);
    const acquisition = window.MATERIAL_ACQUISITION?.[itemName];
    const dropRows = getMaterialDropSourceRows(itemName);
    const safeName = escapeMaterialTooltipText(itemName);
    const group = MATERIAL_STORAGE_GROUPS.find(entry => entry.materials.includes(itemName));
    const materialIndex = group ? group.materials.indexOf(itemName) : -1;
    const role = group?.id === 'foundational' || group?.id === 'exceptional'
        ? MATERIAL_STORAGE_ROLE[group.id]
        : `${MATERIAL_STORAGE_ROLE[group?.id] || groupLabel} · ${['common', 'advanced', 'apex'][materialIndex] || 'special'} component`;
    const count = quantity.toLocaleString();
    let content = `<div class="material-tooltip-content">`;
    content += `<div class="material-tooltip-title">${safeName}</div>`;
    content += `<div class="material-tooltip-meta"><span>${escapeMaterialTooltipText(role)}</span><strong>${count} / ${MATERIAL_STORAGE_CAP.toLocaleString()}</strong></div>`;

    if (acquisition?.source) {
        content += `<div class="material-tooltip-section"><div class="material-tooltip-heading">Earliest known source</div>`;
        content += `<div>${escapeMaterialTooltipText(acquisition.source)} <span class="material-tooltip-level">(Level ${Math.max(1, Number(acquisition.level) || 1)}+)</span></div></div>`;
    }

    content += `<div class="material-tooltip-section"><div class="material-tooltip-heading">Known enemy drops</div>`;
    if (dropRows.length > 0) {
        content += dropRows.map(row => `<div class="material-tooltip-source"><span>${escapeMaterialTooltipText(row.enemy)}</span><small>${escapeMaterialTooltipText(row.location)}${row.targeted ? ' · TARGETED' : ''}</small></div>`).join('');
    } else if (group?.id === 'flux') {
        content += `<div class="material-tooltip-muted">Higher-level enemies favor stronger Flux, but every unlocked grade can drop. Flux Caches can also yield any unlocked grade.</div>`;
    } else {
        content += `<div class="material-tooltip-muted">No enemy drop has been documented. Check gathering or fabrication sources above.</div>`;
    }
    content += `</div></div>`;
    return content;
}

function updateMaterialInventoryDisplay() {
    const groupsContainer = document.getElementById('material-inventory-groups');
    if (!groupsContainer) return;
    groupsContainer.innerHTML = '';

    MATERIAL_STORAGE_GROUPS.forEach(group => {
        const section = document.createElement('section');
        section.className = 'material-storage-group';
        section.dataset.materialGroup = group.id;
        const isThematicLadder = !['foundational', 'exceptional', 'flux'].includes(group.id);
        if (isThematicLadder) section.classList.add('is-thematic-ladder');

        const heading = document.createElement('div');
        heading.className = 'material-storage-group-heading';
        heading.innerHTML = `<div><h4>${group.label}</h4><p>${group.description}</p></div><span>${group.materials.length} fixed slots</span>`;
        section.appendChild(heading);

        const grid = document.createElement('ul');
        grid.className = 'material-storage-grid';
        grid.style.setProperty('--material-slot-count', String(group.materials.length));

        group.materials.forEach((itemName, index) => {
            const template = getMaterialTemplate(itemName);
            const quantity = getMaterialQuantity(itemName);
            const slot = document.createElement('li');
            slot.className = `material-storage-slot${quantity > 0 ? ' is-owned' : ' is-empty'}`;
            slot.dataset.materialName = itemName;
            slot.dataset.materialSlot = String(index + 1);
            slot.setAttribute('data-has-tooltip', 'true');
            slot.setAttribute('data-tooltip-source', 'material-storage');
            slot.setAttribute('data-tooltip-content', getMaterialStorageTooltipContent(itemName, group.label));
            slot.setAttribute('aria-label', `${itemName}: ${quantity.toLocaleString()}`);

            const icon = document.createElement('img');
            icon.src = template?.icon || 'icons/default-icon.png';
            icon.alt = itemName;
            slot.appendChild(icon);

            if (isThematicLadder) {
                const stage = document.createElement('span');
                stage.className = 'material-stage-badge';
                stage.textContent = ['COMMON', 'ADVANCED', 'APEX'][index] || 'SPECIAL';
                slot.appendChild(stage);
            }

            const badge = document.createElement('div');
            badge.className = 'material-quantity-badge';
            badge.textContent = quantity > 0 ? quantity.toLocaleString() : '0';
            slot.appendChild(badge);
            grid.appendChild(slot);
        });

        section.appendChild(grid);
        groupsContainer.appendChild(section);
    });
}

window.MATERIAL_STORAGE_CAP = MATERIAL_STORAGE_CAP;
window.MATERIAL_STORAGE_GROUPS = MATERIAL_STORAGE_GROUPS;
window.FLUX_STORAGE_GRADES = FLUX_STORAGE_GRADES;
window.getMaterialQuantity = getMaterialQuantity;
window.addMaterialToStorage = addMaterialToStorage;
window.removeMaterialFromStorage = removeMaterialFromStorage;
window.convertFluxStorage = convertFluxStorage;
window.normalizeMaterialStorage = normalizeMaterialStorage;
window.migrateLooseMaterialsToStorage = migrateLooseMaterialsToStorage;
window.getMaterialDropSourceRows = getMaterialDropSourceRows;
window.getMaterialStorageTooltipContent = getMaterialStorageTooltipContent;
window.updateMaterialInventoryDisplay = updateMaterialInventoryDisplay;
