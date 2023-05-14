import {says} from './says.js';
import {tokenSay} from './say.js';
import {tokenSays} from '../token-says.js';
import {inDistance, inView} from './helpers.js';

export const WORKFLOWSTATES = {
    INIT: 1,
    GETITEM: 3,
    GETSAY: 4,
    SAY: 10,
    GETEVENTRESPONSES: 20,
    GETSAYRESPONSES: 21,
    RESPONDS: 30,
    CANCEL: 98,
    COMPLETE: 99
}
/**
 * A class which handles the workflow
 */
 export class workflow {

    constructor(user, options) {
        this.continues = options.continues ?? false,
        this.continuesAwaited = [],
        this.currentState = WORKFLOWSTATES.INIT,
        this.diff = options.diff,
        this.documentName = (options.documentName === undefined) ? '' : options.documentName,
        this.documentType = (options.documentType === undefined) ? '' : options.documentType,
        this.id = foundry.utils.randomID(16),
        this.isCritical = options.isCritical,
        this.isFumble = options.isFumble,
        this.itemId = options.itemId ? options.itemId : '',
        this.responses = [],
        this.responsesAwaited = [],
        this.responseOptions = options.responseOptions,
        this.say = (options.say === undefined) ? {} : options.say,
        this.says = (options.say === undefined) ? [] : [options.say],
        this.speaker = options.speaker,
        this.tokenSay = {},
        this.user = user
    } 

    get actor() {
        return game.actors.get(this.speaker.actor)
    }

    get alias() {
        return this.speaker.alias;
    }

    get isResponse(){
        return this.responseOptions ? true : false
    }

    get saysSorted(){
        return this.says.sort((a,b) => 
             b.priority - a.priority 
             || (((b.name && !b.reverse) ? 1 : 0) - ((a.name && !a.reverse)) ? 1: 0)
             || (['critical','skill-crit'].includes(b.documentType) ? 1 : 0) - (['critical','skill-crit'].includes(a.documentType) ? 1 : 0) 
             || (['fumble','skill-fumble'].includes(b.documentType) ? 1 : 0) - (['fumble','skill-fumble'].includes(a.documentType) ? 1 : 0) 
             || (b.documentName ? 1 : 0) - (a.documentName ? 1: 0)
             || a.documentName.localeCompare(b.documentName)
             || (!b.reverse ? 1 : 0) - (!a.reverse ? 1 : 0)
             || (b.lang ? 1 : 0) - (a.lang ? 1: 0)
             || a.lang.localeCompare(b.lang)
        )                                   
    }

    get scene() {
        return game.scenes.get(this.speaker.scene)
    }

    get token() {
        const token = canvas?.scene?.tokens?.get(this.speaker.token)
        if (token) {return token}
        return this.scene?.tokens?.get(this.speaker.token);
    }

    get _tokenSayData(){
        return {
            diff: this.diff ? this.diff : (this.responseOptions?.diff ? this.responseOptions.diff : {}),
            token: this.token, 
            actor: this.actor, 
            speaker: this.speaker, 
            item: this.documentName, 
            response: this.responseOptions,
            user: this.user
        }
    }

    static escape(user, options){
        return (tokenSays.escape || game.userId !== user || (!options.speaker?.actor || !options.speaker?.alias || !options.speaker?.token)) ? true : false
    }

    static async go(user, options){
        if(workflow.escape(user, options)) return  tokenSays.log(false,'workflow escape hit')
        const wf = new workflow(user, options);
        if(wf.conditionEscape(wf.token)) return wf.log('condition escape hit')
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
                return this.next(WORKFLOWSTATES.GETITEM);
            case WORKFLOWSTATES.GETITEM:
                this._findItemName();
                return this.next(WORKFLOWSTATES.GETSAY);
            case WORKFLOWSTATES.GETSAY:
                if(!this.says.length) {
                    this.says = says.findSays(this.alias, this.actor, this.documentType, this.documentName)
                    if(this.documentType === 'damage' && this.isCritical) this.says = this.says.concat(says.findSays(this.alias, this.actor, 'critical', this.documentName))
                    if(this.documentType === 'attack' && this.isFumble) this.says = this.says.concat(says.findSays(this.alias, this.actor, 'fumble', this.documentName))
                    if(this.documentType === 'skill' && this.isCritical) this.says = this.says.concat(says.findSays(this.alias, this.actor, 'skill-crit', this.documentName))
                    if(this.documentType === 'skill' && this.isFumble) this.says = this.says.concat(says.findSays(this.alias, this.actor, 'skill-fumble', this.documentName))
                }
                return this.next(WORKFLOWSTATES.SAY);
            case WORKFLOWSTATES.SAY: 
                if(this.says.length) {
                    for(const s of this.saysSorted){
                        this.say = s;
                        this.tokenSay = new tokenSay(this.say, this._tokenSayData)
                        if(this.tokenSay.valid) {
                            await this.tokenSay.ready();
                            if (!this.isResponse) this.next(WORKFLOWSTATES.GETEVENTRESPONSES)
                            await this.tokenSay.play();
                            this.log('say played', {tokenSay: this.tokenSay}); 
                            break;
                        }
                    }
                } else {if (!this.isResponse) this.next(WORKFLOWSTATES.GETEVENTRESPONSES)}
                if (this.tokenSay.likelihoodMet) this.next(WORKFLOWSTATES.GETSAYRESPONSES)
                return this.next(WORKFLOWSTATES.COMPLETE);
            case WORKFLOWSTATES.GETEVENTRESPONSES:
                this.responses = says.findEventResponses(this.alias, this.actor?.name, this.documentType, this.documentName);
                if (this.responses.length) this._respondsWorkflow(this.responses)
                break;
            case WORKFLOWSTATES.GETSAYRESPONSES:
                this.responsesAwaited = this.tokenSay?.likelihoodMet ? says.findSayResponses(this.say) : []
                if(this.responsesAwaited.length) this._respondsWorkflow(this.responsesAwaited)
                break;
            case WORKFLOWSTATES.CANCEL: 
                this.log('workflow canceled', {})
                return this
            case WORKFLOWSTATES.COMPLETE: 
                this.log('workflow complete', {})
                return this
        }
    } 

    conditionEscape(token, escapeThisCondition = true){
        const conditions = tokenSays.conditionEscape
        if(conditions.length & escapeThisCondition && this.documentType !== 'reacts'){
            const i = conditions.indexOf(this.documentName); 
            if(i !== -1){conditions.splice(i,1)}
        }
        if(!conditions.length) return false

        if(game.system.id !== "pf2e"){
            if (token.actor?.effects?.find(
                e => !e.disabled && (
                    conditions.includes(e.label) 
                    || (game.world.system === 'pf1' && e.flags?.core?.statusId && conditions.includes(game.pf1.config.conditions[e.flags.core.statusId]))
                    )
                )
            ) return true
        }

        if(game.system.id === "pf2e"){
            if (token.actor?.items?.find(
                i => ["condition", "effect"].includes(i.type)
                    && conditions.includes(i.name) 
                )
                || (conditions.includes("Dead") && token.actor?.isDead)
            ) return true
        }
        
        return false
    }
    
    static async continuesWorkflow(saying){ 
        if(!canvas?.tokens?.placeables || !saying.token) return
        const continues = says.findSayContinues(saying._say)
        for (const cont of continues){
            const token =  canvas.tokens.placeables.find(t => t.id === saying.token.id && (!cont.nameList || cont.nameList.includes(cont.isActorName ? game.actors.get(t.actor?.id)?.name : t.name) !== cont.reverse));
            //const token = !cont.isActorName ? canvas.tokens.placeables.find(t => t.id === saying.token.id && (cont.reverse ? !cont.nameList.includes(t.name) : cont.nameList.includes(t.name))) : canvas.tokens.placeables.find(t => t.actor?.id && t.id === saying.token.id && (cont.reverse ? !cont.nameList.includes(game.actors.get(t.actor?.id)?.name) : cont.nameList.includes(game.actors.get(t.actor?.id)?.name)));
            if(token) workflow.go(saying.user, {say: cont, speaker: saying.speaker, continues: true});
        }
    }

    /**
     * Method that determines how best to find the item name, based on incoming data that has different structures
    */
    _findItemName(){
        if(this.itemId && !this.documentName){
            if(this.token) this.documentName = this.token?.actor.items.get(this.itemId)?.name;
            if(!this.documentName) this.documentName = this.actor?.items.get(this.itemId)?.name;
        }
    }

    async _respondsWorkflow(responses){
        if(!canvas?.tokens?.placeables || !this.token){return}
        for (const rsp of responses){
            const tokens = canvas.tokens.placeables.filter(t => !rsp.nameList || rsp.nameList.includes(rsp.isActorName ? game.actors.get(t.actor?.id)?.name : t.name) !== rsp.reverse);
            //let tokens = !rsp.isActorName ? canvas.tokens.placeables.filter(t => (rsp.reverse ? !rsp.nameList.includes(t.name) : rsp.nameList.includes(t.name))) : canvas.tokens.placeables.filter(t => t.actor?.id && (rsp.reverse ? !rsp.nameList.includes(game.actors.get(t.actor?.id)?.name) : rsp.nameList.includes(game.actors.get(t.actor?.id)?.name)));
            for(const token of tokens){
                if(token.id === this.token.id) continue
                if(this.conditionEscape(token, false)) continue
                if(rsp.to.requireVision && canvas.grid && canvas.dimensions && !inView(this.documentType === 'move' ? {data: this.diff.start} : this.token, token)) continue
                if(rsp.to.distance && canvas.grid && canvas.dimensions && !inDistance(this.documentType === 'move' ? {data: this.diff.start} : this.token, token, rsp.to.distance)) continue
                workflow.go(this.user, {say: rsp, speaker: {scene: this.scene.id, actor: token.actor.id, token: token.id, alias: token.name}, responseOptions: {diff: this.diff, token: this.token, actor: this.actor, speaker: this.speaker, item: this.documentName}});
            }
        }
    }
}