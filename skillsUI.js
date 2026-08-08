// Compact Combat Style selector and three-tier mastery interface.

let selectedCombatStyleId = null;

function getCombatStylesUiData() {
    return window.combatStyles || [];
}

function getSkillsGatingMessage() {
    return typeof canChangeSkills === 'function' && !canChangeSkills()
        ? 'Combat Styles cannot be changed during combat or an active delve.'
        : null;
}

function ensureSelectedCombatStyle() {
    const styles = getCombatStylesUiData();
    if (!styles.length) return null;
    if (typeof normalizeCombatStylesState === 'function') normalizeCombatStylesState(player);
    if (!selectedCombatStyleId || !styles.some(style => style.id === selectedCombatStyleId)) {
        selectedCombatStyleId = player.equippedSkillId || styles[0].id;
    }
    return selectedCombatStyleId;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getStyleIconGlyph(iconId) {
    const glyphs = {
        balance: '◈', impact: '✹', split: '⑂', shield: '⬡', target: '⌖', debuff: '⊗',
        crit: '✺', cycle: '↻', chain: '⛓', star: '✶', speed: '»', weakspot: '◎',
        chainplus: '⛓', blade: '✦', motion: '➣', barrier: '⬢', momentum: '➤',
        focus: '◆', fortress: '▦', fallback: '◇'
    };
    return glyphs[iconId] || glyphs.fallback;
}

function buildStyleCards(styles, selectedStyleId, equippedStyleId, gatingMessage) {
    return styles.map(style => {
        const selected = style.id === selectedStyleId;
        const equipped = style.id === equippedStyleId;
        const configured = typeof getStylePointSummary === 'function'
            ? getStylePointSummary(player, style.id).configured
            : 0;
        return `
            <article class="combat-style-card${selected ? ' selected' : ''}${equipped ? ' equipped' : ''}" data-style-select="${style.id}" tabindex="0" role="button" aria-label="Inspect ${escapeHtml(style.name)}">
                <div class="combat-style-card-icon" aria-hidden="true">${getStyleIconGlyph(style.icon)}</div>
                <div class="combat-style-card-body">
                    <div class="combat-style-card-name">${escapeHtml(style.shortName || style.name)}</div>
                    <div class="combat-style-card-desc">${escapeHtml(style.description)}</div>
                    <div class="combat-style-card-preview">${escapeHtml(style.attackPreview)}</div>
                    <div class="combat-style-card-progress">${configured}/3 masteries configured</div>
                </div>
                <button type="button" class="combat-style-equip-btn" data-style-equip="${style.id}" ${equipped || gatingMessage ? 'disabled' : ''}>
                    ${equipped ? 'Active' : 'Equip'}
                </button>
            </article>`;
    }).join('');
}

function buildMasteryChoice(style, mastery, choice, gatingMessage) {
    const status = typeof getStyleNodeStatus === 'function'
        ? getStyleNodeStatus(player, style.id, choice.id)
        : { status: 'locked', reason: 'Unavailable' };
    const disabled = Boolean(gatingMessage) || status.status === 'locked';
    return `
        <button type="button" class="combat-mastery-choice ${status.status}" data-style-choice="${choice.id}" ${disabled ? 'disabled' : ''} aria-pressed="${status.status === 'selected'}">
            <span class="combat-mastery-choice-icon" aria-hidden="true">${getStyleIconGlyph(choice.icon)}</span>
            <span class="combat-mastery-choice-copy">
                <strong>${escapeHtml(choice.name)}</strong>
                <span>${escapeHtml(choice.description)}</span>
            </span>
            <span class="combat-mastery-choice-status">${escapeHtml(status.reason)}</span>
        </button>`;
}

function buildMasteryTiers(style, gatingMessage) {
    return (style.masteries || []).map(mastery => {
        const unlocked = Number(player.level || 1) >= mastery.unlockLevel;
        const selected = typeof getSelectedStyleChoice === 'function'
            ? getSelectedStyleChoice(player, style.id, mastery.tier)
            : null;
        return `
            <section class="combat-mastery-tier${unlocked ? '' : ' locked'}">
                <header class="combat-mastery-tier-header">
                    <div class="combat-mastery-tier-number">${mastery.tier}</div>
                    <div>
                        <div class="combat-mastery-tier-label">${escapeHtml(mastery.name)}</div>
                        <div class="combat-mastery-tier-purpose">${escapeHtml(mastery.purpose)}</div>
                    </div>
                    <div class="combat-mastery-tier-unlock">${unlocked ? (selected ? 'Configured' : 'Choose one') : `Unlocks at level ${mastery.unlockLevel}`}</div>
                    ${selected && !gatingMessage ? `<button type="button" class="combat-mastery-clear" data-clear-tier="${mastery.tier}">Clear</button>` : ''}
                </header>
                <div class="combat-mastery-choice-grid">
                    ${mastery.choices.map(choice => buildMasteryChoice(style, mastery, choice, gatingMessage)).join('')}
                </div>
            </section>`;
    }).join('');
}

function renderCombatStylesScreen() {
    const screen = document.getElementById('skills-screen');
    if (!screen) return;
    const styles = getCombatStylesUiData();
    if (!styles.length) {
        screen.innerHTML = '<h2>Combat Styles</h2><p class="skills-gating-notice">No combat style data loaded.</p>';
        return;
    }

    normalizeCombatStylesState(player);
    const selectedStyleId = ensureSelectedCombatStyle();
    const selectedStyle = styles.find(style => style.id === selectedStyleId) || styles[0];
    const equippedStyleId = player.equippedSkillId || selectedStyle.id;
    const pointSummary = getStylePointSummary(player, selectedStyle.id);
    const gatingMessage = getSkillsGatingMessage();
    const nextTier = pointSummary.nextPointLevel
        ? `Next mastery tier unlocks at level ${pointSummary.nextPointLevel}.`
        : 'All three mastery tiers are unlocked.';

    screen.innerHTML = `
        <div class="combat-styles-screen">
            <header class="combat-styles-header">
                <div>
                    <div class="combat-styles-kicker">Automatic Attack Programming</div>
                    <h2>Combat Styles</h2>
                    <div class="combat-style-active-line">Active: <strong>${escapeHtml(styles.find(style => style.id === equippedStyleId)?.name || selectedStyle.name)}</strong></div>
                    <div class="combat-style-help-bar">Choose how every auto-attack is delivered. Each unlocked tier allows one choice; selecting another choice in that tier replaces the current one.</div>
                </div>
                <div class="combat-style-point-summary">
                    <span>Unlocked tiers</span><strong>${pointSummary.earned}/3</strong>
                    <span>Configured here</span><strong>${pointSummary.configured}/3</strong>
                    <div class="combat-style-next-point">${escapeHtml(nextTier)}</div>
                </div>
            </header>
            ${gatingMessage ? `<div class="skills-gating-notice">${escapeHtml(gatingMessage)}</div>` : ''}
            <div class="combat-styles-layout">
                <aside class="combat-style-list">${buildStyleCards(styles, selectedStyle.id, equippedStyleId, gatingMessage)}</aside>
                <main class="combat-style-mastery-panel">
                    <div class="combat-style-mastery-heading">
                        <div class="combat-style-mastery-icon" aria-hidden="true">${getStyleIconGlyph(selectedStyle.icon)}</div>
                        <div>
                            <h3>${escapeHtml(selectedStyle.name)}</h3>
                            <p>${escapeHtml(selectedStyle.description)}</p>
                            <div class="combat-style-base-pattern">Base pattern: ${escapeHtml(selectedStyle.attackPreview)}</div>
                        </div>
                    </div>
                    <div class="combat-mastery-tiers">${buildMasteryTiers(selectedStyle, gatingMessage)}</div>
                </main>
            </div>
        </div>`;

    screen.querySelectorAll('[data-style-select]').forEach(card => {
        const select = () => {
            selectedCombatStyleId = card.dataset.styleSelect;
            renderCombatStylesScreen();
        };
        card.addEventListener('click', event => {
            if (event.target.closest('[data-style-equip]')) return;
            select();
        });
        card.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            select();
        });
    });

    screen.querySelectorAll('[data-style-equip]').forEach(button => {
        button.addEventListener('click', event => {
            event.stopPropagation();
            const styleId = button.dataset.styleEquip;
            const result = equipCombatSkill(player, styleId);
            if (!result.ok) logMessage(result.reason || 'Could not equip combat style.');
            else logMessage(`Active Combat Style set to ${styles.find(style => style.id === styleId)?.name || styleId}.`);
            renderCombatStylesScreen();
        });
    });

    screen.querySelectorAll('[data-style-choice]').forEach(button => {
        button.addEventListener('click', () => {
            const result = allocateStyleNode(player, selectedStyle.id, button.dataset.styleChoice);
            if (!result.ok) logMessage(result.reason || 'Could not select that mastery.');
            else logMessage(result.replaced ? 'Mastery choice replaced.' : 'Mastery choice selected.');
            renderCombatStylesScreen();
        });
    });

    screen.querySelectorAll('[data-clear-tier]').forEach(button => {
        button.addEventListener('click', () => {
            const selected = getSelectedStyleChoice(player, selectedStyle.id, Number(button.dataset.clearTier));
            if (!selected) return;
            const result = refundStyleNode(player, selectedStyle.id, selected.id);
            if (!result.ok) logMessage(result.reason || 'Could not clear that mastery tier.');
            renderCombatStylesScreen();
        });
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
