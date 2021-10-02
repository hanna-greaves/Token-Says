import {tokenSays} from '../token-says.js';
import {tokenSaysHasPolyglot} from '../index.js';

const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

/**
 * Class that stores all of the rules and that CRUDS them
 * A single rule in our list of tokenSaysRules 
 * @typedef {Object} say
 * @property {string} id - A unique ID to identify this rule.
 * @property {string} label - The title of the rule.
 * @property {integer} delay - Delays the saying for the given amount of milliseconds
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
 * @property {integer} volume - sets the volume of audio, between 0.01 and 1
 */

export class say {
    constructor(fileType) {
        this.compendiumName = '',
        this.delay = 0,
        this.documentName = '',
        this.documentType = '',
        this.id = foundry.utils.randomID(16),
        this.isActive = true,
        this.isActorName = true,
        this.fileName = '',
        this.fileTitle = '',
        this.fileType = fileType,
        this.label = '',
        this.likelihood = 100,
        this.name = '',
        this.suppressChatbubble = false,
        this.suppressChatMessage = false,
        this.suppressQuotes = false,
        this.volume = 0.50
    }

    get compendium() {
        if (this.compendiumName) {
            return this.compendiumName
        } else if (this.fileType === 'audio') {
            return game.settings.get('token-says', 'defaultAudioCompendium')
        } else {
            return game.settings.get('token-says', 'defaultRollableTableCompendium')
        }
    }

    async say(options){
        const result = {escape: {}, likelihood: {}, message:''}

        result.escape = this._escape();
        if(result.escape.all){
            tokenSays.log(false,`Say escaped: not active `, {escape: result.escape, say: this});
            return result
        }

        result.likelihood = await this.mightSay();
        if(!result.likelihood.doesSay){
            tokenSays.log(false,`Say canceled: likelihood not met `, {escape: result.escape, likelihood: result.likelihood, say: this});
            return result
        }

        if(this.delay) {
            await wait(this.delay);
        }
        
        if(!result.escape.audio){
            this.sayAudio(); 
        }

        if(this.fileType === 'rollTable' && (!result.escape.chatMessage || !result.escape.chatBubble)) {
            if (this.fileTitle) {      
                result.message = this._parameterizeMessage(this.fileTitle, options)
            } else {
                let rolledMessage = await this._getRollMessage();
                result.message = rolledMessage ? this._parameterizeMessage(rolledMessage, options) : ""
            }
        } else {       
            result.message = "............"
        }

        if(!result.escape.chatMessage && result.message){
            this._sayChatMessage(options.token, options.actor, options.speaker, result.message)
        }

        if(!result.escape.chatBubble && result.message){
           this._sayChatBubble(options.token, result.message)
        }

        tokenSays.log(false, 'Say Complete Execution', {say: this, options: options, escape: result.escape, likelihood: result.likelihood});
        return result
    }

    _escape(){
        const escape = {
            all: false,
            audio: false,
            chatBubble: false,
            chatMessage: false
        };

        const suppressBubble = game.settings.get('token-says', 'suppressChatBubble');
        const suppressMessage = game.settings.get('token-says', 'suppressChatMessage');

        if(!this.isActive){
            escape.all = true
        }

        if(this.fileType !== 'audio' || game.settings.get('token-says', 'suppressAudio')){
            escape.audio = true
        }

        if(suppressBubble === 'X' 
            || (this.fileType === 'audio' && suppressBubble === 'A')  
            || (this.fileType === 'rollTable' && suppressBubble === 'R')
            || (this.suppressChatbubble)
            ) {
            escape.chatBubble = true
        }

        if(suppressMessage === 'X' 
            || (this.fileType === 'audio' && suppressMessage === 'A')  
            || (this.fileType === 'rollTable' && suppressMessage === 'R')
            || (this.suppressChatMessage)
            ) {
            escape.chatMessage = true
        }

        return escape;
    }

    /**
     * Method that compares a random roll of a 1d100 against the incoming likelihood
     * A roll above the likelihood indicates a fail / that they don't say something 
    */
    async mightSay() {
        let doesSay = true; let rolledResult = 100;
        if(this.likelihood < 100){
            const maybe = new Roll(`1d100`);
            rolledResult = await maybe.roll();
            if (rolledResult.result > this.likelihood){doesSay = false}
        }
        return {doesSay: doesSay, roll: rolledResult.result}
    }

    /**
     * Method that performs the playlist find and execute then calls the final outputs to chat and audio
    */
    async sayAudio(){
        //get playlist
        let playlist;
        if(game.settings.get('token-says', 'worldAudioInd')){
            playlist = game.playlists.getName(this.fileName);
        }
        if(!playlist){
            const pack = await game.packs.find(p=>p.collection === this.compendium)?.getDocuments();
            if(!pack){
                return tokenSays.log(false, 'Compendium Not Found ', this)
            }
            playlist = pack.find(t=> t.name === this.fileName);
            if(!playlist){
                return tokenSays.log(false, 'Playlist Not Found ', {say: this, pack: pack})
            }
        }

        //get audio file from playlist
        let audioFile;
        if(!this.fileTitle){
            const rolledResult = await new Roll(`1d`+ playlist.data.sounds.size).roll().result;
            let i = 1; 
            for (let key of playlist.data.sounds) {
                if (i++ == rolledResult) {
                    audioFile = key;  
                    break;
                }
            }
        } else {
            audioFile = playlist.sounds.find(p=>p.name === this.fileTitle)
        }

        //generate audio
        if(!audioFile?.path){
            return tokenSays.log(false, 'No Audio File Path ', audioFile); 
        }
        
        const maxDuration = game.settings.get('token-says', 'audioDuration');
        const sound = await AudioHelper.play({src: audioFile.path, volume: this.volume, loop: false, autoplay: true}, true);
        sound.schedule(() => sound.fade(0), maxDuration);//set a duration based on system preferences.
        sound.schedule(() => sound.stop(), (maxDuration+1)); //stop once fade completes (1000 milliseconds default)
        return true;
    }

    /**
     * Method that executes the chat bubble 
    */
    async _sayChatBubble(token, message) {
        if(!token){
            return false
        }
        
        let options;
        if(tokenSaysHasPolyglot){
            let language = ui.chat.element.find("select[name=polyglot-language]").val();
            if (language === null) {
                options = false
            }
            else{
                options = {language: language}
            }
        } else {
            options = false
        }
        
        await canvas.hud.bubbles.say(token, message);

        game.socket.emit("module.token-says", {
            token: token.id,
            says: message,
            emote: {options}
        });

        return true;
    }

    /**
     * Method that executes the chat message 
    */
    async _sayChatMessage(token, actor, speaker, message) {
        let img = '', quotes = this.suppressQuotes ? '' : '"';
        if(game.settings.get('token-says', 'suppressImage')){
            tokenSays.log(false, 'Chat image suppressed ', {});
        } else if(this.isActorName && actor?.data.img){
            img = '<img src="' + actor.data.img + '" alt="' + speaker.alias + '">'
        } else { 
            if(token?.data.img){img = '<img src="' + token.data.img + '" alt="' + speaker.alias + '">'}       
        }
        
        let finalMessage;
        if(tokenSaysHasPolyglot){
            finalMessage = message;
        } else {
            finalMessage = '<div class="token-says chat-window">'+ img + '<div class="what-is-said">' + quotes + message + quotes + '</div></div>';
        }   
        ChatMessage.create({
            speaker: speaker,
            content : finalMessage,
            type: CONST.CHAT_MESSAGE_TYPES.IC,
            flags: {TOKENSAYS: {cancel: true, img: img}}
        },{chatBubble : false})
        return true;
    }

    async _getRollMessage(){
        let table;
        if(game.settings.get('token-says', 'worldRollableTableInd')){
            table = game.tables.getName(this.fileName)
        }
        if(!table){
            const pack = await game.packs.find(p=>p.collection === this.compendium)?.getDocuments();
            if(!pack){
                return tokenSays.log(false, 'Compendium Not Found ', this.compendium)
            }
            table = pack.find(t=> t.name === this.fileName);
        }
        if(!table){
            return tokenSays.log(false, 'No Rolltable Found ', this); 
        }

        let rolledResult = await table.roll(); 
        return rolledResult.results[0].data.text
    }

    _parameterizeMessage(message, options){
        const act = game.actors.get(options.actor?.id)?.name;
        const r_act = game.actors.get(options.response?.actor?.id)?.name;
        return message
            .replace('[@alias]', options.speaker.alias ? options.speaker.alias : '')
            .replace('[@actor]', act ? act : '')
            .replace('[@item]', options.item ? options.item.toLowerCase() : '')
            .replace('[@r_alias]', options.response?.speaker?.alias ? options.response?.speaker?.alias : '')
            .replace('[@r_actor]', r_act ? r_act : '')
            .replace('[@r_item]', options.response?.item ? options.response.item.toLowerCase() : '')
    }
}

export class reacts extends say {
    constructor(fileType) {
        super(fileType);
        this.to = {
            distance: 0,
            documentType:'',
            documentName:'',
            name: '',
            isActorName: true,
            requireVision: false
        }
    }
}