/*
 * MIT License
 * 
 * Copyright (c) 2020-2021 DnD5e Helpers Team and Contributors
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

/**
 * A single rule in our list of tokenSaysRules.
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
        scope: 'client',
        config: true,
        default: true,
        type: Boolean
    });
    
    game.settings.register('token-says', 'suppressPrivateGMRoles', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressPrivateGMRoles.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressPrivateGMRoles.description'),
        scope: 'client',
        config: true,
        default: true,
        type: Boolean
    });

    let choices = {'': 'TOKENSAYS.setting.suppressOptions.none', 'A': 'TOKENSAYS.setting.suppressOptions.audio', 'R': 'TOKENSAYS.setting.suppressOptions.rollTable', 'X': 'TOKENSAYS.setting.suppressOptions.all'};

    game.settings.register('token-says', 'suppressChatBubble', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressChatBubble.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressChatBubble.description'),
        scope: 'world',
        config: true,
        default: '',
        type: String,
        choices: choices
    });  

    game.settings.register('token-says', 'suppressChatMessage', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressChatMessage.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressChatMessage.description'),
        scope: 'world',
        config: true,
        default: '',
        type: String,
        choices: choices
    });  


    game.settings.register('token-says', 'suppressAudio', {
        name: game.i18n.localize('TOKENSAYS.setting.suppressAudio.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.suppressAudio.description'),
        scope: 'client',
        config: true,
        default: false,
        type: Boolean
    });

    /*
    game.settings.register('token-says', 'chatBubbleSize', {
        name: game.i18n.localize('TOKENSAYS.setting.chatBubbleSize.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.chatBubbleSize.description'),
        scope: 'world',
        config: true,
        range: {             
          min: 1,
          max: 10,
          step: 1
        },
        default: 1,
        type: Number
    });  
    */

    game.settings.register('token-says', 'rules', {
        name: game.i18n.localize('TOKENSAYS.setting.rules.label'),
        hint: game.i18n.localize('TOKENSAYS.setting.rules.description'),
        scope: 'world',
        config: false,
        default: {rules: {}},
        type: Object
    }); 
    
    Hooks.on("createChatMessage", (message, options, user) => {
        tokenSays.says(message, user);
        return true;
      })    
    
    tokenSays.initialize();
 });

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
    }

    /**
     * Method that workflows the intake of chat message, parsing, escaping of feature,
     * finding of matching rule condition, and, on match, generation of token says event
     * @param {ChatMessage} message - the incoming chat message
     * @param  {user} user - the user for which the chat message has generated
    */
    static async says(message, user){
        if(this._escapeTokenSays(message, user)){return;}

        const tokenName = message.data.speaker.alias;
        const actorId = message.data.speaker.actor;
        const actorName = game.actors.get(actorId).name;
        const parseData = this._parseChatMessage(message);
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
     * @param {ChatMessage} message - the incoming chat message
     * @param  {user} user - the user for which the chat message has generated
    */
    static _escapeTokenSays(message, user) {
        let escape = false;
        if (message.data.flags.TOKENSAYS?.cancel){escape = true} //escape if chat generated by tokenSays (avoid loop)
        else if (game.user?.id !== user){escape = true}//escape if not chat generated by the invocation
        else {tokenSays.log(false, 'Checking message and game level escape conditions... ', {message});}

        if(!escape && !game.settings.get('token-says','isActive')){//escape if token says is not active
            tokenSays.log(false, 'Settings ', 'Token Says is set to Inactive'); 
            escape = true;
        } 
        else if (game.settings.get('token-says','suppressPrivateGMRoles') && message.data.whisper.length){//escape if private gm roll based on settings
            tokenSays.log(false, 'Settings ', 'Private GM Roll to be escaped'); 
            escape = true;
        }
        return escape;
    }

    /**
     * Performs escape of token says if certain game settings are matched at the rule level. 
     * Returns true if an escape should be made
     * @param {tokenSaysData} rule - the incoming rule
    */
    static _escapeTokenSaysRule(rule, component){
        tokenSays.log(false, 'Checking rule level escape conditions... ', {rule});
        let escape = false;
        if(component = 'audio' && rule.fileType === 'audio' && game.settings.get('token-says', 'suppressAudio')){//escape if suppress audio is set on configuration
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
     * @param {ChatMessage} message - the incoming chat message
    */
    static _parseChatMessage(message){
        const flags = message.data.flags;
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
        } else if (flags.core.initiativeRoll) {
            documentType = 'initiative'; 
        }   
        else if(message.data.flavor !== ""){documentType = 'flavor'; documentName =  message.data.flavor;}
        return {documentType, documentName}
    }

    static _findItemName(message){
        let itemName = ''; 
        const act = game.actors.get(message.data.speaker.actor);
        itemName = act.items.get(message.data.flags.dnd5e.roll.itemId).name;
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
        let actor = game.actors.get(message.data.speaker.actor);
        let speaker = message.data.speaker;
        let token = canvas.tokens.get(speaker.token); 
        
        //output chat message and chat bubble
        if(!actor || !speaker){return}
        this._sayChatMessage({token: token, actor: actor, speaker: speaker, says: finalSays}, rule)
        this._sayChatBubble({token: token, says: finalSays}, rule);

        return finalSays;
    }

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
            for (let key of playlist.data.sounds) {console.log(i); console.log(rolledResult); if (i++ == rolledResult) {audioFile = key;  break;}}
        } else {audioFile = playlist.sounds.find(p=>p.name === rule.fileTitle)}

        //generate audio
        this._sayAudio(audioFile, rule);

        //variables to facilitate gui outputs

        let actor = game.actors.get(message.data.speaker.actor);
        let speaker = message.data.speaker;
        let token = canvas.tokens.get(speaker.token);
        let finalSays = "............";

        //output chat message and chat bubble
        if(!actor || !speaker) {return}
        this._sayChatMessage({token: token, actor: actor, speaker: speaker, says: finalSays}, rule)
        this._sayChatBubble({token: token, says: finalSays}, rule);

        return finalSays;
    }

    static _sayChatMessage(messageData, rule) {
        if(this._escapeTokenSaysRule(rule, 'chat message')){return false;}
        let img = '';
        if(rule.isActorName && messageData.actor?.data.img){
            img = '<img src="' + messageData.actor.data.img + '" alt="' + messageData.speaker.alias + '">'
        } else { 
            if(messageData.token?.data.img){img = '<img src="' + messageData.token.data.img + '" alt="' + messageData.speaker.alias + '">'}       
        }
        
        const finalMessage = '<div class="token-says chat-window"">'+ img + '<div class="what-is-said">"' + messageData.says + '"</div></div>';
        ChatMessage.create({
            speaker: messageData.speaker,
            content : finalMessage,
            flags: {TOKENSAYS: {cancel: true}}
        },{chatBubble : false})
        return true;
    }

    static async _sayChatBubble(messageData, rule) {
        if(this._escapeTokenSaysRule(rule, 'chat bubble')){return false;}
        await new ChatBubbles().say(messageData.token, messageData.says, false);
        return true;
    }

    static _sayAudio(audioFile, rule) {
        if(!audioFile?.path){
            tokenSays.log(false, 'No Audio File Path ', audioFile); 
            return false;
        }
        if(this._escapeTokenSaysRule(rule, 'audio')){return false;}
        AudioHelper.play({src: audioFile.path, loop: false, autoplay: true}, true); 
        return true;
    }
}

/**
 * Register debug flag with developer mode's custom hook
 */
Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(tokenSays.ID);
});

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
        const allRules = this.allTokenSaysRules;
        for (var record in allRules) {
            if (((allRules[record].isActorName && allRules[record].name === actorName) || (!allRules[record].isActorName && allRules[record].name === tokenName)) && allRules[record].documentType === documentType && (allRules[record].documentName === "" ||  allRules[record].documentName ===documentName)) {
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
        delete allRules[tokenSaysRuleId];
        return await game.settings.set('token-says', 'rules', allRules);
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