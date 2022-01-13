import {says} from './says.js';
import {tokenSay} from './say.js';
import {tokenSays} from '../token-says.js';
import {inDistance, inView} from './helpers.js';

export const WORKFLOWSTATES = {
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
        this.hook = (options.hook === undefined) ? '' : options.hook,
        this.id = foundry.utils.randomID(16),
        this.isResponse = (options.responseOptions === undefined) ? false : true
        this.itemId = options.itemId ? options.itemId : '',
        this.message = message,
        this.responses = [],
        this.responseOptions = options.responseOptions,
        this.say = (options.say === undefined) ? {} : options.say,
        this.says = (options.say === undefined) ? [] : [options.say],
        this.tokenSay = {},
        this.user = user
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

    get _tokenSayData(){
        return {
            token: this.token, 
            actor: this.actor, 
            speaker: this.speaker, 
            item: this.documentName, 
            response: this.responseOptions
        }
    }

    static async go(message, user, options){
        if(tokenSays._escapeGlobal) return this.log(tokenSays._escapeGlobal)
        const wf = new workflow(message, user, options);
        const result = await wf.next();
        return result
    }

    log(message, data){
        tokenSays.log(false,`${this.documentType ? this.documentType +' ' : ''}${message} ${this.id}...... `, {workflow: this, data:data});
    }

    async next(nextState){
        await this._next(nextState);
    }

    async _next(state){
        this.currentState = state;
        switch(state) {
            case WORKFLOWSTATES.NONE:
                return this.next(WORKFLOWSTATES.PARSE);
            case WORKFLOWSTATES.PARSE:
                if (this.hook==="createChatMessage") this._parseChatMessage()
                return this.next(WORKFLOWSTATES.GETITEM);
            case WORKFLOWSTATES.GETITEM:
                this._findItemName();
                return this.next(WORKFLOWSTATES.GETSAY);
            case WORKFLOWSTATES.GETSAY:
                if(!this.says.length) this.says = says.findSays(this.alias, this.actor?.name, this.documentType, this.documentName)
                return this.next(WORKFLOWSTATES.SAY);
            case WORKFLOWSTATES.SAY: 
                if (this.says.length) { 
                    for(const s of this.says){
                        this.say = s;
                        this.tokenSay = new tokenSay(this.say, this._tokenSayData)
                        if(this.tokenSay.valid) {
                            await this.tokenSay.ready();
                            await this.tokenSay.play();
                            this.log('say played', {tokenSay: this.tokenSay}); 
                            break;
                        }
                    }
                } else {
                    this.log('say not found', {});
                }
                if (!this.isResponse || (this.isResponse && this.tokenSay?.likelihoodMet) ){
                    return this.next(WORKFLOWSTATES.GETRESPONSES);
                } else {
                    return this.next(WORKFLOWSTATES.COMPLETE);
                }
            case WORKFLOWSTATES.GETRESPONSES:
                this.responses = says.findResponses(this.alias, this.actor?.name, this.documentType, this.documentName, this.tokenSay?.likelihoodMet ? this.say : {});
                return this.next(WORKFLOWSTATES.RESPONDS);
            case WORKFLOWSTATES.RESPONDS: 
                if (this.responses.length) {
                    this.log('responses found ', {});
                    this._respondsWorkflow()
                } 
                return this.next(WORKFLOWSTATES.COMPLETE);
            case WORKFLOWSTATES.CANCEL: 
                this.log('workflow canceled', {})
                return this
            case WORKFLOWSTATES.COMPLETE: 
                this.log('workflow complete', {})
                return this
        }
    } 

    hasCancelConditionResponse(token, exCon){
        if(!token.actor?.effects){return false}
        const sys = game.world.data.system;
        const conditions = game.settings.get('token-says', 'conditions').split('|').map(n => n.trim()).filter(n => n !== "")
        if(conditions.length){
            if(this.documentType !== 'reacts') {
                let i = conditions.indexOf(this.documentName); 
                if(i !== -1 && exCon){conditions.splice(i,1)}
            }
            if(conditions.length){
                if(token.actor.effects.find(
                    e => !e.data.disabled && (
                        conditions.indexOf(e.data.label) !== -1 
                        || (sys === 'pf1' && e.data.flags?.core?.statusId && conditions.indexOf(game.pf1.config.conditions[e.data.flags.core.statusId]) !== -1 )
                        )
                    )
                ) {
                    return true
                }
            }
        }
        return false
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
            } else if(f.roll?.itemId){
                this.documentType = 'flavor';  this.itemId = f.roll.itemId;         
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
        } else if(f = this.flags['pf1']) {
            if (f.subject?.skill) {
                this.documentType = 'skill'; 
                this.documentName = f.subject.skill
            } else if (f.subject?.ability) {
                this.documentType = 'ability'; 
                this.documentName = f.subject.ability
            } else if (f.subject?.save) {
                this.documentType = 'save'; 
                this.documentName = f.subject.save
            } else if (f.metadata?.rolls?.attacks) {
                this.documentType = 'attack'; 
                this.itemId = f.metadata.item;
            } else if (f.metadata?.item) {
                this.documentType = 'flavor'; 
                this.itemId = f.metadata.item
            }  else if (f.subject?.core === 'init') {
                this.documentType = 'initiative'; 
            }  
        }
        else if (this.flags.core?.initiativeRoll) {
            this.documentType = 'initiative'; 
        }   
        else if(this.message.flavor){
            this.documentType = 'flavor'; 
            this.documentName =  this.message.flavor 
        }   
        else if(this.message.document?.itemSource?.name ){
            this.documentType = 'flavor'; 
            this.documentName =  this.message.document.itemSource.name
        }
    }

    /**
     * Method that determines how best to find the item name, based on incoming data that has different structures
    */
    _findItemName(){
        if(this.itemId && !this.documentName){
            if(this.token) this.documentName = this.token?.actor.items.get(this.itemId)?.name;
            if(!this.documentName) this.documentName = this.actor?.items.get(this.itemId).name;
        }
    }

    async _respondsWorkflow(){
        if(!canvas?.tokens?.placeables){return}
        for (const rsp of this.responses){
            let tokens = (!rsp.isActorName) ? canvas.tokens.placeables.filter(t => rsp.nameList.includes(t.name)) : canvas.tokens.placeables.filter(t => t.actor?.id && rsp.nameList.includes(game.actors.get(t.actor?.id)?.name));
            for(const token of tokens){
                if(token.id === this.token.id) continue
                if(this.hasCancelConditionResponse(token, false)) continue
                if(rsp.to.requireVision && canvas.grid && canvas.dimensions && !inView(this.token, token)) continue
                if(rsp.to.distance && canvas.grid && canvas.dimensions && !inDistance(this.token, token, rsp.to.distance)) continue
     
                const message = new ChatMessage;
                message.data.speaker = {scene: this.scene.id, actor: token.data.actorId, token: token.id, alias: token.name};
                workflow.go(message.data, this.user, {say: rsp, responseOptions: {token: this.token, actor: this.actor, speaker: this.speaker, item: this.documentName}});
            }
        }
    }
}