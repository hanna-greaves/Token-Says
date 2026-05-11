import {ACTORTYPES, BYPASSNAMETYPES, determineMacroList, DOCUMENTNAMELABELS, GAMETYPEOPS, getWorldDocumentNameOptions, getCompendiumOps, getPolyglotLanguages, PLAYTYPE, PLAYTYPEROLLTABLE, WHISPEROPTIONS} from './constants.js';
import {tokenSays} from '../token-quips.js';
import {says} from './says.js';
import {parseSeparator, wildcardName} from './helpers.js';

/**
 * Form for editing an individual saying.
 * ownerId = '' → GM saying (stored in world settings)
 * ownerId = userId → player saying (stored in that user's flags)
 *
 * Defined inside Hooks.once('init') so foundry.applications.api is available.
 */
export let TokenSaysSayForm;

Hooks.once('init', () => {
    const { ApplicationV2 } = foundry.applications.api;
    // HandlebarsApplicationMixin may be at either path depending on the Foundry build
    const HandlebarsApplicationMixin =
        foundry.applications.api.HandlebarsApplicationMixin ??
        foundry.applications.HandlebarsApplicationMixin;

    TokenSaysSayForm = class TokenSaysSayForm extends HandlebarsApplicationMixin(ApplicationV2) {
        constructor(sayId, ownerId = '', options = {}) {
            super(options);
            this.sayId = sayId;
            this.ownerId = ownerId;
        }

        static DEFAULT_OPTIONS = {
            id: "token-quips-rules-rule",
            classes: ["sheet", "token-quips-rule"],
            window: { title: "TOKENSAYS.setting.tokenSaysRule.name" },
            position: { width: 400 }
            // form submission is handled explicitly in _onRender to ensure
            // e.preventDefault() fires regardless of ApplicationV2 build differences
        };

        static PARTS = {
            form: { template: tokenSays.TEMPLATES.SAY }
        };

        _determineWorldOptions(reacts) {
            return reacts ? (({ reacts, ...o }) => o)(GAMETYPEOPS) : (({ say, ...o }) => o)(GAMETYPEOPS);
        }

        async _prepareContext(options) {
            const sy = says.getSay(this.sayId);
            return {
                say: sy,
                actorTypeOps: ACTORTYPES,
                documentTypeOptions: this._determineWorldOptions(false),
                documentTypeReactsOptions: this._determineWorldOptions(true),
                compendiumListRollTable: getCompendiumOps('rollTable'),
                compendiumListAudio: getCompendiumOps('audio'),
                documentNameLabel: this.documentNameLabel(sy.documentType),
                documentNameOptions: this._createNameOptionsHTML(sy.documentType, sy.documentName, ''),
                documentNameWildCardSuppress: this._suppressDocumentNameWildcard(sy.documentType),
                documentNameReactsOptions: this._createNameOptionsHTML(sy.to?.documentType, sy.to?.documentName, 'to.'),
                documentNameReactsWildCardSuppress: this._suppressDocumentNameWildcard(sy.to?.documentType),
                hasAudioFileTitle: sy.audioFileTitle ? true : false,
                hasChatFileTitle: sy.chatFileTitle ? true : false,
                isAudio: sy.isAudio,
                isMove: (sy.hasAudio && sy.documentType === 'move') ? true : false,
                isReact: sy.documentType === 'reacts' ? true : false,
                languageOptions: getPolyglotLanguages(),
                macroOps: determineMacroList(),
                playOptions: PLAYTYPE,
                rollTablePlayOptions: PLAYTYPEROLLTABLE,
                responseDocumentNameLabel: this.documentNameLabel(sy.to?.documentType),
                whisperOps: WHISPEROPTIONS
            };
        }

        _onRender(context, options) {
            const html = this.element;

            // Explicitly intercept form submit so the browser never navigates away.
            // We do NOT rely on DEFAULT_OPTIONS.form.handler here because
            // HandlebarsApplicationMixin's _onRender form-listener setup varies
            // across Foundry builds. The explicit listener is authoritative.
            html.querySelector('form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const formData = new FormDataExtended(e.currentTarget);
                await TokenSaysSayForm._onSubmit.call(this, e, e.currentTarget, formData);
                await this.close();
            });

            // --- Tab navigation ---
            const tabItems = html.querySelectorAll('.tabs .item');
            const tabPanels = html.querySelectorAll('.tab');
            tabItems.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tabName = e.currentTarget.dataset.tab;
                    tabItems.forEach(t => t.classList.remove('active'));
                    tabPanels.forEach(t => t.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    html.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');
                });
            });

            // --- Event listeners ---
            html.querySelector('#token-quips-documenttype-value')
                ?.addEventListener('change', (e) => {
                    this._refreshDocumentNameOptions(e.currentTarget.value, '');
                    const reactsDiv = html.querySelector('#token-quips-reacts');
                    const reactsTab = html.querySelector('[data-tab="reacts"]');
                    if (e.currentTarget.value === 'reacts') {
                        reactsDiv?.classList.remove('hidden');
                        reactsTab?.classList.remove('hidden');
                    } else {
                        reactsDiv?.classList.add('hidden');
                        reactsTab?.classList.add('hidden');
                    }
                    const capDiv = html.querySelector('#token-quips-cap');
                    if (capDiv) {
                        e.currentTarget.value === 'move'
                            ? capDiv.classList.remove('hidden')
                            : capDiv.classList.add('hidden');
                    }
                    const lbl = html.querySelector('#token-quips-documentname-label');
                    if (lbl) lbl.innerHTML = this.documentNameLabel(e.currentTarget.value);
                });

            html.querySelector('#token-quips-documenttype-reacts-value')
                ?.addEventListener('change', (e) => {
                    this._refreshDocumentNameOptions(e.currentTarget.value, 'to.');
                    const lbl = html.querySelector('#token-quips-documentname-reacts-label');
                    if (lbl) lbl.innerHTML = this.documentNameLabel(e.currentTarget.value);
                    this._duplicateNameWarning();
                });

            html.querySelector('#token-quips-fileTitle-audio-value')
                ?.addEventListener('change', (e) => {
                    const audioSeq = html.querySelector('#token-quips-play-type-audio-label');
                    if (audioSeq) {
                        e.currentTarget.value
                            ? audioSeq.classList.add('hidden')
                            : audioSeq.classList.remove('hidden');
                    }
                });

            html.querySelector('#token-quips-fileTitle-chat-value')
                ?.addEventListener('change', (e) => {
                    for (const id of ['#token-quips-fileName-chat-label', '#token-quips-compendium-chat-label', '#token-quips-play-type-chat-label']) {
                        const el = html.querySelector(id);
                        if (el) {
                            e.currentTarget.value
                                ? el.classList.add('hidden')
                                : el.classList.remove('hidden');
                        }
                    }
                });

            html.querySelector('#token-quips-documentname-reacts-value')
                ?.addEventListener('change', () => this._duplicateNameWarning());

            html.querySelector('#token-quips-name-value')
                ?.addEventListener('input', () => {
                    this._duplicateNameWarning();
                    this._existsCheck('name');
                });

            html.querySelector('#token-quips-name-is-actor')
                ?.addEventListener('change', () => this._existsCheck('name'));
            html.querySelector('#token-quips-name-is-wildcard')
                ?.addEventListener('change', () => this._existsCheck('name'));
            html.querySelector('#token-quips-to-name-value')
                ?.addEventListener('input', () => this._existsCheck('to-name'));
            html.querySelector('#token-quips-to-name-is-actor')
                ?.addEventListener('change', () => this._existsCheck('to-name'));
            html.querySelector('#token-quips-to-name-is-wildcard')
                ?.addEventListener('change', () => this._existsCheck('to-name'));

            // Initial state
            this._duplicateNameWarning();
            this._notExistsWarning();
        }

        async _refreshDocumentNameOptions(documentType, reacts) {
            const html = this.element;
            const reactsHTML = reacts ? '-reacts' : '';
            const documentName = html.querySelector(`#token-quips-documentname${reactsHTML}-value`)?.value ?? '';
            const documentNameSelectHTML = html.querySelector(`#token-quips-documentname${reactsHTML}`);
            if (documentNameSelectHTML) {
                documentNameSelectHTML.innerHTML = this._createNameOptionsHTML(documentType, documentName, reacts);
            }
            this._documentNameWildcardHTML(documentType, reactsHTML);
        }

        _documentNameWildcardHTML(documentType, reacts) {
            const suppress = this._suppressDocumentNameWildcard(documentType);
            const wc = this.element.querySelector(`#token-quips-documentname${reacts}-is-wildcard`);
            const formGroup = this.element.querySelector(`#token-quips-documentname${reacts}-is-wildcard-formgroup`);
            if (!wc) return;
            if (suppress) {
                wc.checked = false;
                formGroup?.classList.add('hidden');
            } else {
                formGroup?.classList.remove('hidden');
            }
        }

        _suppressDocumentNameWildcard(documentType) {
            return (BYPASSNAMETYPES.includes(documentType) || documentType === 'reacts' || getWorldDocumentNameOptions(documentType)) ? true : false;
        }

        _createNameOptionsHTML(documentType, documentName, reacts) {
            let finalHTML = '', reactsHTML = reacts ? '-reacts' : '', disabled = '';
            documentName = documentName ? documentName : '';
            const optionListOptions = getWorldDocumentNameOptions(documentType);
            if (optionListOptions) {
                const sortedList = optionListOptions.dontSort ? optionListOptions : Object.entries(optionListOptions).sort(([,a],[,b]) => a.localeCompare(b));
                let optionList = '<option value=""></option>';
                for (let i = 0; i < sortedList.length; i++) {
                    let selected = '';
                    if (sortedList[i][0] === documentName) {
                        selected = ' selected ';
                    }
                    optionList += '<option value="' + sortedList[i][0] + '" ' + selected + '>' + sortedList[i][1] + '</option>';
                }
                finalHTML = `<select id="token-quips-documentname${reactsHTML}-value" name="${reacts}documentName" value="` + documentName + '">' + optionList + '</select>';
            } else {
                if (BYPASSNAMETYPES.includes(documentType) || documentType === 'reacts') { disabled = ' disabled '; }
                finalHTML = `<input id="token-quips-documentname${reactsHTML}-value" type="text" name="${reacts}documentName" value="` + documentName + '" ' + disabled + '/>';
            }
            return finalHTML;
        }

        documentNameLabel(documentType) {
            return (documentType && DOCUMENTNAMELABELS[documentType]) ? game.i18n.localize(DOCUMENTNAMELABELS[documentType]) : game.i18n.localize(DOCUMENTNAMELABELS['']);
        }

        // `this` is bound to the instance by ApplicationV2 when calling the handler
        static async _onSubmit(event, form, formData) {
            try {
                const expandedData = foundry.utils.expandObject(formData.object);
                if (this.ownerId) {
                    if (game.user.isGM) {
                        await says.updatePlayerSayForUser(this.ownerId, expandedData.id, expandedData, true);
                    } else {
                        await says.updatePlayerSay(expandedData.id, expandedData, true);
                    }
                } else {
                    await says.updateSay(expandedData.id, expandedData, true);
                }
                if (tokenSays.TokenSaysSettingsConfig?.rendered) {
                    tokenSays.TokenSaysSettingsConfig.refresh();
                }
            } catch (err) {
                console.error('Token Quips | Error saving saying:', err);
                ui.notifications?.error('Token Quips: Failed to save saying. Check the console for details.');
            }
        }

        _duplicateNameWarning() {
            const html = this.element;
            const warning = html?.querySelector('#token-quips-rule-dup-name-warning');
            if (!warning) return;

            const reactsTypeEl = html.querySelector('#token-quips-documenttype-reacts-value');
            if (!reactsTypeEl) return;

            if (reactsTypeEl.value === 'say') {
                html.querySelector('#token-quips-to-name')?.classList.add('hidden');
                const toNameActor = html.querySelector('#token-quips-to-name-is-actor');
                if (toNameActor) toNameActor.disabled = true;

                const reactsId = html.querySelector('#token-quips-documentname-reacts-value')?.value;
                const nameVal = html.querySelector('#token-quips-name-value')?.value;
                if (nameVal === says.getSay(reactsId)?.name) {
                    warning.classList.remove('hidden');
                } else {
                    warning.classList.add('hidden');
                }
            } else {
                warning.classList.add('hidden');
                html.querySelector('#token-quips-to-name')?.classList.remove('hidden');
                const toNameActor = html.querySelector('#token-quips-to-name-is-actor');
                if (toNameActor) toNameActor.disabled = false;
            }
        }

        _notExistsWarning() {
            this._existsCheck('name');
            this._existsCheck('to-name');
        }

        _existsCheck(id) {
            if (id === 'name' || id === 'to-name') {
                const fails = [];
                const isWildcard = this.element.querySelector(`#token-quips-${id}-is-wildcard`)?.checked ?? false;
                const isActor = this.element.querySelector(`#token-quips-${id}-is-actor`)?.checked ?? false;
                const warnId = isActor ? 'actor' : 'token';

                this.element.querySelector(`#token-quips-${id}-token-warning-container`)?.classList.add('hidden');
                this.element.querySelector(`#token-quips-${id}-actor-warning-container`)?.classList.add('hidden');

                const nameConcat = this.element.querySelector(`#token-quips-${id}-value`)?.value;
                if (nameConcat) {
                    const namesParsed = parseSeparator(nameConcat);
                    const nameList = !isWildcard
                        ? namesParsed
                        : wildcardName(isActor ? game.actors : [...new Set(game.scenes.map(s => s.tokens.map(t => t.name)).flat())], namesParsed, isActor ? false : true);

                    if (namesParsed.length > 0 && !nameList.length) {
                        fails.push(nameConcat);
                    } else if (isActor) {
                        for (const actorName of nameList) {
                            if (!game.actors.getName(actorName)) { fails.push(actorName); }
                        }
                    } else {
                        for (const tokenName of nameList) {
                            if (!game.scenes.find(s => s.tokens.find(t => t.name === tokenName))) { fails.push(tokenName); }
                        }
                    }
                }

                const warning = this.element.querySelector(`#token-quips-${id}-${warnId}-warning`);
                if (fails.length) {
                    if (warning) warning.innerHTML = fails.join(', ');
                    this.element.querySelector(`#token-quips-${id}-${warnId}-warning-container`)?.classList.remove('hidden');
                } else {
                    if (warning) warning.innerHTML = '';
                }
            }
        }
    };
});
