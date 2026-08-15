(function initializeCodex() {
    const STATIC_PAGES = {
        'new-player': {
            title: 'Welcome to Corebound',
            sections: [
                ['Getting Started', 'A new character begins with a Broken Phase Sword and 1,000 Feed. Equip a weapon, choose a combat style, and choose a Patrol or Operation.'],
                ['Equipment', 'Weapons, armor, off-hands, chips, and up to four bionics shape your build. An unequipped item grants no stats, passives, or triggered effects. Bionic Sync amplifies static stats from bionics; Bionic Efficiency increases bionic triggered-effect chances.']
            ]
        },
        'combat': {
            title: 'Combat',
            sections: [
                ['Automatic Attacks', 'Combatants attack automatically according to attack speed. Precision improves damage rolls against enemy Deflection. Critical hits use the attacker’s critical multiplier.'],
                ['Targeting', 'A fight may contain up to six enemies. Click an enemy card to select it; combat defaults to the leftmost living target. Taunts temporarily redirect your attacks without changing that selection, so attacks return to your chosen target when the taunt expires.'],
                ['Encounter Boundaries', 'Each fight creates a fresh enemy group at full Health and Energy Shield. Your Health persists between deployment encounters, while your Energy Shield reconstitutes to full after the entire group is defeated. Buffs and debuffs are cleared between fights.'],
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
        'passives': {
            title: 'Passive Network',
            sections: [
                ['Allocation', 'The network begins at the central Core Origin. Spend one point on a connected node to extend your route. You gain two passive points per level, including two at character creation.'],
                ['Seven Sectors', 'Kinetic, Slashing, Corrosive, Radiation, Electric, Cryo, and Pyro each contain branching themed clusters and outer specialist wheels. Life and Energy Shield are distributed throughout every sector. Border paths blend neighboring identities.'],
                ['Node Classes', 'Travel nodes connect compact clusters. Minor nodes build an idea, Notables reward focused investment, Keystones create powerful tradeoffs, and bridge nodes open cross-sector routes.'],
                ['Refunds and Equipment', 'Allocation and refunding are currently free, but a refund cannot disconnect any allocated outer node. Some equipment grants ranks to named scalable nodes without allocating or connecting them.']
            ]
        },
        'delve': {
            title: 'Deployments',
            sections: [
                ['Patrols', 'Patrols use authored sectors, repeat until stopped or defeated, secure every reward immediately, and offer reliable but lower rewards. Auto-redeploy can restart the same Patrol after defeat, but never after manual Stop.'],
                ['Operations', 'The terminal maintains three persistent generated offers with stable seeds, level-appropriate enemies, finite encounter counts, and visible guaranteed rewards. Only a successful clear replaces an offer. Occasional events alter the remaining route, and one Core may be consumed at launch for an Operation-wide effect.'],
                ['Operation Bag', 'Operation drops remain at risk until the run succeeds. Materials, Cores, Caches, and Feed are then stored automatically; ordinary items use the Operation Claim Cache when they cannot be claimed safely.'],
                ['Saving', 'Loading preserves the generated Operation board and exact active offer state. It restarts the current encounter with a fresh enemy group while preserving completed encounters, run modifiers, and secured or staged rewards. Character Details also lists the last ten completed Operation seeds.']
            ]
        },
        'fabrication': {
            title: 'Fabrication',
            sections: [
                ['Crafting', 'The fabricator runs exactly one job at a time. Every fabrication takes five seconds and consumes Feed plus its listed materials. Cancelling returns every reserved cost.'],
                ['Recipe Economy', 'Most recipes use a bulk foundation of fasteners, wiring, and one slot-appropriate construction material. Higher-level recipes require larger stockpiles rather than wider lists of unrelated parts.'],
                ['Thematic Components', 'Each damage family has a common, advanced, and apex material. Later matching enemies continue dropping earlier components in larger stacks. Exceptional technology appears only in equipment with unusual identities.'],
                ['Requirements', 'A learned recipe may be fabricated at any level. Items whose level requirement is not met can be crafted and stored, but cannot yet be equipped. Each listed ingredient includes its earliest documented acquisition source.'],
                ['Saving', 'Active fabrications preserve their remaining time when saved and do not advance while the game is closed.']
            ]
        },
        'modification': {
            title: 'Flux Modification',
            sections: [
                ['Binding', 'An item may permanently bind exactly one generated modifier as its Flux target. Other modifiers can never be rerolled on that item.'],
                ['Rerolling', 'Flux of the modifier’s grade rerolls only its value within the same grade range. Item modification is unavailable during Patrols and Operations.'],
                ['Caches and Cores', 'Caches can be opened for uncertain themed rewards or sold unopened for guaranteed Feed. Cores drop from enemies, stack in dedicated storage, and are consumed when an Operation begins.']
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
        ['weapon-types', 'Weapon Types'],
        ['damage-types', 'Damage Types'],
        ['passives', 'Passives'],
        ['debuffs', 'Debuffs'],
        ['delve', 'Deployments'],
        ['modification', 'Flux Modification'],
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

    function renderWeaponTypes(container) {
        appendPageTitle(container, 'Weapon Types');
        const tabs = document.createElement('nav');
        tabs.className = 'codex-subpages';
        const page = document.createElement('div');
        page.className = 'codex-subpage-content';
        container.append(tabs, page);

        const definitions = window.coreboundWeaponTaxonomy?.families || {};
        const profiles = window.coreboundPropagation?.profiles || {};
        const familyOrder = ['blades', 'impact', 'sidearms', 'rifles', 'projectors', 'ordnance', 'conduits'];

        const renderOverview = () => {
            page.replaceChildren();
            appendTextSection(
                page,
                'Weapon Families',
                'A weapon family is its stable mechanical identity. Display names and tags may vary, but the family determines its intrinsic propagation behavior.'
            );
            const grid = document.createElement('div');
            grid.className = 'codex-weapon-grid';
            for (const family of familyOrder) {
                const definition = definitions[family];
                const profile = profiles[family];
                const card = document.createElement('section');
                card.className = 'codex-weapon-family';
                const heading = document.createElement('h3');
                heading.textContent = definition?.label || titleCase(family);
                const description = document.createElement('p');
                description.textContent = definition?.description || 'No chassis notes recorded.';
                const propagation = document.createElement('strong');
                propagation.textContent = `${profile?.label || 'Propagation'} · ${Math.round(Number(profile?.damageCoefficient || 0) * 100)}% secondary damage`;
                card.append(heading, description, propagation);
                grid.appendChild(card);
            }
            page.appendChild(grid);
        };

        const renderPropagation = () => {
            page.replaceChildren();
            appendTextSection(
                page,
                'Propagation',
                'Every equipped weapon hits its primary target and one additional target when possible. Propagation Targets adds more secondaries, to a maximum of five. Secondary hits reuse the original damage roll and critical result, then check each target’s defenses independently.'
            );
            appendTextSection(
                page,
                'Triggered Effects',
                'All propagation types use a 30% trigger coefficient for inherent debuffs and other on-hit or on-critical effects.'
            );
            const table = document.createElement('table');
            table.className = 'codex-propagation-table';
            table.innerHTML = '<thead><tr><th>Weapon family</th><th>Propagation</th><th>Damage</th><th>Targeting</th></tr></thead>';
            const body = document.createElement('tbody');
            const targeting = {
                blades: 'Cleave through the target row, then overflow to the opposite row.',
                impact: 'Splash through orthogonally connected enemies.',
                sidearms: 'Fire sequentially at random unique enemies.',
                rifles: 'Chain to an adjacent living enemy after each hit; later chains may revisit a target.',
                projectors: 'Fire sequentially at random unique enemies.',
                ordnance: 'Detonate into random unique enemies.',
                conduits: 'Pulse into random unique enemies at once.'
            };
            for (const family of familyOrder) {
                const definition = definitions[family];
                const profile = profiles[family];
                const row = document.createElement('tr');
                [
                    definition?.label || titleCase(family),
                    profile?.label || '—',
                    `${Math.round(Number(profile?.damageCoefficient || 0) * 100)}%`,
                    targeting[family]
                ].forEach(value => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                });
                body.appendChild(row);
            }
            table.appendChild(body);
            page.appendChild(table);
        };

        const subpages = [
            ['overview', 'Overview', renderOverview],
            ['propagation', 'Propagation', renderPropagation]
        ];
        const displaySubpage = (id, render) => {
            tabs.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.subpage === id));
            render();
        };
        subpages.forEach(([id, label, render]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.subpage = id;
            button.textContent = label;
            button.addEventListener('click', () => displaySubpage(id, render));
            tabs.appendChild(button);
        });
        displaySubpage('overview', renderOverview);
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

    const DAMAGE_COLORS = {
        kinetic: '#f2b84b',
        slashing: '#ff667d',
        pyro: '#ff7a3d',
        cryo: '#62d9ff',
        electric: '#ffe169',
        corrosive: '#72e58a',
        radiation: '#c982ff'
    };

    const LEVEL_BANDS = [
        { id: 'early', label: 'Early Game', range: 'Levels 1–10', matches: level => level <= 10 },
        { id: 'mid', label: 'Midgame', range: 'Levels 11–30', matches: level => level >= 11 && level <= 30 },
        { id: 'late', label: 'Late Game', range: 'Levels 31–50', matches: level => level >= 31 && level <= 50 },
        { id: 'endgame', label: 'Endgame', range: 'Levels 51+', matches: level => level >= 51 }
    ];

    function getLevelBand(level) {
        return LEVEL_BANDS.find(band => band.matches(Number(level) || 1)) || LEVEL_BANDS[0];
    }

    function formatRange(value) {
        if (value && typeof value === 'object') return `${value.min ?? 0}–${value.max ?? value.min ?? 0}`;
        return String(value ?? 0);
    }

    function getEnemyAreas(enemyName) {
        if (typeof locations === 'undefined') return [];
        return locations
            .filter(location => location.enemies?.some(entry => entry.name === enemyName))
            .map(location => location.name);
    }

    function getLootTierDefinition(tierId) {
        if (typeof LOOT_TIERS === 'undefined') return null;
        return Object.values(LOOT_TIERS).find(tier => Number(tier.id) === Number(tierId)) || null;
    }

    function calculateItemRollOdds(config, enemy) {
        const viableTiers = Object.entries(config?.poolsByTier || {}).map(([tierId, poolNames]) => {
            const pools = (poolNames || [])
                .map(name => ({ name, items: getPoolItems(name) }))
                .filter(pool => pool.items.length > 0);
            const tier = getLootTierDefinition(tierId);
            return { tierId: Number(tierId), tier, pools, weight: Number(tier?.chance) || 0 };
        }).filter(entry => entry.pools.length > 0);

        const totalTierWeight = viableTiers.reduce((sum, entry) => sum + entry.weight, 0) || viableTiers.length || 1;
        const odds = new Map();

        viableTiers.forEach(entry => {
            const tierChance = (entry.weight || 1) / totalTierWeight;
            const poolChance = 1 / entry.pools.length;
            entry.pools.forEach(pool => {
                const totalItemWeight = pool.items.reduce((sum, item) => sum + (Number(item.weight) || 1), 0) || 1;
                pool.items.forEach(item => {
                    const itemChance = tierChance * poolChance * ((Number(item.weight) || 1) / totalItemWeight);
                    const quantityRange = typeof getLootQuantityRange === 'function'
                        ? getLootQuantityRange(item, enemy)
                        : { min: Number(item.minQuantity) || 1, max: Number(item.maxQuantity) || Number(item.minQuantity) || 1 };
                    const previous = odds.get(item.itemName) || {
                        name: item.itemName,
                        chance: 0,
                        tiers: new Set(),
                        minQuantity: quantityRange.min,
                        maxQuantity: quantityRange.max
                    };
                    previous.chance += itemChance;
                    previous.tiers.add(entry.tier?.name || `Tier ${entry.tierId}`);
                    previous.minQuantity = Math.min(previous.minQuantity, quantityRange.min);
                    previous.maxQuantity = Math.max(previous.maxQuantity, quantityRange.max);
                    odds.set(item.itemName, previous);
                });
            });
        });

        return [...odds.values()]
            .map(entry => ({ ...entry, tiers: [...entry.tiers] }))
            .sort((a, b) => b.chance - a.chance || a.name.localeCompare(b.name));
    }

    function appendReadout(container, label, value, accent = '') {
        const row = document.createElement('div');
        row.className = 'enemy-readout';
        if (accent) row.style.setProperty('--readout-accent', accent);
        const name = document.createElement('span');
        name.textContent = label;
        const amount = document.createElement('strong');
        amount.textContent = value;
        row.append(name, amount);
        container.appendChild(row);
    }

    function renderEnemyCard(enemy) {
        const card = document.createElement('details');
        card.className = 'codex-enemy';
        const primaryDamageType = Object.keys(enemy.damageTypes || {})[0] || 'kinetic';
        const accent = DAMAGE_COLORS[primaryDamageType] || '#00ffcc';
        card.dataset.damage = primaryDamageType;
        card.style.setProperty('--enemy-accent', accent);

        const summary = document.createElement('summary');
        summary.className = 'codex-enemy-header';
        const heading = document.createElement('div');
        heading.className = 'enemy-summary-heading';
        const name = document.createElement('strong');
        name.textContent = enemy.name;
        const chips = document.createElement('div');
        chips.className = 'enemy-summary-chips';
        [
            `LV ${enemy.level || 1}`,
            titleCase(enemy.archetype || 'standard'),
            titleCase(primaryDamageType)
        ].forEach((label, index) => {
            const chip = document.createElement('span');
            chip.textContent = label;
            if (index === 2) chip.className = 'damage-chip';
            chips.appendChild(chip);
        });
        heading.append(name, chips);

        const preview = document.createElement('div');
        preview.className = 'enemy-summary-preview';
        const totalDamage = Object.values(enemy.damageTypes || {}).reduce((sum, value) => {
            if (value && typeof value === 'object') return sum + ((Number(value.min) || 0) + (Number(value.max) || 0)) / 2;
            return sum + (Number(value) || 0);
        }, 0);
        preview.innerHTML = `<span><b>${enemy.health || 0}</b> HP</span><span><b>${totalDamage.toFixed(totalDamage % 1 ? 1 : 0)}</b> HIT</span><span><b>${Math.round((enemy.lootConfig?.baseDropChance || 0) * 100)}%</b> LOOT</span>`;
        summary.append(heading, preview);
        card.appendChild(summary);

        const stats = document.createElement('div');
        stats.className = 'codex-enemy-details';
        const areas = getEnemyAreas(enemy.name);
        const overview = document.createElement('div');
        overview.className = 'enemy-overview';
        const description = document.createElement('p');
        description.textContent = enemy.description || 'No field notes recorded.';
        const sector = document.createElement('span');
        sector.textContent = areas.length ? `Encountered in ${areas.join(', ')}` : 'No known deployment sector';
        overview.append(description, sector);
        stats.appendChild(overview);

        const columns = document.createElement('div');
        columns.className = 'enemy-data-columns';
        const corePanel = document.createElement('section');
        corePanel.innerHTML = '<h4>Combat Profile</h4>';
        appendReadout(corePanel, 'Integrity', String(enemy.health || 0), '#48bf91');
        appendReadout(corePanel, 'Energy Shield', String(enemy.energyShield || 0), '#788bff');
        appendReadout(corePanel, 'Attack Speed', `${Number(enemy.attackSpeed || 0).toFixed(2)}/s`, '#ffd166');
        appendReadout(corePanel, 'Critical Chance', `${Math.round((enemy.criticalChance || 0) * 100)}%`, '#ff667d');
        appendReadout(corePanel, 'Critical Power', `${enemy.criticalMultiplier || 1}×`, '#ff667d');
        appendReadout(corePanel, 'Experience', String(enemy.experienceValue || 0), '#00ffcc');

        const offensePanel = document.createElement('section');
        offensePanel.innerHTML = '<h4>Damage Output</h4>';
        Object.entries(enemy.damageTypes || {}).forEach(([type, value]) => {
            appendReadout(offensePanel, titleCase(type), formatRange(value), DAMAGE_COLORS[type] || '#fff');
        });

        const defensePanel = document.createElement('section');
        defensePanel.innerHTML = '<h4>Resistance Matrix</h4>';
        Object.entries(enemy.defenseTypes || {}).forEach(([type, value]) => {
            appendReadout(defensePanel, titleCase(type).replace(' Resistance', ''), `${formatRange(value)}%`);
        });
        columns.append(corePanel, offensePanel, defensePanel);
        stats.appendChild(columns);

        const config = enemy.lootConfig;
        if (config) {
            const loot = document.createElement('section');
            loot.className = 'enemy-loot-panel';
            const lootHeader = document.createElement('div');
            lootHeader.className = 'enemy-loot-header';
            lootHeader.innerHTML = '<div><span>Recovery Analysis</span><h4>Possible Drops</h4></div>';
            const lootFacts = document.createElement('div');
            lootFacts.className = 'enemy-loot-facts';
            const currency = enemy.currencyDrop || {};
            [
                [`${Math.round((config.baseDropChance || 0) * 100)}%`, 'Base loot chance'],
                [`${config.minItems || 0}–${config.maxItems || 0}`, 'Items on success'],
                [currency.max > 0 ? `${currency.min || 0}–${currency.max}` : '—', 'Feed per kill']
            ].forEach(([value, label]) => {
                const fact = document.createElement('div');
                fact.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
                lootFacts.appendChild(fact);
            });
            lootHeader.appendChild(lootFacts);
            loot.appendChild(lootHeader);

            const oddsGrid = document.createElement('div');
            oddsGrid.className = 'enemy-loot-grid';
            calculateItemRollOdds(config, enemy).forEach(item => {
                const row = document.createElement('div');
                row.className = 'enemy-loot-item';
                const chance = item.chance * 100;
                const chanceLabel = chance < 1 ? chance.toFixed(1) : chance.toFixed(0);
                const quantityLabel = item.minQuantity === item.maxQuantity
                    ? `×${item.minQuantity}`
                    : `×${item.minQuantity}–${item.maxQuantity}`;
                row.innerHTML = `<div><strong>${item.name}</strong><span>${item.tiers.join(' / ')} · ${quantityLabel}</span></div><b>${chanceLabel}%</b>`;
                row.title = 'Chance for each generated item after this enemy succeeds on its base loot roll.';
                oddsGrid.appendChild(row);
            });
            loot.appendChild(oddsGrid);
            const note = document.createElement('p');
            note.className = 'enemy-loot-note';
            note.textContent = 'Percentages are per generated stack after the base loot roll. Stack ranges scale with enemy progression. Empowered enemies increase both loot chance and stack size.';
            loot.appendChild(note);
            stats.appendChild(loot);
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
        const bandFilter = document.createElement('select');
        bandFilter.className = 'codex-filter';
        bandFilter.innerHTML = '<option value="all">All level bands</option>' + LEVEL_BANDS.map(band => `<option value="${band.id}">${band.label}</option>`).join('');
        const damageFilter = document.createElement('select');
        damageFilter.className = 'codex-filter';
        damageFilter.innerHTML = '<option value="all">All damage types</option>' + Object.keys(DAMAGE_COLORS).map(type => `<option value="${type}">${titleCase(type)}</option>`).join('');
        const resultCount = document.createElement('span');
        resultCount.className = 'codex-result-count';
        const toolbar = document.createElement('div');
        toolbar.className = 'codex-enemy-toolbar';
        toolbar.append(search, bandFilter, damageFilter, resultCount);
        const list = document.createElement('div');
        list.id = 'codex-enemy-list';
        container.append(toolbar, list);

        const draw = () => {
            const query = search.value.trim().toLowerCase();
            const selectedBand = bandFilter.value;
            const selectedDamage = damageFilter.value;
            const matches = (window.enemies || [])
                .filter(enemy => {
                    const band = getLevelBand(enemy.level);
                    const damageTypes = Object.keys(enemy.damageTypes || {});
                    const searchable = `${enemy.name} ${enemy.description || ''} ${getEnemyAreas(enemy.name).join(' ')}`.toLowerCase();
                    return (!query || searchable.includes(query))
                        && (selectedBand === 'all' || band.id === selectedBand)
                        && (selectedDamage === 'all' || damageTypes.includes(selectedDamage));
                })
                .sort((a, b) => (a.level || 1) - (b.level || 1) || a.name.localeCompare(b.name));

            resultCount.textContent = `${matches.length} ${matches.length === 1 ? 'entry' : 'entries'}`;
            const groups = LEVEL_BANDS.map(band => ({ band, enemies: matches.filter(enemy => band.matches(enemy.level)) }))
                .filter(group => group.enemies.length > 0)
                .map(group => {
                    const section = document.createElement('section');
                    section.className = 'codex-enemy-band';
                    const heading = document.createElement('header');
                    heading.innerHTML = `<div><span>Threat Archive</span><h3>${group.band.label}</h3></div><strong>${group.band.range} · ${group.enemies.length} entries</strong>`;
                    const grid = document.createElement('div');
                    grid.className = 'codex-enemy-grid';
                    grid.append(...group.enemies.map(renderEnemyCard));
                    section.append(heading, grid);
                    return section;
                });

            if (groups.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'codex-empty-state';
                empty.textContent = 'No enemy records match the selected filters.';
                groups.push(empty);
            }
            list.replaceChildren(...groups);
        };
        search.addEventListener('input', draw);
        bandFilter.addEventListener('change', draw);
        damageFilter.addEventListener('change', draw);
        draw();
    }

    window.registerCoreboundInitializer(() => {
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
            else if (categoryId === 'weapon-types') renderWeaponTypes(content);
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
