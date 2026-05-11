import {tokenSays} from '../token-quips.js';
import {says} from './says.js';
import {TokenSaysSayForm} from './say-form.js';
import {parseSeparator} from './helpers.js';

export var lastSearch = '';

export let TokenSaysSettingsConfig;

Hooks.once('init', () => {
    const { ApplicationV2 } = foundry.applications.api;
    const HandlebarsApplicationMixin =
        foundry.applications.api.HandlebarsApplicationMixin ??
        foundry.applications.HandlebarsApplicationMixin;

    TokenSaysSettingsConfig = class TokenSaysSettingsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
        static DEFAULT_OPTIONS = {
            id: "token-quips-rules",
            classes: ["sheet", "token-quips"],
            window: { title: "TOKENSAYS.setting.tokenSaysRules.name" },
            position: { width: 700 }
        };

        static PARTS = {
            form: { template: tokenSays.TEMPLATES.SAYS }
        };

        async _prepareContext(options) {
            const isGM = game.user.isGM;
            let rawSays;
            if (isGM) {
                rawSays = { ...says._says, ...says._playerSays };
            } else {
                rawSays = says._mySays;
            }
            const saysList = Object.values(rawSays)
                .map(s => {
                    const instance = says._toClass(s);
                    if (isGM && instance.ownerId) {
                        instance.ownerName = game.users.get(instance.ownerId)?.name ?? 'Unknown Player';
                    }
                    return instance;
                })
                .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''));

            return { says: saysList, isGM, search: lastSearch };
        }

        _onRender(context, options) {
            tokenSays.TokenSaysSettingsConfig = this;
            const html = this.element;

            html.querySelectorAll('[data-action]').forEach(el => {
                el.addEventListener('click', (event) => this._handleButtonClick(event));
            });

            html.querySelector('#token-quips-search-clear')
                ?.addEventListener('click', (e) => this._clearFilter(e));
            html.querySelector('#token-quips-search-input')
                ?.addEventListener('input', (e) => this._preFilter(e));
            html.querySelector('#token-quips-export-config')
                ?.addEventListener('click', () => this._exportSettingsToJSON());
            html.querySelector('#token-quips-import-config')
                ?.addEventListener('click', () => this._importSettingsFromJSON());

            // Active-status toggles handled directly (no form submit needed)
            html.querySelectorAll('input.rule-active[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const container = e.target.closest('[data-id]');
                    if (!container) return;
                    const id = container.dataset.id;
                    const ownerId = container.dataset.owner ?? '';
                    this._updateStatus(id, ownerId, e.target.checked);
                });
            });

            this._filter();
        }

        async _updateStatus(id, ownerId, status) {
            if (ownerId) {
                if (game.user.isGM) {
                    await says.updatePlayerSayForUser(ownerId, id, { isActive: status });
                } else {
                    await says.updatePlayerSay(id, { isActive: status });
                }
            } else {
                await says.updateSayStatus(id, status);
            }
        }

        async _handleButtonClick(event) {
            const el = event.currentTarget;
            const action = el.dataset.action;
            const container = el.closest('[data-id]');
            const sayId = container?.dataset?.id;
            const ownerId = container?.dataset?.owner ?? '';
            const isPlayerSaying = ownerId !== '';

            switch (action) {
                case 'copy': {
                    let newId, formOwnerId;
                    if (game.user.isGM && !isPlayerSaying) {
                        newId = await says.copySay(sayId);
                        formOwnerId = '';
                    } else if (game.user.isGM && isPlayerSaying) {
                        // GM copies a player saying → becomes a GM saying
                        newId = await says.copySayFromPlayer(sayId);
                        formOwnerId = '';
                    } else {
                        newId = await says.copyPlayerSay(sayId);
                        formOwnerId = game.userId;
                    }
                    this.refresh();
                    new TokenSaysSayForm(newId, formOwnerId).render(true);
                    break;
                }
                case 'create': {
                    if (game.user.isGM) {
                        const sy = await says.newRollTableSay();
                        this.refresh();
                        new TokenSaysSayForm(sy.id, '').render(true);
                    } else {
                        const sy = await says.newPlayerSay('rollTable');
                        this.refresh();
                        new TokenSaysSayForm(sy.id, game.userId).render(true);
                    }
                    break;
                }
                case 'edit': {
                    new TokenSaysSayForm(sayId, ownerId).render(true);
                    break;
                }
                case 'delete': {
                    const DialogV2 = foundry.applications.api.DialogV2;
                    DialogV2.confirm({
                        window: { title: game.i18n.localize("TOKENSAYS.clear") },
                        content: `<p>${game.i18n.localize("TOKENSAYS.confirm")}</p>`,
                        yes: {
                            callback: async () => {
                                try {
                                    if (game.user.isGM && !isPlayerSaying) {
                                        await says.deleteSay(sayId);
                                        this.refresh();
                                    } else if (game.user.isGM && isPlayerSaying) {
                                        // Refresh after the updateUser socket event propagates
                                        // back to the GM client so _playerSays reads fresh data.
                                        Hooks.once('updateUser', (user) => {
                                            if (user.id === ownerId) this.refresh();
                                        });
                                        await says.deletePlayerSayForUser(ownerId, sayId);
                                    } else {
                                        await says.deletePlayerSay(sayId);
                                        this.refresh();
                                    }
                                } catch (err) {
                                    console.error('Token Quips | Error deleting saying:', err);
                                    ui.notifications?.error('Token Quips: Failed to delete saying.');
                                }
                            }
                        }
                    });
                    break;
                }
                default: break;
            }
        }

        async close(options = {}) {
            tokenSays.TokenSaysSettingsConfig = null;
            return super.close(options);
        }

        refresh() {
            this.render({ force: true });
        }

        _preFilter(event) {
            this.setLastSearch(event.target.value);
            this._filter();
        }

        _filter() {
            const html = this.element;
            if (!html) return;

            const clear = html.querySelector("#token-quips-search-clear");
            const searchBox = html.querySelector("#token-quips-search-input");

            if (lastSearch !== '') {
                clear?.classList.remove('hidden');
                searchBox?.classList.add('outline');
            } else {
                clear?.classList.add('hidden');
                searchBox?.classList.remove('outline');
            }

            html.querySelectorAll("form.token-quips .rule").forEach(el => el.style.display = 'none');
            html.querySelectorAll("form.token-quips .rule .rule-name .ts-search-name").forEach(el => {
                const text = el.textContent ?? '';
                if (!lastSearch || parseSeparator(lastSearch).find(s =>
                    (!text.startsWith('not:') && text.toLowerCase().includes(s.toLowerCase())) ||
                    (text.startsWith('not:') && !text.toLowerCase().includes(s.toLowerCase()))
                )) {
                    el.closest('.rule').style.display = '';
                }
            });
        }

        _clearFilter(event) {
            event.preventDefault();
            const searchInput = this.element?.querySelector("#token-quips-search-input");
            if (searchInput) searchInput.value = '';
            this.setLastSearch('');
            this._filter();
        }

        setLastSearch(search) {
            lastSearch = search;
        }

        async _exportSettingsToJSON() {
            await says.deleteSay("rules");
            saveDataToFile(JSON.stringify(says._says, null, 2), "text/json", `fvtt-token-quips-rules.json`);
        }

        async _importFromJSON(json) {
            const data = JSON.parse(json);
            tokenSays.log(false, 'JSON Import Parse Complete ', data);
            let response = await says.importSays(data);
            tokenSays.log(false, 'Rules Import Complete ', response);
            this.refresh();
            if (response) {
                let info = game.i18n.localize("TOKENSAYS.setting.import.complete")
                    + ': ' + response.added.length + ' ' + game.i18n.localize("TOKENSAYS.setting.import.success")
                    + ', ' + response.error.length + ' ' + game.i18n.localize("TOKENSAYS.setting.import.error")
                    + ', ' + response.skipped.length + ' ' + game.i18n.localize("TOKENSAYS.setting.import.skipped");
                ui.notifications?.info(info);
            }
            return response;
        }

        async _importSettingsFromJSON() {
            const options = { name: "Token Quips", entity: "token-quips" };
            const content = await renderTemplate("templates/apps/import-data.html", options);
            const DialogV2 = foundry.applications.api.DialogV2;
            DialogV2.prompt({
                window: { title: game.i18n.localize("TOKENSAYS.setting.import.title") },
                content,
                ok: {
                    icon: '<i class="fas fa-file-import"></i>',
                    label: game.i18n.localize("TOKENSAYS.import"),
                    callback: (event, button, dialog) => {
                        const form = dialog.querySelector("form");
                        if (!form?.data?.files?.length) {
                            return ui.notifications?.error(game.i18n.localize("TOKENSAYS.setting.import.noFile"));
                        }
                        readTextFromFile(form.data.files[0]).then(json => this._importFromJSON(json));
                    }
                }
            });
        }
    };
});
