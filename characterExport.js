// Human-readable character snapshots for balance analysis and build comparison.

const CHARACTER_EXPORT_SCHEMA_VERSION = 2;
const CHARACTER_EXPORT_STANDARD_SLOTS = Object.freeze([
    ['mainHand', 'Main Hand'],
    ['offHand', 'Off Hand'],
    ['head', 'Head'],
    ['chest', 'Chest'],
    ['legs', 'Legs'],
    ['feet', 'Feet'],
    ['gloves', 'Gloves']
]);
const CHARACTER_EXPORT_ITEM_OMIT_KEYS = new Set([
    'icon',
    'description',
    'rollGroups',
    'disassembleResults',
    'isDisassembleable',
    'developerOnly'
]);

function normalizeCharacterExportValue(value, seen = new WeakSet()) {
    if (value === undefined || typeof value === 'function') return undefined;
    if (value === null || typeof value !== 'object') {
        if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
        return value;
    }
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) {
        const normalizedArray = value
            .map(entry => normalizeCharacterExportValue(entry, seen))
            .filter(entry => entry !== undefined);
        seen.delete(value);
        return normalizedArray;
    }

    const normalizedObject = {};
    Object.keys(value).sort((left, right) => left.localeCompare(right)).forEach(key => {
        const normalized = normalizeCharacterExportValue(value[key], seen);
        if (normalized !== undefined) normalizedObject[key] = normalized;
    });
    seen.delete(value);
    return normalizedObject;
}

function formatCharacterExportJson(value) {
    return JSON.stringify(normalizeCharacterExportValue(value), null, 2);
}

function formatCharacterExportScalar(value) {
    if (value === null || value === undefined || value === '') return 'None';
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return String(value);
        return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
    }
    return String(value);
}

function getCharacterExportItemLevel(item) {
    const requirement = item?.levelRequirement ?? item?.level;
    if (Number.isFinite(Number(requirement))) return Number(requirement);
    if (requirement && typeof requirement === 'object') {
        if (Number.isFinite(Number(requirement.min))) return Number(requirement.min);
        if (Number.isFinite(Number(requirement.max))) return Number(requirement.max);
    }
    return null;
}

function getCharacterExportItemData(item) {
    if (!item || typeof item !== 'object') return null;
    const data = {};
    Object.keys(item).forEach(key => {
        if (CHARACTER_EXPORT_ITEM_OMIT_KEYS.has(key)) return;
        const normalized = normalizeCharacterExportValue(item[key]);
        if (normalized !== undefined) data[key] = normalized;
    });
    return normalizeCharacterExportValue(data);
}

function getCharacterExportStyleRows(playerObject) {
    const styles = Array.isArray(window.combatStyles) ? window.combatStyles : [];
    const equippedId = typeof getEquippedSkillId === 'function'
        ? getEquippedSkillId(playerObject)
        : playerObject?.equippedSkillId;
    return styles.map(style => {
        const selected = typeof getSelectedStyleChoices === 'function'
            ? getSelectedStyleChoices(playerObject, style.id)
            : (style.tree?.nodes || []).filter(node => (
                Number(playerObject?.combatStyleAllocations?.[style.id]?.nodes?.[node.id]) > 0
            ));
        return {
            id: style.id,
            name: style.name,
            active: style.id === equippedId,
            description: style.description,
            baseProfile: style.base,
            selectedChoices: selected.map(choice => ({
                tier: choice.tier,
                tierName: choice.tierName,
                unlockLevel: choice.unlockLevel,
                id: choice.id,
                name: choice.name,
                description: choice.description,
                modifiers: choice.modifiers || {},
                mechanics: choice.mechanics || []
            }))
        };
    });
}

function getCharacterExportPassiveRows(playerObject) {
    const allocations = playerObject?.passiveAllocations || {};
    return Object.entries(allocations)
        .map(([nodeId, rawRank], allocationIndex) => {
            const node = typeof getPassiveNode === 'function' ? getPassiveNode(nodeId) : null;
            const allocatedRank = Math.max(0, Number(rawRank) || 0);
            const gearRank = Math.max(0, Number(playerObject?.gearPassiveBonuses?.[nodeId]) || 0);
            const effectRank = allocatedRank + (node?.gearScalable ? gearRank : 0);
            const effectLines = node && typeof getPassiveEffectLines === 'function'
                ? getPassiveEffectLines(node, effectRank)
                : [];
            return {
                allocationIndex,
                id: nodeId,
                name: node?.name || 'Unknown Passive',
                sector: node?.sector || 'unknown',
                type: node?.type || 'unknown',
                allocatedRank,
                gearRank,
                effectiveRank: effectRank,
                description: node?.description || '',
                effectLines,
                rawEffects: node?.effects || null
            };
        })
        .filter(row => row.allocatedRank > 0)
        .sort((left, right) => left.allocationIndex - right.allocationIndex);
}

function getCharacterExportProgressRows(completedLocations, locationDefinitions) {
    const definitions = new Map((locationDefinitions || []).map(location => [location.name, location]));
    return Object.entries(completedLocations || {})
        .filter(([, count]) => Number(count) > 0)
        .map(([name, count]) => {
            const definition = definitions.get(name);
            return {
                name,
                clears: Number(count),
                category: definition?.locationCategory || 'unknown',
                endgameTier: definition?.endgameTier ?? null,
                recommendedLevel: definition?.recommendedLevel ?? null
            };
        })
        .sort((left, right) => {
            const tierDifference = Number(left.endgameTier || 0) - Number(right.endgameTier || 0);
            return tierDifference || left.name.localeCompare(right.name);
        });
}

function pushCharacterExportSection(lines, title) {
    lines.push('', `=== ${title} ===`);
}

function buildCharacterDetailsExport(playerObject, context = {}) {
    if (!playerObject || typeof playerObject !== 'object') {
        throw new TypeError('A loaded character is required to export character details.');
    }

    if (context.recalculate !== false && typeof calculatePlayerStats === 'function') {
        calculatePlayerStats(playerObject);
    }

    const generatedAt = context.generatedAt instanceof Date ? context.generatedAt : new Date();
    const feed = context.feed ?? (typeof playerFeed !== 'undefined' ? playerFeed : 0);
    const completedLocations = context.completedLocations
        ?? (typeof completedDelveLocations !== 'undefined' ? completedDelveLocations : {});
    const operationSeeds = context.completedOperationSeeds
        ?? (typeof completedOperationSeeds !== 'undefined' ? completedOperationSeeds : []);
    const operationClearCount = Math.max(0, Math.floor(Number(
        context.completedOperationCount
        ?? (typeof completedOperationCount !== 'undefined' ? completedOperationCount : 0)
    ) || 0));
    const locationDefinitions = context.locationDefinitions
        ?? (typeof allLocations !== 'undefined' ? allLocations : []);
    const progressRows = getCharacterExportProgressRows(completedLocations, locationDefinitions);
    const highestEndgameTier = progressRows.reduce((highest, row) => (
        Math.max(highest, Number(row.endgameTier) || 0)
    ), 0);
    const passiveRows = getCharacterExportPassiveRows(playerObject);
    const passivePointTotal = passiveRows.reduce((total, row) => total + row.allocatedRank, 0);
    const styleRows = getCharacterExportStyleRows(playerObject);
    const activeStyle = styleRows.find(style => style.active) || null;
    const resolvedStyleProfile = typeof resolveSkillProfile === 'function'
        ? resolveSkillProfile(playerObject)
        : null;
    const lines = [
        'COREBOUND CHARACTER DETAILS',
        `Export Schema: ${CHARACTER_EXPORT_SCHEMA_VERSION}`,
        `Generated: ${generatedAt.toISOString()}`,
        `Save Schema: ${typeof COREBOUND_SAVE_VERSION !== 'undefined' ? COREBOUND_SAVE_VERSION : 'Unknown'}`
    ];

    pushCharacterExportSection(lines, 'CHARACTER & PROGRESSION');
    lines.push(
        `Name: ${formatCharacterExportScalar(playerObject.name || 'Player')}`,
        `Level: ${formatCharacterExportScalar(playerObject.level)}`,
        `Experience: ${formatCharacterExportScalar(playerObject.experience)}`,
        `Feed: ${formatCharacterExportScalar(feed)}`,
        `Current Health: ${formatCharacterExportScalar(playerObject.currentHealth)}`,
        `Current Energy Shield: ${formatCharacterExportScalar(playerObject.currentShield)}`,
        `Passive Points Spent: ${formatCharacterExportScalar(passivePointTotal)}`,
        `Passive Points Unspent: ${formatCharacterExportScalar(playerObject.passivePoints)}`,
        `Highest Endgame Tier Cleared: ${highestEndgameTier || 'None'}`,
        `Total Operation Clears: ${operationClearCount}`
    );
    lines.push('Gathering Skills:');
    lines.push(formatCharacterExportJson(playerObject.gatheringSkills || {}));

    pushCharacterExportSection(lines, 'COMBAT STYLE');
    lines.push(
        `Active Style: ${activeStyle ? `${activeStyle.name} (${activeStyle.id})` : formatCharacterExportScalar(playerObject.equippedSkillId)}`,
        `Active Description: ${activeStyle?.description || 'Unavailable'}`,
        'Resolved Active Attack Profile:',
        formatCharacterExportJson(resolvedStyleProfile || {})
    );
    lines.push('Configured Mastery Choices:');
    if (styleRows.every(style => style.selectedChoices.length === 0)) {
        lines.push('None');
    } else {
        styleRows.filter(style => style.selectedChoices.length > 0).forEach(style => {
            lines.push(`- ${style.name} (${style.id})${style.active ? ' [ACTIVE]' : ''}`);
            style.selectedChoices.forEach(choice => {
                lines.push(`  - Tier ${choice.tier} ${choice.tierName}: ${choice.name} (${choice.id})`);
                lines.push(`    ${choice.description}`);
                lines.push(`    Modifiers: ${formatCharacterExportJson(choice.modifiers).replace(/\n/g, '\n    ')}`);
                lines.push(`    Mechanics: ${choice.mechanics.length ? choice.mechanics.join(', ') : 'None'}`);
            });
        });
    }

    pushCharacterExportSection(lines, 'OVERALL CALCULATED STATS');
    lines.push(formatCharacterExportJson(playerObject.totalStats || {}));

    pushCharacterExportSection(lines, 'BASE STATS');
    lines.push(formatCharacterExportJson(playerObject.baseStats || {}));

    pushCharacterExportSection(lines, 'ACTIVE TEMPORARY EFFECTS');
    lines.push('Buffs:');
    lines.push(formatCharacterExportJson(playerObject.activeBuffs || []));
    lines.push('Debuffs:');
    lines.push(formatCharacterExportJson(playerObject.activeDebuffs || []));

    pushCharacterExportSection(lines, 'EQUIPPED ITEMS');
    const equipment = playerObject.equipment || {};
    CHARACTER_EXPORT_STANDARD_SLOTS.forEach(([slotId, slotLabel]) => {
        const item = equipment[slotId];
        lines.push('', `[${slotLabel}]`);
        if (!item) {
            lines.push('Empty');
            return;
        }
        lines.push(
            `Name: ${formatCharacterExportScalar(item.name)}`,
            `Item Level / Requirement: ${formatCharacterExportScalar(getCharacterExportItemLevel(item))}`,
            'Mechanical Data:',
            formatCharacterExportJson(getCharacterExportItemData(item))
        );
    });
    const bionicSlots = Array.isArray(equipment.bionicSlots) ? equipment.bionicSlots : [];
    const bionicSlotCount = Math.max(4, bionicSlots.length);
    for (let index = 0; index < bionicSlotCount; index++) {
        const item = bionicSlots[index];
        lines.push('', `[Bionic ${index + 1}]`);
        if (!item) {
            lines.push('Empty');
            continue;
        }
        lines.push(
            `Name: ${formatCharacterExportScalar(item.name)}`,
            `Item Level / Requirement: ${formatCharacterExportScalar(getCharacterExportItemLevel(item))}`,
            'Mechanical Data:',
            formatCharacterExportJson(getCharacterExportItemData(item))
        );
    }

    pushCharacterExportSection(lines, 'ALLOCATED PASSIVE NODES');
    lines.push(
        `Tree Version: ${formatCharacterExportScalar(playerObject.passiveTreeVersion)}`,
        `Allocated Nodes: ${passiveRows.length}`,
        `Allocated Points: ${passivePointTotal}`
    );
    if (passiveRows.length === 0) {
        lines.push('None');
    } else {
        passiveRows.forEach((row, index) => {
            lines.push('', `${index + 1}. ${row.name} (${row.id})`);
            lines.push(`   Sector / Type: ${row.sector} / ${row.type}`);
            lines.push(`   Allocated Rank: ${row.allocatedRank}`);
            if (row.gearRank > 0) lines.push(`   Gear Rank: ${row.gearRank}`);
            lines.push(`   Effective Rank: ${row.effectiveRank}`);
            if (row.description) lines.push(`   Description: ${row.description}`);
            if (row.effectLines.length > 0) {
                row.effectLines.forEach(effect => lines.push(`   Effect: ${effect}`));
            } else {
                lines.push(`   Raw Effects: ${formatCharacterExportJson(row.rawEffects || {}).replace(/\n/g, '\n   ')}`);
            }
        });
    }

    pushCharacterExportSection(lines, 'AGGREGATED PASSIVE BONUSES');
    lines.push(formatCharacterExportJson(playerObject.passiveBonuses || {}));

    pushCharacterExportSection(lines, 'GEAR-GRANTED PASSIVE RANKS');
    const gearPassiveRows = Object.entries(playerObject.gearPassiveBonuses || {})
        .filter(([, rank]) => Number(rank) > 0)
        .map(([nodeId, rank]) => ({
            nodeId,
            name: typeof getPassiveNode === 'function' ? getPassiveNode(nodeId)?.name : null,
            rank: Number(rank)
        }));
    if (gearPassiveRows.length === 0) lines.push('None');
    else gearPassiveRows.forEach(row => lines.push(`- ${row.name || 'Unknown Passive'} (${row.nodeId}): +${row.rank}`));

    pushCharacterExportSection(lines, 'DELVE CLEAR HISTORY');
    if (progressRows.length === 0) {
        lines.push('None');
    } else {
        progressRows.forEach(row => {
            const tier = row.endgameTier ? ` · Endgame Tier ${row.endgameTier}` : '';
            const level = row.recommendedLevel ? ` · Recommended Level ${row.recommendedLevel}` : '';
            lines.push(`- ${row.name}: ${row.clears} clear(s) · ${row.category}${tier}${level}`);
        });
    }

    pushCharacterExportSection(lines, 'COMPLETED OPERATION SEEDS (LAST 10)');
    const savedSeeds = Array.isArray(operationSeeds)
        ? operationSeeds.filter(seed => typeof seed === 'string' && seed).slice(-10)
        : [];
    if (savedSeeds.length === 0) lines.push('None');
    else savedSeeds.forEach((seed, index) => lines.push(`${index + 1}. ${seed}`));

    return `${lines.join('\n').trim()}\n`;
}

async function copyCharacterDetailsText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Clipboard copy was rejected.');
}

function downloadCharacterDetailsText(text, level) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `corebound-character-level-${Math.max(1, Number(level) || 1)}-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function setCharacterExportStatus(message, isError = false) {
    const status = document.getElementById('character-export-status');
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle('is-error', isError);
}

function wireCharacterDetailsExport() {
    const button = document.getElementById('copy-character-details');
    if (!button || button.dataset.exportWired === 'true') return;
    button.dataset.exportWired = 'true';
    button.addEventListener('click', async () => {
        button.disabled = true;
        setCharacterExportStatus('Building character snapshot...');
        try {
            const text = buildCharacterDetailsExport(player);
            try {
                await copyCharacterDetailsText(text);
                setCharacterExportStatus(`Copied ${text.length.toLocaleString()} characters of build data.`);
                if (typeof logMessage === 'function') logMessage('Character details copied to clipboard.');
            } catch (clipboardError) {
                downloadCharacterDetailsText(text, player.level);
                setCharacterExportStatus('Clipboard access was blocked. Character details were downloaded as a TXT file.');
                if (typeof logMessage === 'function') logMessage('Character details downloaded as a TXT file.');
            }
        } catch (error) {
            console.error('Character detail export failed:', error);
            setCharacterExportStatus(`Could not export character details: ${error.message}`, true);
        } finally {
            button.disabled = false;
        }
    });
}

window.buildCharacterDetailsExport = buildCharacterDetailsExport;
window.copyCharacterDetailsText = copyCharacterDetailsText;

window.registerCoreboundInitializer(wireCharacterDetailsExport);
