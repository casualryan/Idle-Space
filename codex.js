(function initializeCodex() {
    const STATIC_PAGES = {
        'new-player': {
            title: 'Welcome to Corebound',
            sections: [
                ['Getting Started', 'A new character begins with a Broken Phase Sword and 1,000 credits. Equip a weapon, choose a combat style, and enter a Delve.'],
                ['Equipment', 'Weapons, armor, off-hands, chips, and up to four bionics shape your build. An unequipped item grants no stats, passives, or triggered effects. Bionic Sync amplifies static stats from bionics; Bionic Efficiency increases bionic triggered-effect chances.']
            ]
        },
        'combat': {
            title: 'Combat',
            sections: [
                ['Automatic Attacks', 'Combatants attack automatically according to attack speed. Precision improves damage rolls against enemy Deflection. Critical hits use the attacker’s critical multiplier.'],
                ['Encounter Boundaries', 'Each fight creates a fresh enemy at full Health and Energy Shield. Buffs and debuffs are cleared before the next enemy appears.'],
                ['Damage-Type Debuffs', 'The dominant damage type of a hit has a base chance to apply one of its two inherent debuffs. Enemies and players follow the same application rules.']
            ]
        },
        'damage-types': {
            title: 'Damage Types',
            sections: [
                ['Physical', 'Kinetic and Slashing damage are reduced by Physical Resistance.'],
                ['Elemental', 'Pyro, Cryo, and Electric damage are reduced by Elemental Resistance.'],
                ['Chemical', 'Corrosive and Radiation damage are reduced by Chemical Resistance.']
            ]
        },
        'delve': {
            title: 'Delves',
            sections: [
                ['Temporary Loot', 'Drops and credits remain in the Delve Bag until the entire delve is completed. Successful-delve rewards then move to the Delve Claim Cache, where exact rolled items can be claimed individually or all at once.'],
                ['Claim Cache', 'Inventory overflow remains in the cache. Remaining items may be sold or discarded, but starting another delve permanently destroys every unclaimed item and credit. Auto re-deploy pauses while rewards are waiting.'],
                ['Failure and Fleeing', 'Death and voluntary retreat both end the delve and destroy everything in its temporary bag.'],
                ['Saving During a Delve', 'Loading a save restarts the current encounter with a fresh enemy while preserving completed encounters and the exact contents of the Delve Bag.']
            ]
        },
        'fabrication': {
            title: 'Fabrication',
            sections: [
                ['Crafting', 'The fabricator runs exactly one job at a time. Every fabrication takes five seconds. Ingredients are reserved when fabrication begins, and cancelling returns all reserved ingredients.'],
                ['Requirements', 'A learned recipe may be fabricated at any level. Items whose level requirement is not met can be crafted and stored, but cannot yet be equipped.'],
                ['Saving', 'Active fabrications preserve their remaining time when saved and do not advance while the game is closed.']
            ]
        },
        'mining': {
            title: 'Mining',
            sections: [
                ['Activities', 'Mining gathers fabrication materials and awards Mining experience. Only one primary non-combat activity can run at a time.'],
                ['Saving', 'Mining pauses while the game is closed and resumes from its saved progress when the game is loaded.']
            ]
        }
    };

    const CATEGORY_DEFINITIONS = [
        ['new-player', 'New Player'],
        ['combat', 'Combat'],
        ['damage-types', 'Damage Types'],
        ['debuffs', 'Debuffs'],
        ['delve', 'Delves'],
        ['fabrication', 'Fabrication'],
        ['mining', 'Mining'],
        ['enemies', 'Enemies']
    ];

    function titleCase(value) {
        return String(value || '').replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
    }

    function appendTextSection(container, subtitle, text) {
        const section = document.createElement('section');
        section.className = 'codex-section';
        const heading = document.createElement('h3');
        heading.className = 'codex-subtitle';
        heading.textContent = subtitle;
        const body = document.createElement('p');
        body.className = 'codex-text';
        body.textContent = text;
        section.append(heading, body);
        container.appendChild(section);
    }

    function appendPageTitle(container, text) {
        const title = document.createElement('h2');
        title.className = 'codex-title';
        title.textContent = text;
        container.appendChild(title);
    }

    function renderStaticPage(container, page) {
        appendPageTitle(container, page.title);
        page.sections.forEach(([subtitle, text]) => appendTextSection(container, subtitle, text));
    }

    function renderDebuffs(container) {
        appendPageTitle(container, 'Debuffs');
        const baseChance = Math.round(Number(window.debuffBaseChance || 0) * 100);
        appendTextSection(
            container,
            'Application',
            `The dominant damage type has a ${baseChance}% base chance per hit to apply one of its two inherent debuffs. Players and enemies use the same rule.`
        );
        const definitions = Object.entries(window.debuffs || {});
        const grouped = new Map();
        definitions.forEach(([id, debuff]) => {
            const group = debuff.damageType || 'Special';
            if (!grouped.has(group)) grouped.set(group, []);
            grouped.get(group).push([id, debuff]);
        });

        grouped.forEach((entries, damageType) => {
            const section = document.createElement('section');
            section.className = 'codex-section';
            const heading = document.createElement('h3');
            heading.className = 'codex-subtitle';
            heading.textContent = titleCase(damageType);
            section.appendChild(heading);

            entries.forEach(([id, debuff]) => {
                const card = document.createElement('div');
                card.className = 'codex-enemy';
                const name = document.createElement('h4');
                name.textContent = debuff.name || titleCase(id);
                const description = document.createElement('p');
                description.className = 'codex-text';
                description.textContent = debuff.description || 'No description recorded.';
                const meta = document.createElement('p');
                meta.className = 'codex-text';
                const duration = debuff.duration > 0 ? `${debuff.duration}s` : 'trigger/encounter based';
                const stackRule = debuff.stackable
                    ? (debuff.variableMaxStacks
                        ? `Base cap ${debuff.maxStacks || 1}; equipment can raise it`
                        : `Stacks to ${debuff.maxStacks || 'multiple'}`)
                    : 'Does not stack';
                meta.textContent = `${debuff.inherent === false ? 'Item-specific' : 'Inherent'} · ${stackRule} · ${duration}`;
                card.append(name, description, meta);
                section.appendChild(card);
            });
            container.appendChild(section);
        });
    }

    function getPoolItems(poolName) {
        if (typeof LOOT_POOLS === 'undefined') return [];
        return Array.isArray(LOOT_POOLS[poolName]?.items) ? LOOT_POOLS[poolName].items : [];
    }

    function renderEnemyCard(enemy) {
        const card = document.createElement('details');
        card.className = 'codex-enemy';
        const summary = document.createElement('summary');
        summary.className = 'codex-enemy-header';
        summary.textContent = `${enemy.name} · Level ${enemy.level || 1}`;
        card.appendChild(summary);

        const stats = document.createElement('div');
        stats.className = 'codex-enemy-details';
        appendTextSection(stats, 'Core Stats', `Health ${enemy.health || 0} · Energy Shield ${enemy.energyShield || 0} · Attack Speed ${enemy.attackSpeed || 0} · Critical Chance ${Math.round((enemy.criticalChance || 0) * 100)}% · Critical Multiplier ${enemy.criticalMultiplier || 1}x · Experience ${enemy.experienceValue || 0}`);
        if (enemy.description) appendTextSection(stats, 'Description', enemy.description);

        const damage = Object.entries(enemy.damageTypes || {})
            .map(([type, value]) => `${titleCase(type)} ${typeof value === 'object' ? `${value.min}-${value.max}` : value}`)
            .join(' · ') || 'None';
        appendTextSection(stats, 'Damage', damage);

        const defenses = Object.entries(enemy.defenseTypes || {})
            .map(([type, value]) => `${titleCase(type)} ${typeof value === 'object' ? `${value.min}-${value.max}` : value}%`)
            .join(' · ') || 'None';
        appendTextSection(stats, 'Resistances', defenses);

        const config = enemy.lootConfig;
        if (config) {
            const poolNames = [...new Set(Object.values(config.poolsByTier || {}).flat())];
            const lootLines = poolNames.map(poolName => {
                const entries = getPoolItems(poolName)
                    .map(item => `${item.itemName} (weight ${item.weight || 1})`)
                    .join(', ');
                return `${poolName}: ${entries || 'No entries'}`;
            });
            appendTextSection(
                stats,
                'Loot Tables',
                `Drop chance ${Math.round((config.baseDropChance || 0) * 100)}% · ${config.minItems || 0}-${config.maxItems || 0} item(s). ${lootLines.join(' | ') || 'No item pools.'}`
            );
        }

        card.appendChild(stats);
        return card;
    }

    function renderEnemies(container) {
        appendPageTitle(container, 'Enemy Database');
        const search = document.createElement('input');
        search.type = 'search';
        search.id = 'enemy-search';
        search.placeholder = 'Search enemies…';
        search.className = 'codex-filter';
        const list = document.createElement('div');
        list.id = 'codex-enemy-list';
        container.append(search, list);

        const draw = () => {
            const query = search.value.trim().toLowerCase();
            list.replaceChildren(...(window.enemies || [])
                .filter(enemy => !query || enemy.name.toLowerCase().includes(query))
                .sort((a, b) => (a.level || 1) - (b.level || 1) || a.name.localeCompare(b.name))
                .map(renderEnemyCard));
        };
        search.addEventListener('input', draw);
        draw();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const screen = document.getElementById('codex-screen');
        if (!screen) return;
        screen.replaceChildren();

        const categories = document.createElement('nav');
        categories.id = 'codex-categories';
        categories.className = 'codex-categories';
        const content = document.createElement('div');
        content.id = 'codex-content';
        content.className = 'codex-content';
        screen.append(categories, content);

        const display = categoryId => {
            content.replaceChildren();
            categories.querySelectorAll('.codex-category-button').forEach(button => {
                button.classList.toggle('active', button.dataset.category === categoryId);
            });
            if (categoryId === 'debuffs') renderDebuffs(content);
            else if (categoryId === 'enemies') renderEnemies(content);
            else renderStaticPage(content, STATIC_PAGES[categoryId]);
        };

        CATEGORY_DEFINITIONS.forEach(([id, label]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'codex-category-button';
            button.dataset.category = id;
            button.textContent = label;
            button.addEventListener('click', () => display(id));
            categories.appendChild(button);
        });

        display('new-player');
    });
})();
