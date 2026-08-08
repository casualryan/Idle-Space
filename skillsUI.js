// skillsUI.js — Combat Styles tree prototype UI

let selectedCombatStyleId = null;
let hoveredNodeRef = null;
const STYLE_TREE_PADDING = 20;
const STYLE_TREE_X_STEP = 88;
const STYLE_TREE_Y_STEP = 34;

function getNodeSize(nodeType) {
    if (nodeType === 'keystone') return 76;
    if (nodeType === 'major') return 64;
    return 56;
}

function getNodeLayout(node) {
    const size = getNodeSize(node.type);
    const left = STYLE_TREE_PADDING + (node.x - 1) * STYLE_TREE_X_STEP;
    const top = STYLE_TREE_PADDING + (node.y - 1) * STYLE_TREE_Y_STEP;
    return {
        left,
        top,
        size,
        centerX: left + (size / 2),
        centerY: top + (size / 2),
    };
}

function getTreeViewBox(nodes) {
    if (!nodes.length) return { width: 760, height: 430 };
    let maxRight = 0;
    let maxBottom = 0;
    for (const node of nodes) {
        const layout = getNodeLayout(node);
        maxRight = Math.max(maxRight, layout.left + layout.size);
        maxBottom = Math.max(maxBottom, layout.top + layout.size);
    }
    return {
        width: maxRight + STYLE_TREE_PADDING,
        height: maxBottom + STYLE_TREE_PADDING,
    };
}

function getCombatStylesUiData() {
    return window.combatStyles || [];
}

function getSkillsGatingMessage() {
    if (typeof canChangeSkills === 'function' && !canChangeSkills()) {
        return 'Cannot change combat styles during combat or an active delve.';
    }
    return null;
}

function ensureSelectedCombatStyle() {
    const styles = getCombatStylesUiData();
    if (!styles.length) return null;
    if (typeof normalizeCombatStylesState === 'function') {
        normalizeCombatStylesState(player);
    }
    if (!selectedCombatStyleId || !styles.some((s) => s.id === selectedCombatStyleId)) {
        selectedCombatStyleId = player.equippedSkillId || styles[0].id;
    }
    return selectedCombatStyleId;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getNodeIconGlyph(iconId) {
    const glyphs = {
        precision: '⌖',
        shield: '⬡',
        chain: '⛓',
        blade: '✦',
        target: '◉',
        barrier: '⬢',
        impact: '✹',
        weakspot: '◎',
        split: '⑂',
        focus: '◆',
        fortress: '▦',
        speed: '»',
        cycle: '↻',
        crit: '✺',
        debuff: '⊗',
        pulse: '❤',
        analysis: '◌',
        momentum: '➤',
        chainplus: '⛓',
        armor: '⛨',
        star: '✶',
        balance: '☯',
        motion: '➣',
        core: '⬢',
        fallback: '◈',
    };
    return glyphs[iconId] || glyphs.fallback;
}

function getNodeIconSvg(iconId) {
    const glyph = getNodeIconGlyph(iconId);
    return `
        <svg class="combat-style-node-icon-svg" viewBox="0 0 512 512" role="img" aria-hidden="true">
            <defs>
                <radialGradient id="nodeCore" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stop-color="#0c3f52"></stop>
                    <stop offset="75%" stop-color="#071620"></stop>
                    <stop offset="100%" stop-color="#02060c"></stop>
                </radialGradient>
            </defs>
            <circle cx="256" cy="256" r="222" fill="url(#nodeCore)" stroke="#00d9ff" stroke-width="20"></circle>
            <circle cx="256" cy="256" r="180" fill="none" stroke="#1effb5" stroke-opacity="0.5" stroke-width="8"></circle>
            <text x="256" y="292" text-anchor="middle" font-size="180" font-weight="700" fill="#c6fff2">${glyph}</text>
        </svg>
    `;
}

function buildNodeDetailsPanel(node, styleId) {
    if (!node) {
        return `
            <h3>Node Details</h3>
            <div class="combat-style-empty-text">Hover a node to inspect requirements and status.</div>
        `;
    }

    const points = typeof getStyleNodePoints === 'function' ? getStyleNodePoints(player, styleId, node.id) : 0;
    const statusInfo = typeof getStyleNodeStatus === 'function'
        ? getStyleNodeStatus(player, styleId, node.id)
        : { status: 'locked', reason: 'Unavailable' };
    const requires = (node.requires || []).length ? node.requires.join(', ') : 'None';
    const mutual = (node.mutuallyExclusiveWith || []).length ? node.mutuallyExclusiveWith.join(', ') : 'None';

    return `
        <h3>${escapeHtml(node.name)}</h3>
        <div class="combat-style-node-type">${escapeHtml((node.type || 'minor').toUpperCase())}</div>
        <div class="combat-style-node-detail-row"><span>Points:</span><span>${points}/${Math.max(1, node.maxPoints || 1)}</span></div>
        <div class="combat-style-node-detail-row"><span>Cost:</span><span>${Math.max(1, node.cost || 1)}</span></div>
        <div class="combat-style-node-detail-row"><span>Status:</span><span>${escapeHtml(statusInfo.reason || statusInfo.status)}</span></div>
        <div class="combat-style-node-detail-block"><strong>Requires:</strong> ${escapeHtml(requires)}</div>
        <div class="combat-style-node-detail-block"><strong>Exclusive With:</strong> ${escapeHtml(mutual)}</div>
        <div class="combat-style-node-detail-block"><strong>Effect:</strong> ${escapeHtml(node.description || 'No description.')}</div>
        <div class="combat-style-node-detail-help">
            Left-click: spend point<br>
            Right-click: refund point
        </div>
    `;
}

function buildNodeConnections(styleId, style) {
    const nodes = style.tree?.nodes || [];
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    let lines = '';

    for (const node of nodes) {
        const reqs = node.requires || [];
        const targetLayout = getNodeLayout(node);
        for (const reqId of reqs) {
            const reqNode = nodeById.get(reqId);
            if (!reqNode) continue;
            const reqLayout = getNodeLayout(reqNode);
            const active = typeof getStyleNodePoints === 'function' && getStyleNodePoints(player, styleId, reqId) > 0;
            lines += `<line class="combat-style-connection ${active ? 'active' : ''}" x1="${reqLayout.centerX}" y1="${reqLayout.centerY}" x2="${targetLayout.centerX}" y2="${targetLayout.centerY}"></line>`;
        }
    }
    return lines;
}

function renderCombatStylesScreen() {
    const screen = document.getElementById('skills-screen');
    if (!screen) return;

    const styles = getCombatStylesUiData();
    if (!styles.length) {
        screen.innerHTML = '<h2>Combat Styles</h2><p class="skills-gating-notice">No combat style data loaded.</p>';
        return;
    }

    if (typeof normalizeCombatStylesState === 'function') {
        normalizeCombatStylesState(player);
    }
    const selectedStyleId = ensureSelectedCombatStyle();
    const selectedStyle = styles.find((s) => s.id === selectedStyleId) || styles[0];
    const equippedStyleId = player.equippedSkillId || selectedStyle.id;
    const pointSummary = typeof getStylePointSummary === 'function'
        ? getStylePointSummary(player, selectedStyle.id)
        : { earned: 0, spent: 0, available: 0, max: 10, nextPointLevel: null };
    const gatingMsg = getSkillsGatingMessage();

    const styleCardsMarkup = styles.map((style) => {
        const selected = style.id === selectedStyle.id;
        const equipped = style.id === equippedStyleId;
        return `
            <div class="combat-style-card ${selected ? 'selected' : ''} ${equipped ? 'equipped' : ''}" data-style-select="${style.id}" role="button" tabindex="0" aria-label="Select ${escapeHtml(style.name)}">
                <div class="combat-style-card-icon">${getNodeIconSvg('core')}</div>
                <div class="combat-style-card-body">
                    <div class="combat-style-card-name">${escapeHtml(style.name)}${equipped ? ' <span class="combat-style-badge">ACTIVE</span>' : ''}</div>
                    <div class="combat-style-card-desc">${escapeHtml(style.description)}</div>
                    <div class="combat-style-card-preview">${escapeHtml(style.attackPreview || '')}</div>
                </div>
                <div class="combat-style-card-actions">
                    <button type="button" class="combat-style-equip-btn" data-style-equip="${style.id}" ${equipped || gatingMsg ? 'disabled' : ''}>Equip</button>
                </div>
            </div>
        `;
    }).join('');

    const nodes = selectedStyle.tree?.nodes || [];
    const viewBox = getTreeViewBox(nodes);
    const nodesMarkup = nodes.map((node) => {
        const statusInfo = typeof getStyleNodeStatus === 'function'
            ? getStyleNodeStatus(player, selectedStyle.id, node.id)
            : { status: 'locked', reason: 'Locked' };
        const points = typeof getStyleNodePoints === 'function' ? getStyleNodePoints(player, selectedStyle.id, node.id) : 0;
        const layout = getNodeLayout(node);
        return `
            <button
                type="button"
                class="combat-style-node ${statusInfo.status} ${node.type || 'minor'}"
                data-style-node="${node.id}"
                style="left:${layout.left}px;top:${layout.top}px;width:${layout.size}px;height:${layout.size}px;"
                title="${escapeHtml(node.name)}"
                aria-label="${escapeHtml(node.name)}"
            >
                ${getNodeIconSvg(node.icon || 'fallback')}
                ${points > 0 ? `<span class="combat-style-node-points">${points}</span>` : ''}
            </button>
        `;
    }).join('');

    const detailsHtml = buildNodeDetailsPanel(hoveredNodeRef, selectedStyle.id);
    const nextPointText = pointSummary.nextPointLevel ? `Next point at level ${pointSummary.nextPointLevel}` : 'All style points unlocked';

    screen.innerHTML = `
        <div class="combat-styles-screen">
            <div class="combat-styles-header">
                <div>
                    <h2>COMBAT STYLES</h2>
                    <div class="combat-style-active-line">Active Style: ${escapeHtml(styles.find((s) => s.id === equippedStyleId)?.name || selectedStyle.name)}</div>
                    <div class="combat-style-help-bar">
                        Left-click nodes to spend points. Right-click purchased nodes to refund. Only the active Combat Style affects combat.
                    </div>
                </div>
                <div class="combat-style-point-summary">
                    <div>Available: ${pointSummary.available}</div>
                    <div>Spent: ${pointSummary.spent}</div>
                    <div>Earned: ${pointSummary.earned} / ${pointSummary.max}</div>
                    <div class="combat-style-next-point">${escapeHtml(nextPointText)}</div>
                </div>
            </div>
            ${gatingMsg ? `<div class="skills-gating-notice">${escapeHtml(gatingMsg)}</div>` : ''}
            <div class="combat-styles-layout">
                <aside class="combat-style-list">${styleCardsMarkup}</aside>
                <main class="combat-style-tree-panel">
                    <div class="combat-style-tree-toolbar">
                        <div class="combat-style-tree-title">${escapeHtml(selectedStyle.name)} Tree</div>
                        <button type="button" class="combat-style-refund-btn" id="refund-selected-style" ${gatingMsg ? 'disabled' : ''}>Refund Selected Style</button>
                    </div>
                    <div class="combat-style-tree-wrapper">
                        <svg class="combat-style-connections" width="${viewBox.width}" height="${viewBox.height}" viewBox="0 0 ${viewBox.width} ${viewBox.height}">
                            ${buildNodeConnections(selectedStyle.id, selectedStyle)}
                        </svg>
                        <div class="combat-style-node-grid">
                            ${nodesMarkup}
                        </div>
                    </div>
                </main>
                <aside class="combat-style-details-panel" id="combat-style-details-panel">
                    ${detailsHtml}
                </aside>
            </div>
        </div>
    `;

    screen.querySelectorAll('[data-style-select]').forEach((button) => {
        button.addEventListener('click', (event) => {
            const styleId = event.currentTarget.getAttribute('data-style-select');
            selectedCombatStyleId = styleId;
            hoveredNodeRef = null;
            renderCombatStylesScreen();
        });
        button.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            const styleId = event.currentTarget.getAttribute('data-style-select');
            selectedCombatStyleId = styleId;
            hoveredNodeRef = null;
            renderCombatStylesScreen();
        });
    });

    screen.querySelectorAll('[data-style-equip]').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const styleId = event.currentTarget.getAttribute('data-style-equip');
            const result = equipCombatSkill(player, styleId);
            if (!result.ok) {
                logMessage(result.reason || 'Could not equip combat style.');
                return;
            }
            logMessage(`Active combat style set to ${styles.find((s) => s.id === styleId)?.name || styleId}.`);
            renderCombatStylesScreen();
        });
    });

    screen.querySelectorAll('[data-style-node]').forEach((button) => {
        const nodeId = button.getAttribute('data-style-node');
        const node = nodes.find((n) => n.id === nodeId);
        button.addEventListener('mouseenter', () => {
            hoveredNodeRef = node || null;
            const detailsPanel = document.getElementById('combat-style-details-panel');
            if (detailsPanel) detailsPanel.innerHTML = buildNodeDetailsPanel(hoveredNodeRef, selectedStyle.id);
        });
        button.addEventListener('focus', () => {
            hoveredNodeRef = node || null;
            const detailsPanel = document.getElementById('combat-style-details-panel');
            if (detailsPanel) detailsPanel.innerHTML = buildNodeDetailsPanel(hoveredNodeRef, selectedStyle.id);
        });
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const result = allocateStyleNode(player, selectedStyle.id, nodeId);
            if (!result.ok) {
                logMessage(result.reason || 'Cannot spend point on this node.');
                return;
            }
            hoveredNodeRef = node || null;
            renderCombatStylesScreen();
        });
        button.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const result = refundStyleNode(player, selectedStyle.id, nodeId);
            if (!result.ok) {
                logMessage(result.reason || 'Cannot refund this node.');
                return;
            }
            hoveredNodeRef = node || null;
            renderCombatStylesScreen();
        });
    });

    document.getElementById('refund-selected-style')?.addEventListener('click', () => {
        const result = refundAllStyleNodes(player, selectedStyle.id);
        if (!result.ok) {
            logMessage(result.reason || 'Cannot refund selected style.');
            return;
        }
        hoveredNodeRef = null;
        logMessage(`${selectedStyle.name} nodes refunded.`);
        renderCombatStylesScreen();
    });
}

function displaySkillsScreen() {
    renderCombatStylesScreen();
}

window.registerCoreboundInitializer(() => {
    const menuItem = document.querySelector('li[data-screen="skills-screen"]');
    if (menuItem) {
        menuItem.addEventListener('click', () => {
            showScreen('skills-screen');
            renderCombatStylesScreen();
        });
    }
});

window.displaySkillsScreen = displaySkillsScreen;
window.refreshCombatStylesScreen = renderCombatStylesScreen;
