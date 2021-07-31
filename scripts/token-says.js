/*
 * MIT License
 * 
 * Copyright (c) 2020-2021 Token Says Team and Contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


var tokenSaysSettingsTab = 'token-says-roll-table';//tracks the current tab selected on settings config for rerendering 
var tokenSaysHasPolyglot = false;
var tokenSaysHasMQ = false;
var tokenSaysCurrentSearch = '';

Hooks.once('init', async function() {  
    game.settings.registerMenu('token-says', "tokenSaysRules", {
        name: game.i18n.localize("TOKENSAYS.setting.tokenSaysRules.name"),
        label: game.i18n.localize("TOKENSAYS.setting.tokenSaysRules.label"),
        icon: "fas fa-user-cog",
        type: TokenSaysSettingsConfig,
        restricted: true
    });
    
    game.settings.register('token-says', 'isActive', {
        name: game.i18n.localize('TOKENSAYS.setting.isActive.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.isActive.description'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });
    
    game.settings.register('token-says', 'suppressPrivateGMRoles', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressPrivateGMRoles.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressPrivateGMRoles.description'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });

    let choices = {'': 'TOKENSAYS.setting.suppressOptions.none', 'A': 'TOKENSAYS.setting.suppressOptions.audio', 'R': 'TOKENSAYS.setting.suppressOptions.rollTable', 'X': 'TOKENSAYS.setting.suppressOptions.all'};

    game.settings.register('token-says', 'suppressChatBubble', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressChatBubble.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressChatBubble.description'),
        scope: 'client',
        config: true,
        default: '',
        type: String,
        choices: choices
    });  

    game.settings.register('token-says', 'suppressChatMessage', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressChatMessage.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressChatMessage.description'),
        scope: 'client',
        config: true,
        default: '',
        type: String,
        choices: choices
    });  

    game.settings.register('token-says', 'audioDuration', {
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

    game.settings.register('token-says', 'suppressAudio', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressAudio.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressAudio.description'),
        scope: 'client',
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register('token-says', 'rules', {
        name: game.i18n.localize('TOKENSAYS.setting.rules.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.rules.description'),
        scope: 'world',
        config: false,
        default: {rules: {}},
        type: Object
    }); 
    
    Hooks.on("createChatMessage", (message, options, user) => {
        if(message.data){tokenSaysWorkflow._says(message.data, user, {hook:"createChatMessage"} );}
        return true;
      });
    
    //hook to ensure that, on token says settings render, the current tab is not lost
    Hooks.on("renderApplication", (message, element, tabs) => {
        if(message.id ==="token-says-rules"){
            let tabToClick = 'a[data-tab='+tokenSaysSettingsTab+']';
            $(tabToClick)[0].click();
            message._filter(tokenSaysCurrentSearch);
        }
    })
 });

 /**
  * Register items and add hooks for items that need modules installed
  */
 Hooks.once('ready', async function() {
    let audioCompendiumOps = {'': ''};
    let audioCompendiums = game.packs.filter((x) => x.metadata.entity == "Playlist").map((item) => {return {label: item.title, value: item.collection}}); 
    for (let comp of audioCompendiums ) {audioCompendiumOps [comp.value] = comp.label;}
     
    let rollCompendiumOps = {'': ''};
    let rollCompendiums = game.packs.filter((x) => x.metadata.entity == "RollTable").map((item) => {return {label: item.title, value: item.collection}});
    for (let comp of rollCompendiums ) {rollCompendiumOps [comp.value] = comp.label;}

    game.settings.register('token-says', 'worldAudioInd', {
        name: game.i18n.localize('TOKENSAYS.setting.worldAudioInd.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.worldAudioInd.description'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });
    
    game.settings.register('token-says', 'defaultAudioCompendium', {
        name: game.i18n.localize('TOKENSAYS.setting.defaultAudioCompendium.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.defaultAudioCompendium.description'),
        scope: 'world',
        config: true,
        default: '',
        type: String,
        choices: audioCompendiumOps
    });  

    game.settings.register('token-says', 'worldRollableTableInd', {
        name: game.i18n.localize('TOKENSAYS.setting.worldRollableTableInd.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.worldRollableTableInd.description'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register('token-says', 'defaultRollableTableCompendium', {
        name: game.i18n.localize('TOKENSAYS.setting.defaultRollableTableCompendium.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.defaultRollableTableCompendium.description'),
        scope: 'world',
        config: true,
        default: '',
        type: String,
        choices: rollCompendiumOps
    });  

    game.socket.on("module.token-says", async (inSays) => {
        let saysToken = canvas.tokens.get(inSays.token);
        tokenSays.log(false,'Socket Call... ', {inSays: inSays, foundToken: saysToken});
        await canvas.hud.bubbles.say(saysToken, inSays.says, inSays.emote);
      });

    tokenSays.initialize();

    if (tokenSaysHasMQ){
        tokenSays.log(false,'Module Support ', 'Midi-Qol Support Activated');
        Hooks.on("midi-qol.AttackRollComplete", (data) => {
            if(data){tokenSaysWorkflow._says(data, game.user.id, {hook:"midi-qol.AttackRollComplete"});}
            tokenSays.log(false,'Attack Roll Complete ', data);
            return true;
        });
        Hooks.on("midi-qol.DamageRollComplete", (data) => {
            if(data){tokenSaysWorkflow._says(data, game.user.id, {hook:"midi-qol.DamageRollComplete"});}
            tokenSays.log(false,'Damage Roll Complete ', data);
            return true;
        });
    }
    if (tokenSaysHasPolyglot){
        tokenSays.log(false,'Module Support ', 'Polyglot Support Activated');
        Hooks.on("renderChatMessage", (chatMessage, html, message) => {
            if(chatMessage.data.flags?.TOKENSAYS?.img && chatMessage.data.flags?.polyglot){
               tokenSaysWorkflow._insertHTMLToPolyglotMessage(chatMessage, html, message);
               tokenSays.log(false,'Polyglot chat rendered ', {chatMessage, html, message});
               return true
            }
            return false;
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
 * A class which holds some constants for tokenSays
 */
class tokenSays {
    static ID = 'token-says';
    
    static FLAGS = {
      TOKENSAYS: 'token-says'
    }
    
    static TEMPLATES = {
      TOKENSAYS: `modules/${this.ID}/templates/token-says.hbs`,
      TOKENSAYSRULE: `modules/${this.ID}/templates/token-says-rule.hbs`
    }

    /**
     * A small helper function which leverages developer mode flags to gate debug logs.
     * @param {boolean} force - forces the log even if the debug flag is not on
     * @param  {...any} args - what to log
    */
    static log(force, ...args) {  
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
    
        if (shouldLog) {
          console.log(this.ID, '|', ...args);
        }
      }

    static initialize() {
        this.TokenSaysRuleConfig = new TokenSaysRuleConfig();
        this.TokenSaysSettingsConfig = new TokenSaysSettingsConfig();
        if (game.modules.get("polyglot") && game.modules.get("polyglot")?.active){tokenSaysHasPolyglot = true} ;
        if (game.modules.get("midi-qol") && game.modules.get("midi-qol")?.active){tokenSaysHasMQ = true} ;
    }

    /**
     * API call allow for call from macro
     * @param {token} token - id of the token
     * @param  {actor} actor - id of the actor
     * @param {string} actionName - the name of the action that. Should match the token says rule Action Name
    */
    static async says(token, actor, actionName) {
        let tToken; 
        if(token){tToken = game.canvas.scene.tokens.get(token)}
        let actorId = actor;
        if(!actor){actorId = tToken.actor.id}
        if(!actor && !token){return;}

        let alias = '';
        if(tToken){alias = tToken.name}
        else {alias = game.actors.get(actorId).name}
        let scene = game.scenes.current.id;
        let user = game.userId;
        let message = new ChatMessage;
        message.data.speaker = {scene: scene, actor: actorId, token: token, alias: alias};
        tokenSays.log(false,'Macro Generated Rule... ', {message, user, documentType: "macro", documentName: actionName});
        return await tokenSaysWorkflow._says(message.data, user, {documentType: "macro", documentName: actionName});
    }

    
}

/**
 * A class which handles the workflow
 */
 class tokenSaysWorkflow {
    /**
     * Method that workflows the intake of chat message, parsing, escaping of feature,
     * finding of matching rule condition, and, on match, generation of token says event
     * @param {ChatMessage.data} message - the incoming chat message data
     * @param  {user} user - the user for which the chat message has generated
     * @param {object} options - other options
    */
    static async _says(message, user, options){
        if(this._escapeTokenSays(message, user, options)){return;}

        const tokenName = message.speaker.alias;
        const actorId = message.speaker.actor;
        const actorName = game.actors.get(actorId).name;
        let parseData;
        if(options.hook==="createChatMessage") {
            parseData = this._parseChatMessage(message);
        } else {
            parseData = this._parseHook(message, options);
        }
        const documentType = parseData.documentType;
        const documentName = parseData.documentName;
        let finalSays = '';

        let rule = tokenSaysData.getTokenSaysRuleChatMessage(tokenName, actorName, documentType, documentName);
        if(rule){
            if(this._escapeTokenSaysRule(rule)){return;} //determine escapes at the rule level
            const theySay = await this.mightSay(rule.likelihood);
            if(theySay.says) {
                let compendium = rule.compendiumName;
                if(rule.fileType === 'rollTable'){
                    if(compendium===''){compendium = game.settings.get('token-says', 'defaultRollableTableCompendium')}
                    finalSays = this.rollCharacterSaysTable(compendium, rule, message)
                } else if(rule.fileType === 'audio'){
                    if(compendium===''){compendium = game.settings.get('token-says', 'defaultAudioCompendium')}
                    finalSays = this.playCharacterSaysAudio(compendium, rule, message);
                }
                tokenSays.log(false,'Rule found... ', {rule});
                tokenSays.log(false,'Final says... ', {finalSays});
            }
            else{tokenSays.log(false,'Rule likelihood not met...  ', theySay)}
        } else{tokenSays.log(false, 'No rule found... ', {message, tokenName: tokenName, actorName: actorName, documentType: documentType, documentName: documentName})}
        return rule;
    }

    /**
     * Performs escape of token says if certain game settings are matched. Settings may be world or client.
     * Returns true if an escape should be made
     * @param {ChatMessage.data} message - the incoming chat message data
     * @param  {user} user - the user for which the chat message has generated
     * @param {object} options
    */
    static _escapeTokenSays(message, user, options) {
        let escape = false;
        if (message.flags?.TOKENSAYS?.cancel){escape = true;} //escape if chat generated by tokenSays (avoid loop)
        else if (game.user?.id !== user){escape = true;}//escape if not chat generated by the invocation
        else if(!message.speaker){escape = true;}//escape if message data has no speaker
        else {tokenSays.log(false, 'Checking message and game level escape conditions... ', {message});}

        
        if(!escape && !game.settings.get('token-says','isActive')){//escape if token says is not active
            tokenSays.log(false, 'Settings ', 'Token Says is set to Inactive'); 
            escape = true;
        } 
        else if (game.settings.get('token-says','suppressPrivateGMRoles') && (message.whisper?.length || message.whisperAttackCard)){//escape if private gm roll based on settings
            tokenSays.log(false, 'Settings ', 'Private GM Roll to be escaped'); 
            escape = true;
        } 
        return escape;
    }

    /**
     * Performs escape of token says if certain game settings are matched at the rule level. 
     * Returns true if an escape should be made
     * @param {tokenSaysData} rule - the incoming rule
     * @param {string} component - a string that provides information on whether this is audio or rolltable or chat message
    */
    static _escapeTokenSaysRule(rule, component){
        tokenSays.log(false, 'Checking rule level escape conditions for ' + component + '... ', {rule});
        let escape = false;
        if(!rule.isActive){//escape if suppress audio is set on configuration
            tokenSays.log(false, 'Rule Settings ', 'Token Says Rule is set to Inactive'); 
            escape = true;
        } else if(component = 'audio' && rule.fileType === 'audio' && game.settings.get('token-says', 'suppressAudio')){//escape if suppress audio is set on configuration
            tokenSays.log(false, 'Settings ', 'Token Says is set to Inactive'); 
            escape = true;
        } else if(component = 'chat bubble') {
            const suppressRule = game.settings.get('token-says', 'suppressChatBubble');
            if(suppressRule === 'X'){//escape if no chat bubbles with audio
                tokenSays.log(false, 'Settings ', 'No chat bubble'); 
                escape = true;
            } else if(rule.fileType === 'audio' && suppressRule === 'A'){//escape if no chat bubbles with audio
                tokenSays.log(false, 'Settings ', 'No chat bubble on audio'); 
                escape = true;
            } else if(rule.fileType === 'audio' && suppressRule === 'R'){//escape if no chat bubbles with audio
                tokenSays.log(false, 'Settings ', 'No chat bubble on rollable tables'); 
                escape = true;
            }
        } else if(component = 'chat message') {
            const suppressRule = game.settings.get('token-says', 'suppressChatMessage');
            if(suppressRule === 'X'){//escape if no chat bubbles with audio
                tokenSays.log(false, 'Settings ', 'No chat message'); 
                escape = true;
            } else if(rule.fileType === 'audio' && suppressRule === 'A'){//escape if no chat bubbles with audio
                tokenSays.log(false, 'Settings ', 'No chat message on audio'); 
                escape = true;
            } else if(rule.fileType === 'audio' && suppressRule === 'R'){//escape if no chat bubbles with audio
                tokenSays.log(false, 'Settings ', 'No chat message on rollable tables'); 
                escape = true;
            }
        }
        return escape;
    }

    /**
     * Method that parses the message to attempt to determine what action the token or actor just did
     * @param {ChatMessage.data} message - the incoming chat message data
    */
    static _parseChatMessage(message){
        const flags = message.flags;
        tokenSays.log(false, 'Parsing message... Flags ', {flags});
        let documentType = ''; let documentName = ''; let f='';
        if(f=flags.dnd5e){
            if(f.roll?.skillId){
                documentType = 'skill'; documentName =  f.roll.skillId;           
            } else if(f.roll?.abilityId){
                documentType = f.roll.type; documentName =  f.roll.abilityId;           
            } else if(f.roll?.skillId){
                documentType = 'skill'; documentName =  f.roll.skillId;           
            } else if(f.roll?.type ==="attack" && f.roll?.itemId) {
                documentType = 'attack'; documentName = this._findItemName(message);
            } else if(f.roll?.type ==="damage" && f.roll?.itemId) {
                documentType = 'damage'; documentName = this._findItemName(message);
            }
        } else if(f=flags['midi-qol']) {
            if (f.type === 0){
                documentType = 'flavor'; documentName =  message.flavor;           
            } else if (f.type === 1){
                documentType = 'hit'; documentName = this._findItemName(message);         
            } else if (f.type === 2){
                documentType = 'save'; documentName = this._findItemName(message);          
            } else if (f.type === 3){
                documentType = 'attack'; documentName = this._findItemName(message);         
            } else if (f.type === 4){
                documentType = 'damage'; documentName = this._findItemName(message);        
            }
        }
        else if (flags.core?.initiativeRoll) {
            documentType = 'initiative'; 
        }   
        else if(message.flavor !== ""){documentType = 'flavor'; documentName =  message.flavor;}
        return {documentType, documentName}
    }

     /**
     * Method that parses a data passed in via a hooked operation that may or may not have the same structure as message data
     * @param {object} message - the incoming chat message data
     * @param {object} options - the name of the hook passing in this data
    */
    static _parseHook (message, options) {
        tokenSays.log(false, 'Parsing hook... ', {message, options});
        let documentType = ''; let documentName = ''; 
        if (options.hook==="midi-qol.AttackRollComplete"){
            documentType = 'attack'; documentName = this._findItemName(message);
        } else if (options.hook==="midi-qol.DamageRollComplete"){
            documentType = 'damage'; documentName = this._findItemName(message);
        } else {documentType = options.documentType, documentName = options.documentName}
        return {documentType, documentName}
    }

    /**
     * Method that determines how best to find the item name, based on incoming data that has different structures
     * @param {object} message - the incoming chat message data
    */
    static _findItemName(message){
        let itemId = ''; const flags = message.flags;
        const act = game.actors.get(message.speaker.actor);
        if(flags){
            if(flags.dnd5e){
                itemId = flags.dnd5e.roll.itemId;
                } 
            else if (flags['midi-qol']) {
                itemId = flags['midi-qol'].itemId;   
            } 
        } else {itemId = message.itemId}
        const itemName = act.items.get(itemId).name;
        return  itemName
    }

    /**
     * Method that compares a random roll of a 1d100 against the incoming likelihood
     * A roll above the likelihood indicates a fail / that they don't say something 
     * @param {number} likelihood - the Token Says rule likelihood
    */
    static async mightSay(likelihood){
        let theySay = true;
        let rolledResult = 100;
        if(likelihood < 100){
            const maybe = new Roll(`1d100`);
            rolledResult = await maybe.roll();
            if (rolledResult.result > likelihood){theySay = false}
        }
        tokenSays.log(false,'Likelihood assessment... ', {says: theySay, roll: rolledResult, likelihood: likelihood});
        return {says: theySay, roll: rolledResult}
    }
    
    /**
     * Method that performs the rolltable find and execute then calls the final outputs to chat 
     * @param {string} compendium - the compendium name, either from the rule or the default
     * @param {tokenSaysRule} rule 
     * @param {object} message - the incoming message data, with differing possible structures
    */
    static async rollCharacterSaysTable(compendium, rule, message){
        //use file title as the words to say if not blank
        let finalSays = rule.fileTitle;
        
        //roll the table if the text to be said isn't supplied directly
        if(!finalSays || finalSays === '') {
            let table;
            if(game.settings.get('token-says', 'worldRollableTableInd')){table = game.tables.getName(rule.fileName);}//search world first when settings dicated
            if(!table){
                const pack = await game.packs.find(p=>p.collection === compendium)?.getDocuments();
                table = pack.find(t=> t.name === rule.fileName);
            }
            if(!table){
                tokenSays.log(false, 'No Rolltable Found ', rule); 
                return;}
            let rolledResult = await table.roll(); 
            finalSays = rolledResult.results[0].data.text;
        }

        //variables to facilitate gui outputs
        let actor = game.actors.get(message.speaker.actor);
        let speaker = message.speaker;
        let token = canvas.tokens.get(speaker.token); 
        
        //output chat message and chat bubble
        if(!actor || !speaker){return}
        this._sayChatMessage({token: token, actor: actor, speaker: speaker, says: finalSays}, rule)
        this._sayChatBubble({token: token, says: finalSays}, rule);

        return finalSays;
    }

    /**
     * Method that performs the playlist find and execute then calls the final outputs to chat and audio
     * @param {string} compendium - the compendium name, either from the rule or the default
     * @param {tokenSaysRule} rule 
     * @param {object} message - the incoming message data, with differing possible structures
    */
    static async playCharacterSaysAudio(compendium, rule, message){
        //get playlist
        let playlist;
        if(game.settings.get('token-says', 'worldAudioInd')){
            playlist = game.playlists.getName(rule.fileName);
            }
        if(!playlist){
            const pack = await game.packs.find(p=>p.collection === compendium)?.getDocuments();
            if(pack){playlist = pack.find(t=> t.name === rule.fileName);}
            if(!playlist){return}
        }

        //get audio file from playlist
        let audioFile;
        if(!rule.fileTitle){
            const rolledResult = await new Roll(`1d`+ playlist.data.sounds.size).roll().result;
            let i = 1; 
            for (let key of playlist.data.sounds) {if (i++ == rolledResult) {audioFile = key;  break;}}
        } else {audioFile = playlist.sounds.find(p=>p.name === rule.fileTitle)}

        //generate audio
        this._sayAudio(audioFile, rule);

        //variables to facilitate gui outputs

        let actor = game.actors.get(message.speaker.actor);
        let speaker = message.speaker;
        let token = canvas.tokens.get(speaker.token);
        let finalSays = "............";

        //output chat message and chat bubble
        if(!actor || !speaker) {return}
        this._sayChatMessage({token: token, actor: actor, speaker: speaker, says: finalSays}, rule)
        this._sayChatBubble({token: token, says: finalSays}, rule);

        return finalSays;
    }

    /**
     * Method that executes the chat message 
     * @param {object} messageData - An object holding 4 key names - created by the upstream function
     * @param {tokenSaysRule} rule 
    */
    static async _sayChatMessage(messageData, rule) {
        if(this._escapeTokenSaysRule(rule, 'chat message')){return false;}
        let img = '';
        if(rule.isActorName && messageData.actor?.data.img){
            img = '<img src="' + messageData.actor.data.img + '" alt="' + messageData.speaker.alias + '">'
        } else { 
            if(messageData.token?.data.img){img = '<img src="' + messageData.token.data.img + '" alt="' + messageData.speaker.alias + '">'}       
        }
        
        let finalMessage;
        if(tokenSaysHasPolyglot){
            finalMessage = messageData.says;
        } else {
            finalMessage = '<div class="token-says chat-window">'+ img + '<div class="what-is-said">"' + messageData.says + '"</div></div>';
        }   
        ChatMessage.create({
            speaker: messageData.speaker,
            content : finalMessage,
            type: CONST.CHAT_MESSAGE_TYPES.IC,
            flags: {TOKENSAYS: {cancel: true, img: img}}
        },{chatBubble : false})
        return true;
    }

    /**
     * Method that executes the chat bubble 
     * @param {object} messageData - An object holding 4 key names - created by the upstream function
     * @param {tokenSaysRule} rule 
    */
    static async _sayChatBubble(messageData, rule) {
        if(!messageData.token){return false;}
        if(this._escapeTokenSaysRule(rule, 'chat bubble')){return false;}
        
        let options;
        if(tokenSaysHasPolyglot){
            let language = ui.chat.element.find("select[name=polyglot-language]").val();
            if (language === null) {
                options = false
            }
            else{
                options = {language: language}
            }
        } else {options = false}
        game.socket.emit("module.token-says", {
            token: messageData.token.id,
            says: messageData.says,
            emote: {emote: options}
        });
        await canvas.hud.bubbles.say(messageData.token, messageData.says, false);
        return true;
    }

    /**
     * Method that executes the playlist 
     * @param {object} audioFile - the song from a playlist
     * @param {tokenSaysRule} rule 
    */
    static async _sayAudio(audioFile, rule) {
        if(!audioFile?.path){
            tokenSays.log(false, 'No Audio File Path ', audioFile); 
            return false;
        }
        if(this._escapeTokenSaysRule(rule, 'audio')){return false;}
        const maxDuration = game.settings.get('token-says', 'audioDuration');
        const sound = await AudioHelper.play({src: audioFile.path, loop: false, autoplay: true}, true);
        sound.schedule(() => sound.fade(0), maxDuration);//set a duration based on system preferences.
        sound.schedule(() => sound.stop(), (maxDuration+1)); //stop once fade completes (1000 milliseconds default)
        return true;
    }

    static _insertHTMLToPolyglotMessage(chatMessage, html, message) {
        let img = chatMessage.data.flags.TOKENSAYS.img;
        if(img){
            let content = html.find(".message-content");
            let translatedContent = html.find(".polyglot-original-text");
            console.log(translatedContent);
            let common = 0;
            let contentText = '';
            if(!translatedContent.length) {
                common = 1;
                contentText = '<span>' + chatMessage.data.content + '</span>';
            }
            let newContent='<div class="token-says chat-window" style="margin-bottom:6px;">'+ img + '<div class="what-is-said">' + contentText + '</div></div>';
            if(common) {
                $(content).empty().append(newContent);
            } else {
                $(newContent).prependTo(content);
                let contentSays = html.find('.what-is-said');
                translatedContent.prependTo(contentSays);
            } 
        }
    }
}

/**
 * Class that stores all of the rules and that CRUDS them
 * A single rule in our list of tokenSaysRules 
 * @typedef {Object} tokenSaysRule
 * @property {string} id - A unique ID to identify this rule.
 * @property {string} label - The title of the rule.
 * @property {string} documentType - The document type that triggers this rule.
 * @property {string} documentName - The actor or item name which triggers this rule.
 * @property {string} fileName - The file which is rolled or played based on this rule.
 * @property {string} fileType - Identifies the base record - currently rollTable or audio
 * @property {string} fileTitle - the unique name within the file title. For rollTables, this is the text said (rolltable bypassed) and for audio this is the audio file name within the playlist.
 * @property {string} name - Identifies the name of the token or actor
 * @property {string} compendiumName - The compendium associated with the file associated to this rule.
 * @property {number} likelihood - The threshold above which a random 1d100 will result in an escape from this rule.
 * @property {boolean} isActive - toggle for rule being active or not
 * @property {boolean} isActorName - toggle for rule being for the name of the actor or the token on the board
 */

class tokenSaysData {
    constructor(fileType) {
        this.id = foundry.utils.randomID(16),
        this.label = '',
        this.documentType = '',
        this.documentName = '',
        this.name = '',
        this.fileType = fileType,
        this.fileName = '',
        this.fileTitle = '',
        this.compendiumName = '',
        this.likelihood = 100,
        this.isActive = true,
        this.isActorName = true
    }

    static get allTokenSaysRules() {
        return game.settings.get('token-says', 'rules');
    }

    static get allTokenSaysRollTableRules() {
        const returnObj = {}
        const allRules = this.allTokenSaysRules;
        for (var record in allRules) {
            if (allRules[record].fileType == 'rollTable') {
                returnObj[record]=allRules[record];
            }
        }
        return returnObj;
    }

    static get allTokenSaysAudioRules() {
        const returnObj = {}
        const allRules = this.allTokenSaysRules;
        for (var record in allRules) {
            if (allRules[record].fileType == 'audio') {
                returnObj[record]=allRules[record];
            }
        }
        return returnObj;
    }
  
    static getTokenSaysRule(tokenSaysRuleId){
        return this.allTokenSaysRules[tokenSaysRuleId];
    }

    static getTokenSaysRuleChatMessage(tokenName, actorName, documentType, documentName){
        const bypassNameTypes = ['initiative'];
        const allRules = this.allTokenSaysRules;
        for (var record in allRules) {
            if (
                (
                    (allRules[record].isActorName && allRules[record].name === actorName) 
                    || (!allRules[record].isActorName && allRules[record].name === tokenName)
                ) 
                && allRules[record].documentType === documentType 
                && (
                    allRules[record].documentName === "" 
                    || allRules[record].documentName ===documentName
                    || bypassNameTypes.indexOf(documentType) !== -1
                    )
                ) {
              return allRules[record];
            }
        }
    }

    static async createTokenSaysRule(inFileType) {
        const newRule = new tokenSaysData(inFileType); 
        const allrules = this.allTokenSaysRules;
        allrules[newRule.id] = newRule;
        await game.settings.set('token-says', 'rules', allrules);
        return newRule;
    }

    static async createTokenSaysRollTableRule() {
       return await tokenSaysData.createTokenSaysRule("rollTable")
    }

    static async createTokenSaysAudioRule() {
       return await tokenSaysData.createTokenSaysRule("audio")
    }

    static async updateTokenSaysRule(tokenSaysRuleId, updateData) {
        const allRules = this.allTokenSaysRules;
        const ruleToUpdate = allRules[tokenSaysRuleId];

        const rulesUpdate = {
            id: tokenSaysRuleId,
            label: this.nullTokenSaysRuleString(updateData.label, ruleToUpdate.label),
            documentType: this.nullTokenSaysRuleString(updateData.documentType, ruleToUpdate.documentType),
            documentName: this.nullTokenSaysRuleString(updateData.documentName, ruleToUpdate.documentName),
            name: this.nullTokenSaysRuleString(updateData.name, ruleToUpdate.name),
            fileType: ruleToUpdate.fileType,
            fileName: this.nullTokenSaysRuleString(updateData.fileName, ruleToUpdate.fileName),
            fileTitle: this.nullTokenSaysRuleString(updateData.fileTitle, ruleToUpdate.fileTitle),
            compendiumName: this.nullTokenSaysRuleString(updateData.compendiumName, ruleToUpdate.compendiumName),
            likelihood: this.outOfRangTokenSaysRuleInt(updateData.likelihood, 1,100, ruleToUpdate.likelihood),
            isActive: this.nullTokenSaysRuleBool(updateData.isActive, ruleToUpdate.isActive),
            isActorName: this.nullTokenSaysRuleBool(updateData.isActorName, ruleToUpdate.isActorName)
        }
        allRules[tokenSaysRuleId] = rulesUpdate;
        return await game.settings.set('token-says', 'rules', allRules);
    }

    static async updateTokenSaysRuleStatus(tokenSaysRuleId, statusState) {
        if(statusState  === undefined) {return} else {
            return await this.updateTokenSaysRule(tokenSaysRuleId, {isActive: statusState}) 
        }
    }

    static async updateTokenSaysRules(updateData) {
        const allRules = updateData;
        return await game.settings.set('token-says', 'rules', allRules);
    }

    static async deleteTokenSaysRule(tokenSaysRuleId) {
        const allRules = this.allTokenSaysRules;
        let rule = allRules[tokenSaysRuleId]
        delete allRules[tokenSaysRuleId];
        await game.settings.set('token-says', 'rules', allRules);
        return rule;
    }

    // delete all rules
    static async deleteAllTokenSaysRule() {
        const allRules = {};
        return await game.settings.set('token-says', 'rules', allRules);
    }

    static nullTokenSaysRuleString(inString, returnIfNull){
        if(inString === undefined) {return returnIfNull} else {return inString}
    }
    
    static outOfRangTokenSaysRuleInt(inNumber, min, max, returnIfOut){
        if(inNumber === null || isNaN(inNumber) || inNumber < min || inNumber > max) {return returnIfOut} else {return inNumber}
    }

    static nullTokenSaysRuleBool(inBool, returnIfNotBool){
        if (inBool === undefined) {
            return returnIfNotBool 
        } else {
            return inBool
        }
    }
}