import {says} from './says.js';
import {tokenSays} from '../token-says.js';

export const WORKFLOWSTATES = {
    GLOBALESCAPE: 0,
    INIT: 1,
    PARSE: 2,
    GETITEM: 3,
    GETSAY: 4,
    SAY: 10,
    GETRESPONSES: 20,
    RESPONDS: 21,
    CANCEL: 98,
    COMPLETE: 99
}
/**
 * A class which handles the workflow
 */
 export class workflow {

    constructor(message, user, options) {
        this.currentState = WORKFLOWSTATES.INIT,
        this.documentName = (options.documentName === undefined) ? '' : options.documentName,
        this.documentType = (options.documentType === undefined) ? '' : options.documentType,
        this.escape = false,
        this.escapeReason = '',
        this.hook = (options.hook === undefined) ? '' : options.hook,
        this.id = foundry.utils.randomID(16),
        this.isResponse = (options.isResponse === undefined) ? false : options.isResponse,
        this.itemId = '',
        this.message = message,
        this.responses = [],
        this.say = (options.say === undefined) ? {} : options.say,
        this.sayResult = {},
        this.user = user
    } 

    log(message, data){
        tokenSays.log(false,`${message} ${this.id}...... `, {workflow: this, data:data});
    }

    get actor() {
        return game.actors.get(this.speaker.actor)
    }

    get alias() {
        return this.speaker.alias;
    }

    get flags() {
        return this.message.flags
    };

    get scene() {
        return game.scenes.get(this.speaker.scene)
    }

    get speaker() {
        return this.message.speaker 
    }

    get token() {
        const token = canvas?.tokens?.get(this.speaker.token)
        if (token) {return token}
        return this.scene?.tokens?.get(this.speaker.token);
    }

    async next(nextState){
        if(this.escape){nextState = WORKFLOWSTATES.CANCEL}
        await this._next(nextState);
    }

    async _next(state){
        this.currentState = state;
        switch(state) {
            case WORKFLOWSTATES.NONE:
                return this.next(WORKFLOWSTATES.GLOBALESCAPE);
            case WORKFLOWSTATES.GLOBALESCAPE:
                this._escapeGlobal();
                return this.next(WORKFLOWSTATES.PARSE);
            case WORKFLOWSTATES.PARSE:
                this.log('Parsing message ', {});
                if(this.documentName !== 'direct'){
                    if (this.hook==="createChatMessage") {
                        this._parseChatMessage()
                    } else {
                        this._parseHook()
                    }
                }
                return this.next(WORKFLOWSTATES.GETITEM);
            case WORKFLOWSTATES.GETITEM:
                this.log('Getting Item ', {});
                this._findItemName();
                return this.next(WORKFLOWSTATES.GETSAY);
            case WORKFLOWSTATES.GETSAY:
                this.log('Getting Say ', {});
                if(!Object.keys(this.say).length){
                    this.say = says.findSay(this.alias, this.actor.name, this.documentType, this.documentName)
                }
                return this.next(WORKFLOWSTATES.SAY);
            case WORKFLOWSTATES.SAY: 
                if (Object.keys(this.say).length) { 
                    this.log('Say found', {})
                    this.sayResult = await this.say.say(this.token, this.actor, this.speaker)
                } else {
                    this.log('Say not found', {});
                }
                if (!this.isResponse || (this.isResponse && this.sayResult?.likelihood?.doesSay) ){
                    return this.next(WORKFLOWSTATES.GETRESPONSES);
                } else {
                    return this.next(WORKFLOWSTATES.COMPLETE);
                }
            case WORKFLOWSTATES.GETRESPONSES:
                this.log('Getting Responses ', {});
                this.responses = says.findResponses(this.alias, this.actor.name, this.documentType, this.documentName, this.sayResult?.likelihood?.doesSay ? this.say : {});
                return this.next(WORKFLOWSTATES.RESPONDS);
            case WORKFLOWSTATES.RESPONDS: 
                if (this.responses.length) {
                    this._respondsWorkflow()
                } else {
                    this.log('Responses not found', {});
                }
                return this.next(WORKFLOWSTATES.COMPLETE);
            case WORKFLOWSTATES.CANCEL: 
                this.log('TokenSays workflow canceled', {})
                return this
            case WORKFLOWSTATES.COMPLETE: 
                this.log('TokenSays workflow complete', {})
                return this
        }
    } 
    
    /**
     * Performs escape of token says if certain game settings are matched. Settings may be world or client.
    */
    _escapeGlobal(){
        if (this.flags?.TOKENSAYS?.cancel){
            this.escape = true,
            this.escapeReason = 'Token Says flag'
        } else if (game.user?.id !== this.user){
            this.escape = true,
            this.escapeReason = 'Chat user is not game user'
        } else if(!this.message?.speaker?.actor || !this.message?.speaker?.alias || !this.message?.speaker?.token){
            this.escape = true,
            this.escapeReason = 'No speaker in message data'
        } else if(!game.settings.get('token-says','isActive')){
            this.escape = true,
            this.escapeReason = 'Token Says is set to Inactive'
        } else if (game.settings.get('token-says','suppressPrivateGMRoles') && (this.message.whisper?.length || this.message.whisperAttackCard)){
            this.escape = true,
            this.escapeReason = 'Private GM Roll to be escaped due to world settings'
        } 
        return;
    }

    /**
     * Method that parses the message to attempt to determine what action the token or actor just did
    */
    _parseChatMessage(){
        let f='';
        if(f=this.flags.dnd5e){
            if(f.roll?.skillId){
                this.documentType = 'skill'; this.documentName = f.roll.skillId;           
            } else if(f.roll?.abilityId){
                this.documentType = f.roll.type; this.documentName = f.roll.abilityId;           
            } else if(f.roll?.type ==="attack" && f.roll?.itemId) {
                this.documentType = 'attack'; this.itemId = f.roll.itemId;
            } else if(f.roll?.type ==="damage" && f.roll?.itemId) {
                this.documentType = 'damage'; this.itemId = f.roll.itemId;
            }
        } else if(f=this.flags['midi-qol']) {
            if (f.type === 0){
                this.documentType = 'flavor'; this.documentName = this.message.flavor;           
            } else if (f.type === 1){
                this.documentType = 'hit'; this.itemId = f.itemId;         
            } else if (f.type === 2){
                this.documentType = 'save'; this.itemId = f.itemId;          
            } else if (f.type === 3){
                this.documentType = 'attack'; this.itemId = f.itemId;          
            } else if (f.type === 4){
                this.documentType = 'damage'; this.itemId = f.itemId;     
            }
        } else if(f = this.flags['pf2e']) {
            if (f.context?.type === 'skill-check') {
                this.documentType = 'skill'; 
                this.documentName = f.modifierName.replace("Skill Check: ", ""); //e.g. Skill Check: Athletics
            } else if (f.context?.type === 'attack-roll') {
                this.documentType = 'attack'; 
                if(f.origin?.uuid){this.itemId = f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1)}
            } else if (f.damageRoll) {
                this.documentType = 'damage'; 
                if(f.origin?.uuid){this.itemId = f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1)}
            } else if (f.origin?.uuid) {
                this.documentType = 'flavor'; 
                this.itemId = f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1)
            } 
        }
        else if (this.flags.core?.initiativeRoll) {
            this.documentType = 'initiative'; 
        }   
        else if(this.message.flavor !== ""){this.documentType = 'flavor'; this.documentName =  this.message.flavor;}
    }

    /**
     * Method that parses a data passed in via a hooked operation that may or may not have the same structure as message data
    */
    _parseHook () {
        if (this.hook==="midi-qol.AttackRollComplete"){
            this.documentType = 'attack'; this.itemId = this.message.itemId;
        } else if (this.hook==="midi-qol.DamageRollComplete"){
            this.documentType = 'damage'; this.itemId = this.message.itemId;
        }
    }

    /**
     * Method that determines how best to find the item name, based on incoming data that has different structures
    */
    _findItemName(){
        if(this.itemId && !this.documentName){
            if(this.token) {
                this.documentName = this.token?.actor.items.get(this.itemId)?.name; 
            }
            if(!this.documentName){
                this.documentName = this.actor?.items.get(this.itemId).name;
            }
        }
    }

    async _respondsWorkflow(){
        for (let i = 0; i < this.responses.length; i++){
            const rsp = this.responses[i];
            let tokens = [];

            if(!rsp.isActorName) {
                tokens = this.scene.tokens.filter(t => t.name===rsp.name)
            } else {
                tokens = this.scene.tokens.filter(t => t.actor?.data?.name===rsp.name)
            }

            for(let i=0; i<tokens.length; i++){
                const token = tokens[i];
                const alias = token.name, actorId = token.data.actorId, tokenId = token.id, message = new ChatMessage;
                if(tokenId === this.token.id) {
                    this.log('TokenSays response killed - loop', {id: rsp.id, respondingToken: tokenId, speakingToken: this.token.id})
                } else {
                    message.data.speaker = {scene: this.scene.id, actor: actorId, token: tokenId, alias: alias};
                    const wf = new workflow(message.data, this.user, {say: rsp, isResponse: true} );
                    wf.next();
                }
            }
        }
    }
}