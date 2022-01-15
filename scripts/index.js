import {tokenSays} from "./token-says.js";
import {workflow} from "./apps/workflow.js";
import {TokenSaysTokenForm} from "./apps/token-form.js";
import {TokenSaysSettingsConfig} from './apps/say-list-form.js';
import {TOKENFORMICONDISPLAYOPTIONS, SUPPRESSOPTIONS, SEPARATOROPTIONS, getCompendiumOps} from './apps/constants.js';
import {api} from "./apps/api.js";
import {activeEffectToWorkflowData, chatMessageToWorkflowData, checkToWorkflowData, combatTurnToWorkflowData, midiToWorkflowData, movementToWorkflowData} from "./apps/helpers.js";
import { says } from "./apps/says.js";

export var tokenSaysHasPolyglot = false, tokenSaysHasMQ = false;

Hooks.once('init', async function() { 
    const module = 'token-says';
    const debouncedReload = foundry.utils.debounce(() => {
        window.location.reload();
      }, 100);
    
    game.settings.registerMenu(module, "tokenSaysRules", {
        name: game.i18n.localize("TOKENSAYS.setting.tokenSaysRules.name"),
        label: game.i18n.localize("TOKENSAYS.setting.tokenSaysRules.label"),
        icon: "fas fa-user-cog",
        type: TokenSaysSettingsConfig,
        restricted: true
    });
    
    game.settings.register(module, 'isActive', {
        name: game.i18n.localize('TOKENSAYS.setting.isActive.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.isActive.description'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register(module, 'separator', {
        name: game.i18n.localize('TOKENSAYS.setting.separator.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.separator.description'),
        scope: 'world',
        config: true,
        default: '|',
        type: String,
        choices: SEPARATOROPTIONS
    });  

    game.settings.register(module, 'tokenHeader', {
        name: game.i18n.localize('TOKENSAYS.setting.tokenHeader.display.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.tokenHeader.display.description'),
        scope: 'world',
        config: true,
        default: 'B',
        type: String,
        choices: TOKENFORMICONDISPLAYOPTIONS
    });

    game.settings.register(module, 'cacheAudio', {
        name: game.i18n.localize('TOKENSAYS.setting.cacheAudio.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.cacheAudio.description'),
        scope: 'client',
        config: true,
        default: true,
        type: Boolean,
        onChange: debouncedReload
    });
    
    game.settings.register(module, 'suppressPrivateGMRoles', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressPrivateGMRoles.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressPrivateGMRoles.description'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register(module, 'suppressChatBubble', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressChatBubble.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressChatBubble.description'),
        scope: 'client',
        config: true,
        default: '',
        type: String,
        choices: SUPPRESSOPTIONS
    });  

    game.settings.register(module, 'suppressChatMessage', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressChatMessage.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressChatMessage.description'),
        scope: 'client',
        config: true,
        default: '',
        type: String,
        choices: SUPPRESSOPTIONS
    });  

    game.settings.register(module, 'audioDuration', {
        name: game.i18n.localize('TOKENSAYS.setting.audioDuration.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.audioDuration.description'),
        scope: 'world',
        config: true,
        default: 20,
        type: Number,
        range: {
            min: 0,
            max: 300,
            step: 1
        }
    });

    game.settings.register(module, 'suppressAudio', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressAudio.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressAudio.description'),
        scope: 'client',
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register(module, 'suppressImage', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressImage.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressImage.description'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register(module, 'conditions', {
        name: game.i18n.localize('TOKENSAYS.setting.condition.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.condition.description'),
        scope: 'world',
        config: true,
        default: '',
        type: String,
    });  

    game.settings.register(module, 'rules', {
        name: game.i18n.localize('TOKENSAYS.setting.rules.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.rules.description'),
        scope: 'world',
        config: false,
        default: {},
        type: Object
    }); 
    
    Hooks.on("createChatMessage", (message, options, userId) => {
        const data = chatMessageToWorkflowData(message.data)
        if(data) workflow.go(userId, data);
    });

    Hooks.on("createActiveEffect", (document, options, userId) => {
        if(document.parent && (document.parent.token?.parent?.id || document.parent?.id)){
            const data = activeEffectToWorkflowData(document)
            if(data) workflow.go(userId, data);
        }
    });

    Hooks.on("deleteActiveEffect", (document, options, userId) => {
        if(document.parent && (document.parent.token?.parent?.id || document.parent?.id)){
            const data = activeEffectToWorkflowData(document, true)
            if(data) workflow.go(userId, data);
        }
    });
    
    Hooks.on("updateActiveEffect", (document, change, options, userId) => {
        if(document.parent && (document.parent.token?.parent?.id || document.parent?.id) && ("disabled" in change || ("label" in change && !document.data.disabled))){
            const data = activeEffectToWorkflowData(document, change.disabled)
            if(data) workflow.go(userId, data);
        }
    });

    Hooks.on('updateCombat', async(document, round, options, id) => {
        const data = combatTurnToWorkflowData(document)
        if(data) workflow.go(id, data);
    });

    
    Hooks.on("preUpdateToken", async (token, update, options, id) => {
        if (("x" in update || "y" in update || "elevation" in update) && token?.data) {
            options[`${tokenSays.FLAGS.TOKENSAYS}`] = {start: {x: token.data.x, y: token.data.y}, end: {x: (update.x ? update.x : token.data.x), y: (update.y ? update.y : token.data.y)}}
        }
    });
        
    
    Hooks.on("updateToken", async (token, update, options, id) => {
        if (("x" in update || "y" in update || "elevation" in update) && options[`${tokenSays.FLAGS.TOKENSAYS}`]) {
            const data = movementToWorkflowData(token, id, options[`${tokenSays.FLAGS.TOKENSAYS}`])
            if(data) {
                workflow.go(id, data);
                data['documentType']='arrive'
                workflow.go(id, data);
            }
        }
    });

    //hook to ensure that, on token says settings render, the current tab is not lost
    Hooks.on("renderApplication", (app, html, options) => {
        if(app.id ==="token-says-rules"){
            app._filter();
            app._tab();
        } else if (app.id ==="token-says-rules-rule"){
            app._duplicateNameWarning()
            app._notExistsWarning()
        }
    });

    Hooks.on("renderTokenConfig", (app, html, data) => {
        TokenSaysTokenForm._init(app, html, data);
    });


 });

 Hooks.once('setup', async function() {
    api.register();
 });

 /**
  * Register items and add hooks for items that need modules installed
  */
 Hooks.once('ready', async function() {

    game.settings.register(tokenSays.ID, 'worldAudioInd', {
        name: game.i18n.localize('TOKENSAYS.setting.worldAudioInd.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.worldAudioInd.description'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });
    
    game.settings.register(tokenSays.ID, 'defaultAudioCompendium', {
        name: game.i18n.localize('TOKENSAYS.setting.defaultAudioCompendium.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.defaultAudioCompendium.description'),
        scope: 'world',
        config: true,
        default: '',
        type: String,
        choices: getCompendiumOps('audio')
    });  

    game.settings.register(tokenSays.ID, 'worldRollableTableInd', {
        name: game.i18n.localize('TOKENSAYS.setting.worldRollableTableInd.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.worldRollableTableInd.description'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register(tokenSays.ID, 'defaultRollableTableCompendium', {
        name: game.i18n.localize('TOKENSAYS.setting.defaultRollableTableCompendium.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.defaultRollableTableCompendium.description'),
        scope: 'world',
        config: true,
        default: '',
        type: String,
        choices: getCompendiumOps('rollTable')
    });  

    game.socket.on("module.token-says", async (inSays) => {
        if(inSays.sound){
            tokenSays.log(false,'Socket Call... ', {sound: inSays.sound});
            const sounds = game.audio.playing.values();
            for (const s of sounds){
                if(s.id === inSays.sound) {
                    await s.fade(0, {duration: 250})
                    s.stop();
                    break;
                }
            }
            return
        }
        if(inSays.load){
            AudioHelper.preloadSound(inSays.load);
            return
        }
        let saysToken = canvas.tokens.get(inSays.token);
        tokenSays.log(false,'Socket Call... ', {inSays: inSays, foundToken: saysToken});
        await canvas.hud.bubbles.say(saysToken, inSays.says, inSays.emote);
      });

    tokenSays.initialize();

    setModsAvailable();

    if( game.settings.get(tokenSays.ID, 'cacheAudio')){
        Hooks.on("canvasReady", async (canvas, options)=>{
            says.preloadSceneSounds()
        });
        says.preloadSceneSounds()

        Hooks.on("preCreateToken", async (token, change, options, id)=>{
            if(token) {
                says.preloadTokenSounds(token);
            }
        });
    }

    if(game.world.data.system === "dnd5e"){
        Hooks.on("Actor5e.rollSkill", async (actor, roll, ability, options)  => {
            const data = checkToWorkflowData(actor, 'skill', ability, options)
            if(data) workflow.go(game.userId, data);
        });

        Hooks.on("Actor5e.rollAbilitySave", async (actor, roll, ability, options) => {
            const data = checkToWorkflowData(actor, 'save', ability, options)
            if(data) workflow.go(game.userId, data);
        });

        Hooks.on("Actor5e.rollAbilityTest", async (actor, roll, ability, options) => {
            const data = checkToWorkflowData(actor, 'ability', ability, options)
            if(data) workflow.go(game.userId, data);
        });
    }
    if (tokenSaysHasMQ){
        Hooks.on("midi-qol.AttackRollComplete", (midiWorkflow) => {     
            const data = midiToWorkflowData(midiWorkflow, 'attack');
            if(data) workflow.go(game.userId, data);
        });

        Hooks.on("midi-qol.DamageRollComplete", (midiWorkflow) => {
            const data = midiToWorkflowData(midiWorkflow, 'damage');
            if(data) workflow.go(game.userId, data);
        });
    }
    if (tokenSaysHasPolyglot){
        Hooks.on("renderChatMessage", (chatMessage, html, message) => {
            if(chatMessage.data.flags?.TOKENSAYS?.img && chatMessage.data.flags?.polyglot){
                tokenSays._insertHTMLToPolyglotMessage(chatMessage, html, message);
            }
        });
    }

 });

/**
 * Register debug flag with developer mode's custom hook
 */
 Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(tokenSays.ID);
});

/**
 * sets global variables that indicate which modules that danger zone integrates with are available
 */
 function setModsAvailable () {
    if (game.modules.get("polyglot")?.active) tokenSaysHasPolyglot = true;
    if (game.modules.get("midi-qol")?.active) tokenSaysHasMQ = true;
}