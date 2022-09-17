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
    constructor(fileType = 'rollTable') {
        this.actorType = '',
        this.cap = false,
        this.capOptions = {
            min: 0,
            fileName: ''
        },
        this.compendiumName = '',
        this.condition = '',
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
        this.macroId = '',
        this.name = '',
        this.paired = {
            compendiumName:  '',
            fileName: '',
            fileTitle: '',
            play: ''
        },
        this.reverse = false,
        this.play= '',
        this.suppressChatbubble = false,
        this.suppressChatMessage = false,
        this.suppressPan = false,
        this.suppressQuotes = false,
        this.volume = 0.50,
        this.limit = 0
    }

    get audioCompendiumName(){
        return this.isAudio ? this.compendiumName : this.paired.compendiumName
    }

    get audioIsSequential(){
        return ["S","L"].includes(this.audioPlay) && !this.audioFileTitle
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

    get audioPlay(){
        return this.isAudio ? this.play : this.paired.play
    }

    get chatFileTitle(){
        return !this.isAudio ? this.fileTitle : this.paired.fileTitle
    }

    get chatIsSequential(){
        return ["S","L"].includes(this.chatPlay) && !this.chatFileTitle
    }

    get _audioCompendium() {
        if (this.audioCompendiumName) return this.audioCompendiumName
        return game.settings.get(tokenSays.ID, 'defaultAudioCompendium')
    }

    get _chatCompendium() {
        if (this.chatCompendiumName) return this.chatCompendiumName
        return game.settings.get(tokenSays.ID, 'defaultRollableTableCompendium');
    }

    get chatPlay(){
        return !this.isAudio ? this.play : this.paired.play
    }

    get conditionActivationList() {
        return parseSeparator(this.condition)
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

    get hasAudioSequence(){
        return (this.audioIsSequential && this.hasAudio) ? true : false
    }

    get hasChatSequence(){
        return (this.chatIsSequential && this.hasChat) ? true : false
    }

    get hasSequence(){
        return (this.hasAudioSequence || this.hasChatSequence) ? true : false
    }

    get hasLimit(){
        return this.limit ? true : false;
    }

    get isAudio(){
        return this.fileType === 'audio' ? true : false
    }

    get macro(){
        return this.macroId ? game.macros.get(this.macroId) : ''
    }

    get nameList() {
        return parseSeparator(this.name)
    }

    async compendium(isAudio = true){
        const compendium = await game.packs.find(p=>p.collection === (isAudio ? this._audioCompendium : this._chatCompendium))?.getDocuments();
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
            const roll = await new Roll(`1d`+ playlist.sounds.size).roll();
            const rolledResult = roll.result;
            let i = 1; 
            for (let key of playlist.sounds) {
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
        this._audioFile = !this._say.audioFileName ? this._say.audioFileTitle : '',
        this.audioFile = '',
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

    get capBypass(){
        return this._say.cap && this.documentType === 'move' && this._say.capOptions?.min && this._say.capOptions.min > this.movementTime ? true : false
    }

    get countAudioPlay(){
        if (this._say.hasAudioSequence){
            let cnt = this.token.flags?.[tokenSays.ID]?.[tokenSays.FLAGS.SAYING]?.[tokenSays.FLAGS.AUDIOPLAYCOUNT]?.[this._say.id];
            if(this._say.audioPlay === 'L' && this.playlist && this.playlist.sounds.size <= cnt) cnt = 0;
            return cnt ? cnt : 0;
        }
        return 0
    }

    get countChatPlay(){
        if (this._say.hasChatSequence){
            let cnt = this.token.flags?.[tokenSays.ID]?.[tokenSays.FLAGS.SAYING]?.[tokenSays.FLAGS.CHATPLAYCOUNT]?.[this._say.id];
            if(this._say.chatPlay === 'L' && this.table && this.table.results.size <= cnt) cnt = 0;
            return cnt ? cnt : 0;
        }
        return 0
    }

    get countToLimit(){
        if (this._say.hasLimit){
            const cnt = this.token.flags?.[tokenSays.ID]?.[tokenSays.FLAGS.SAYING]?.[tokenSays.FLAGS.LIMITCOUNT]?.[this._say.id];
            return cnt ? cnt : 0;
        }
        return 0
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
            if(this.isActorName && this.actor?.img) return this.actor.img
            if(this.token?.texture?.src) return this.token.texture.src
        } 
        return ''
    }

    get hasAudio(){
        return this._say.hasAudio
    }

    get hasConditionActivation(){
        return this._say.condition ? true : false
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

    get macro(){
        return this._say.macro
    }

    get maxDuration(){
        return (this._say.cap && this.hasAudio && this.documentType === 'move' && !this.capBypass) ? this.movementTime : (game.settings.get(tokenSays.ID, 'audioDuration') * 1000)
    }

    get movementTime(){
        return (getDistance(this.diff.start, this.diff.end, false)/this.scene.grid.size) * 165
    }

    get quotes(){
        return this._say.suppressQuotes ? '' : '"'
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
    
    get suppressPan(){
        return (this._say.suppressPan || game.settings.get(tokenSays.ID, 'pan')) ? true : false
    }

    get _suppressCodes(){
        const ar = ['X']
        if(!this.hasAudio) ar.push('R')
        if(!this.hasChat) ar.push('A')
        return ar
    }

    get valid(){
        return (!this.active || (this.lang && !this.speaksLang(this.token)) || this.atLimit() || !this.conditionActivation(this.token)) ? false : true
    }

    atLimit(){
        if(this._say.hasLimit && this.countToLimit >= this._say.limit){
            console.log(`Saying limit of ${this._say.limit} has been met by this token.`)
            return true
        } 
        return false
    }

    conditionActivation(token){
        if(!this.hasConditionActivation) return true 
        if(token.actor?.effects && token.actor.effects.find(
                e => !e.disabled && (
                    this._say.conditionActivationList.includes(e.label) 
                    || (game.world.system === 'pf1' && e.flags?.core?.statusId && this._say.conditionActivationList.includes(game.pf1.config.conditions[e.flags.core.statusId]))
                    )
                )) return true
        return false
    }

    _imageFormat(){
        return this.img ? `<img src="${this.img}" alt="${this.speaker.alias}">` : ''
    }

    async _incrementAudioPlayCount(){
        const inc = this.countAudioPlay + 1;
        const cnt = ((this._say.audioPlay === 'L' && this.playlist.sounds.size <= inc) ? 0 : inc)
        await this._setTokenFlag(tokenSays.FLAGS.AUDIOPLAYCOUNT, cnt);
    }

    async _incrementChatPlayCount(){
        const inc = this.countChatPlay + 1;
        const cnt = ((this._say.chatPlay === 'L' && this.table.results.size <= inc) ? 0 : inc)
        await this._setTokenFlag(tokenSays.FLAGS.CHATPLAYCOUNT, cnt);
    }

    async _incrementCount(){
        if(this._say.hasLimit) await this._incrementLimitCount();
        if(this._say.hasAudioSequence) await this._incrementAudioPlayCount();
        if(this._say.hasChatSequence) await this._incrementChatPlayCount();
    }

    async _incrementLimitCount(){
        await this._setTokenFlag(tokenSays.FLAGS.LIMITCOUNT, this.countToLimit + 1);
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
                if(!this._message) this._say.chatIsSequential ? await this._nextMessage() : await this._rollMessage(); 
                if(this._message) this._parameterizeMessage()
            }
        }
    }

    async _setSound(){
        if(!this.suppressAudio){
            if(this.capBypass) {
                if(this._say.capOptions?.fileName) this._audioFile = this._say.capOptions.fileName
            }
            else if(!this._audioFile) this._say.audioIsSequential ? await this._nextSound() : await this._rollSound();   
        }
    }

    async _setTokenFlag(flag, amt){
        if(game.user.isGM) {
            await this.scene.tokens.get(this.token.id).setFlag(tokenSays.ID, `${tokenSays.FLAGS.SAYING}.${flag}.${this._say.id}`, amt)
        } else {
            await game.socket.emit('module.token-says', {tokenUpdate: {scene: this.scene.id, tokenId: this.token.id, sayId: this._say.id, flag: flag, amt:amt}});
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

    async _nextSound(){
        this.playlist = await this._say.playlist();
        if(this.playlist){
            if(this.playlist.sounds.size <= this.countAudioPlay) return console.log(`Saying count of ${this.countAudioPlay} exceeds playlist size.`)
            let i = 0; 
            for (const key of this.playlist.sounds) {
                if (i === this.countAudioPlay) {
                    this._audioFile = key?.path;
                    return
                }
                i++;  
            }
        }
    }

    async _nextMessage(){
        this.table = await this._say.rollableTable()
        if(this.table) {
            if(this.table.results.size <= this.countChatPlay) return console.log(`Saying count of ${this.countChatPlay} exceeds rolltable entry count.`)
            this._message = this.table.results.contents[this.countChatPlay].text;
        }
    }

    async playMacro(){
        this.macro.execute(this);
    }

    async _rollMessage(){
        this.table = await this._say.rollableTable()
        if(this.table) {
            let rolledResult;
            if(this._say.play === 'D'){
                if(this.table.results?.find(r => !r.drawn)) {
                    rolledResult = await this.table.draw({displayChat: false})
                } else {
                    console.log(`Rollable table ${this.table.name} has all results drawn.`);
                }
            } else {
                rolledResult = await this.table.roll();
            }
            this._message = rolledResult?.results[0]?.text
        }
    }

    async _rollSound(){
        this._audioFile = await this._say.sound()
    }

    async ready(){
        if(this.valid) {
            await this.mightSay();
            if(this.likelihoodMet) {
                await this._setMessage() 
                await this._setSound() 
            }
        }       
    }

    async play(){
        if(!this.likelihoodMet) return console.log(`Say canceled: likelihood threshold of ${this.likelihood.value} was not met with a roll of ${this.likelihood.result} (roll must be at or lower)`);
        if(this._message || this._audioFile || this.macro){
            if(this.delay) await wait(this.delay);
            if(!this.suppressAudio && this._audioFile) this.sayAudio();
            if(!this.suppressChatMessage && (this._message || this._audioFile)) this.sayChatMessage();
            if(!this.suppressChatBubble && (this._message || this._audioFile)) this.sayChatBubble();
            if(this._say.hasLimit || this._say.hasSequence) await this._incrementCount();
            if(this.macro) this.playMacro();
            return true
        } else {
            return console.log('Say cancelled');
        }
    }

    /**
     * Method that performs the playlist find and execute then calls the final outputs to chat and audio
    */
     async sayAudio(){
        if(!this._audioFile) {return tokenSays.log(false, 'No Audio File Path ', this._audioFile);} else {this.audioFile = this._audioFile}
        this.sound = await AudioHelper.play({src: this.audioFile, volume: this._say.volume, loop: false, autoplay: true}, true);
        await wait(this.maxDuration)
        game.socket.emit('module.token-says', {sound: this.sound.id})
        await this.sound.fade(0, {duration: 250})
        this.sound.stop();
    }

    /**
     * Method that executes the chat bubble 
    */
    async sayChatBubble() {
        if(this.token){ 
            const options = {}
            if(this.suppressPan) options.pan = false 
            if(this.language) options.language = this.language;
            canvas.hud.bubbles.broadcast(this.token, this.message, options);
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
        return (!tokenSaysHasPolyglot || (this.token?.actor && this.token.actor.system.traits.languages.value.includes(this.lang))) ? true : false
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
            requireVision: false,
            reverse: false
        }
    }

    get toDocumentNameList() {
        return parseSeparator(this.to.documentName)
    }

    get toNameList() {
        return parseSeparator(this.to.name)
    }
}
