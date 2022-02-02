import {tokenSays} from '../token-says.js';
import {tokenSaysHasPolyglot} from '../index.js';
import {parseSeparator,getDistance} from './helpers.js';

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
        this.cap = false,
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
        this.lang = '',
        this.likelihood = 100,
        this.name = '',
        this.paired = {
            compendiumName:  '',
            fileName: '',
            fileTitle: '',
        },
        this.suppressChatbubble = false,
        this.suppressChatMessage = false,
        this.suppressQuotes = false,
        this.volume = 0.50
    }

    get audioCompendiumName(){
        return this.isAudio ? this.compendiumName : this.paired.compendiumName
    }

    get chatCompendiumName(){
        return !this.isAudio ? this.compendiumName : this.paired.compendiumName
    }

    get audioFileName(){
        return this.isAudio ? this.fileName : this.paired.fileName
    }

    get chatFileName(){
        return !this.isAudio ? this.fileName : this.paired.fileName
    }

    get audioFileTitle(){
        return this.isAudio ? this.fileTitle : this.paired.fileTitle
    }

    get chatFileTitle(){
        return !this.isAudio ? this.fileTitle : this.paired.fileTitle
    }

    get _audioCompendium() {
        if (this.audioCompendiumName) return this.audioCompendiumName
        return game.settings.get(tokenSays.ID, 'defaultAudioCompendium')
    }

    get _chatCompendium() {
        if (this.chatCompendiumName) return this.chatCompendiumName
        return game.settings.get(tokenSays.ID, 'defaultRollableTableCompendium');
    }

    get documentNameList() {
        return parseSeparator(this.documentName)
    }

    get hasAudio(){
        return (this.audioFileName || this.audioFileTitle) ? true : false
    }

    get hasChat(){
        return (this.chatFileName || this.chatFileTitle) ? true : false
    }

    get isAudio(){
        return this.fileType === 'audio' ? true : false
    }

    get nameList() {
        return parseSeparator(this.name)
    }

    async compendium(isAudio = true){
        const compendium = await game.packs.find(p=>p.collection === isAudio ? this._audioCompendium : this._chatCompendium)?.getDocuments();
        if(!compendium) tokenSays.log(false, 'Compendium Not Found ', this)
        return compendium
    }

    async playlist() {
        let playlist;
        if(game.settings.get(tokenSays.ID, 'worldAudioInd')){
            playlist = game.playlists.getName(this.audioFileName);
        }
        if(!playlist){
            const pack = await this.compendium();
            if(pack) playlist = pack.find(t=> t.name === this.audioFileName);
        }
        
        if(!playlist) tokenSays.log(false, 'Playlist Not Found ', {say: this})

        return playlist
    }

    async rollableTable(){
        let table;
        if(game.settings.get(tokenSays.ID, 'worldRollableTableInd')){
            table = game.tables.getName(this.chatFileName)
        }
        if(!table){
            const pack = await this.compendium(false);
            if(pack) table = pack.find(t=> t.name === this.chatFileName);
        }
        if(!table) tokenSays.log(false, 'No Rolltable Found ', {say: this})

        return table;
    }

    async sound(){
        if(!this.audioFileName) return this.audioFileTitle ? this.audioFileTitle : ''
        const playlist = await this.playlist();
        if(!playlist) return {}
        if(!this.audioFileTitle){
            const roll = await new Roll(`1d`+ playlist.data.sounds.size).roll();
            const rolledResult = roll.result;
            let i = 1; 
            for (let key of playlist.data.sounds) {
                if (i++ == rolledResult) return key?.path;  
            }
        } else {
            return playlist.sounds.find(p=>p.name === this.audioFileTitle)?.path
        }
    }
}

export class tokenSay {
    constructor(say, options){
        this._say = say,
        this.actor = options.actor,
        this.diff = options.diff,
        this.item = options.item,
        this.likelihood ={
            result: 0,
            value: say.likelihood
        },
        this._message = this._say.chatFileTitle,
        this.message =  "............",
        this.response = options.response,
        this.sound = '',
        this.speaker = options.speaker,
        this.token = options.token
    }

    get active(){
        return this._say.isActive
    }

    get _adjDelay(){
        return (this.documentType === 'arrive' || this.reacts.documentType === 'arrive' ) ? true : false
    }

    get delay(){
        return (this._say.delay + this.delayAdj)
    }

    get delayAdj(){
        return this._adjDelay ? this.movementTime : 0 //movement is 100 every grid distance, adding buffer
    }

    get documentType(){
        return this._say.documentType
    }

    get img(){
        if(!game.settings.get(tokenSays.ID, 'suppressImage')){
            if(this.isActorName && this.actor?.data.img) return this.actor.data.img
            if(this.token?.data.img) return this.token.data.img
        } 
        return ''
    }

    get hasAudio(){
        return this._say.hasAudio
    }

    get hasChat(){
        return this._say.hasChat
    }

    get lang(){
        return this._say.lang
    }

    get language(){
        return !tokenSaysHasPolyglot ? false : (this.lang ? this.lang : (this.documentType === 'reacts' ? false : ui.chat.element.find("select[name=polyglot-language]").val()))
    }

    get likelihoodMet(){
        return (this.likelihood.result > this.likelihood.value) ? false : true
    }

    get maxDuration(){
        return (this._say.cap && this.hasAudio && this.documentType === 'move') ? this.movementTime : (game.settings.get(tokenSays.ID, 'audioDuration') * 1000)
    }

    get movementTime(){
        return (getDistance(this.diff.start, this.diff.end, false)/this.scene.data.grid) * 100
    }

    get quotes(){
        return this.suppressQuotes ? '' : '"'
    }

    get reacts(){
        return this._say.to ? this._say.to : {}
    }

    get scene() {
        return game.scenes.get(this.speaker.scene)
    }

    get suppressAudio(){
       return (this.hasAudio && !game.settings.get(tokenSays.ID, 'suppressAudio')) ? false : true
    }

    get suppressChatBubble(){
        return (this._say.suppressChatbubble || this._suppressCodes.includes(game.settings.get(tokenSays.ID, 'suppressChatBubble'))) ? true : false
    } 

    get suppressChatMessage(){
        return (this._say.suppressChatMessage || this._suppressCodes.includes(game.settings.get(tokenSays.ID, 'suppressChatMessage'))) ? true : false 
    }

    get _suppressCodes(){
        const ar = ['X']
        if(!this.hasAudio) ar.push('R')
        if(!this.hasChat) ar.push('A')
        return ar
    }

    get valid(){
        return (!this.active || (this.lang && !this.speaksLang(this.token))) ? false : true
    }

    _imageFormat(){
        return this.img ? `<img src="${this.img}" alt="${this.speaker.alias}">` : ''
    }

    _parameterizeMessage(){
         this.message = this._message
             .replace('[@alias]', this.speaker.alias ? this.speaker.alias : '')
             .replace('[@actor]', this.actor ? this.actor.name : '')
             .replace('[@item]', this.item ? this.item.toLowerCase() : '')
             .replace('[@r_alias]', this.response?.speaker?.alias ? this.response?.speaker?.alias : '')
             .replace('[@r_actor]', this.response?.actor?.name ? this.response.actor.name : '')
             .replace('[@r_item]', this.response?.item ? this.response.item.toLowerCase() : '')
     }

    async _setMessage(){
        if(!this.suppressChatBubble || !this.suppressChatMessage){
            if(!this.hasChat) {this.message = "............"}
            else {
                if (!this._message) await this._rollMessage();    
                this._parameterizeMessage()
            }
        }
    }

    /**
     * Method that compares a random roll of a 1d100 against the incoming likelihood
     * A roll above the likelihood indicates a fail / that they don't say something 
    */
    async mightSay() {
        if(this.likelihood.value < 100){
            const roll = await new Roll(`1d100`).roll();
            this.likelihood.result = roll.result;
        } else {this.likelihood.result = 100}
    }

    async _rollMessage(){
        const table = await this._say.rollableTable()
        if(table) {
            const rolledResult = await table.roll(); 
            this._message = rolledResult.results[0].data.text
        }
    }

    async ready(){
        if(this.valid) {
            await this.mightSay();
            if(this.likelihoodMet) await this._setMessage() 
        }       
    }

    async play(){
        if(this.likelihoodMet){
            if(this.delay) await wait(this.delay);
            if(!this.suppressAudio) this.sayAudio();
            if(!this.suppressChatMessage && this.message) this.sayChatMessage();
            if(!this.suppressChatBubble && this.message) this.sayChatBubble();
            return true
        } else {
            return console.log(`Say canceled: likelihood threshold of ${this.likelihood.value} was not met with a roll of ${this.likelihood.result} (roll must be at or lower)`)
        }
    }

    /**
     * Method that performs the playlist find and execute then calls the final outputs to chat and audio
    */
     async sayAudio(){
        const audioFile = await this._say.sound();
        if(!audioFile) return tokenSays.log(false, 'No Audio File Path ', audioFile);
        this.sound = await AudioHelper.play({src: audioFile, volume: this._say.volume, loop: false, autoplay: true}, true);
        await wait(this.maxDuration)
        game.socket.emit('module.token-says', {sound: this.sound.id})
        await this.sound.fade(0, {duration: 250})
        this.sound.stop();
    }

    /**
     * Method that executes the chat bubble 
    */
    async sayChatBubble() {
        const emote = this.language ? {emote: {language: this.language}} : false
        if(this.token){ 
            canvas.hud.bubbles.say(this.token, this.message, emote);
            game.socket.emit("module.token-says", {
                token: this.token.id,
                says: this.message,
                emote: emote
            });
        }
    }

    /**
     * Method that executes the chat message 
    */
     async sayChatMessage() {
        const img = this._imageFormat()
        const messageData = {
            speaker: this.speaker,
            type: CONST.CHAT_MESSAGE_TYPES.IC,
            flags: {TOKENSAYS: {cancel: true, img: img}} 
        };

        if(this.language) messageData['lang'] = this.language
        messageData['content'] = tokenSaysHasPolyglot ?  `${this.quotes}${this.message}${this.quotes}` : `<div class="token-says chat-window">${img}<div class="what-is-said">${this.quotes}${this.message}${this.quotes}</div></div>`;
        ChatMessage.create(messageData,{chatBubble : false})
    }

    speaksLang(){
        return (!tokenSaysHasPolyglot || (this.token?.actor && this.token.actor.data.data.traits.languages.value.includes(this.lang))) ? true : false
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

    get toDocumentNameList() {
        return parseSeparator(this.to.documentName)
    }

    get toNameList() {
        return parseSeparator(this.to.name)
    }
}
