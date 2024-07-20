import {tokenSays} from '../token-says.js';
import {PF2ESKILLOPS, PF2ESAVEOPS, PF2EABILITYOPS} from './constants.js';

export function outOfRangNum(inNumber, min, max, returnIfOut){
    if(inNumber === null || isNaN(inNumber) || inNumber < min || inNumber > max) {return returnIfOut} else {return inNumber}
}

export function activeEffectToWorkflowData(document, isDelete = false){
    return {
        documentName: document.label,
        documentType: isDelete ? "effectDelete" : "effectAdd",
        speaker: {
            scene: document.parent.token ? document.parent.token.parent.id : canvas.scene.id, 
            actor: document.parent.id, 
            token: document.parent.token ? document.parent.token.id : canvas.scene.tokens.find(t => t.actor && t.actor?.id === document.parent.id)?.id, 
            alias: document.parent.token ? document.parent.token.name : document.parent.name
        }
    }
}

export function checkToWorkflowData(actor, type, check, options){
    if(options?.messageData) return //kicked out because these will be handled in chat message parsing 
    return {
        documentName: check,
        documentType: type,
        speaker: {
            scene: actor.token ? actor.token.parent.id : game.scenes.current.id, 
            actor: actor.id, 
            token: actor.token?.id, 
            alias: actor.token ? actor.token.name : actor.name
        }
    }
}

export function combatTurnToWorkflowData(combat){
    if(game.user.isGM && combat.started && !(combat.current.round === 1 && combat.current.turn === 0 && combat.combatants.find(c => c.initiative === null)))
    return {
        documentName: '',
        documentType: 'turn',
        speaker: {scene: combat.scene?.id ?? canvas.scene.id, actor: combat.combatant?.actor?.id, token: combat.combatant?.token?.id, alias: combat.combatant?.token?.name}
    }
}

export function getDistance(start, end, gridSpaces = true){
    return gridSpaces ? canvas.grid.measureDistances([{ray:_ray(start, end)}], {gridSpaces: true})[0] : _ray(start, end).distance 
}

export function inDistance(provokingToken, respondingToken, distance){
    const d = getDistance(provokingToken, respondingToken)
    return (d <= distance) ? true : false
}

export function inView(provokingToken, respondingToken){
    const r = new Ray(provokingToken?.object?.center ?? provokingToken, respondingToken.center), options = {type:"sight" }
    return (CONFIG.Canvas.polygonBackends.sight.testCollision(r.A, r.B, options).length || !respondingToken.hasSight) ? false : true
}


export function chatMessageToWorkflowData(message){
    if(message.flags?.TOKENSAYS?.cancel || (game.settings.get(tokenSays.ID,'suppressPrivateGMRoles') && message.whisper?.length)) return
    let f='';
    const options = {
        documentName: '',
        documentType: '',
        itemId: '',
        speaker: message.speaker
    }
    function parsed(edits) {
        Object.assign(options, edits);
        return options
    }
    if(f=message.flags.dnd5e){
        if(f.roll?.skillId) return parsed({documentType: 'skill', documentName: f.roll.skillId});          
        if(f.roll?.abilityId) return parsed({documentType: f.roll.type === 'check' ? 'ability' : f.roll.type, documentName: f.roll.abilityId});           
        if(f.roll?.type ==="attack" && f.roll?.itemId) return parsed({documentType: 'attack', itemId: f.roll.itemId});
        if(f.roll?.type ==="damage" && f.roll?.itemId) return parsed({documentType: 'damage', itemId: f.roll.itemId, isCritical: message?.rolls[0]?.isCritical ?? false});
        if(f.roll?.itemId) return parsed({documentType: 'flavor', itemId: f.roll.itemId});        
    } else if(f=message.flags['midi-qol']) {
        if(f.type === 0) return (f.itemId ? parsed({documentType: 'flavor', itemId: f.itemId}) : parsed({documentType: 'flavor', documentName: message.flavor}));
        if(f.type === 1) return parsed({documentType: 'hit', itemId: f.itemId});        
        if(f.type === 2) return parsed({documentType: 'save', itemId: f.itemId});         
        if(f.type === 3) return parsed({documentType: 'attack', itemId: f.itemId});         
        if(f.type === 4) return parsed({documentType: 'damage', itemId: f.itemId});    
    } else if(f = message.flags['pf2e']) {
        if(['skill-check', 'perception-check'].includes(f.context?.type)) {
            let pf2esksel = f.context?.type === 'perception-check' ? 'system.skills.per' : f.context?.notes?.find(n => n.selector && PF2ESKILLOPS[n.selector])?.selector;
            let skillName =  f.modifierName.substring(f.modifierName.indexOf(':') >= 0 ? f.modifierName.lastIndexOf(':')+2 : 0)
            skillName = skillName[0]?.toUpperCase() + skillName?.substring(1)
            return parsed({documentType: 'skill', documentName: pf2esksel ? PF2ESKILLOPS[pf2esksel] : skillName, isFumble: f.context?.outcome === "criticalFailure" ? true : false, isCritical: f.context?.outcome === "criticalSuccess" ? true : false});
        }
        if(f.context?.type === 'saving-throw') return parsed({documentType: 'save', documentName: Object.values(PF2ESAVEOPS).find(s => f.modifierName?.toLowerCase().includes(s.toLowerCase()))});
        if(['attack-roll','spell-attack-roll'].includes(f.context?.type)) return parsed({documentType: 'attack', itemId: f.origin?.uuid ? f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1) : '', isFumble: f.context?.outcome === "criticalFailure" ? true : false});
        if(['damage-roll','spell-damage-roll'].includes(f.context?.type)) return  parsed({documentType: 'damage',  itemId: f.origin?.uuid ? f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1) : '', isCritical: f.context?.outcome === "criticalSuccess" ? true : false})
        if(f.origin?.uuid) return  parsed({documentType: 'flavor', itemId: f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1)});
        if(f.context?.type === "" && Object.values(PF2EABILITYOPS).find(s => message.flavor?.includes(s))) return parsed({documentType: 'ability', documentName: Object.values(PF2EABILITYOPS).find(s => message.flavor?.includes(s))});
    } else if(f = message.flags['pf1']) {
        if(f.subject?.skill) return parsed({documentType: 'skill', documentName: f.subject.skill});
        if(f.subject?.ability) return parsed({documentType: 'ability', documentName: f.subject.ability});
        if(f.subject?.save) return parsed({documentType: 'save', documentName: f.subject.save});
        if (f.metadata?.rolls?.attacks) return parsed({documentType: 'attack', itemId: f.metadata.item});
        if(f.metadata?.item) return parsed({documentType: 'flavor', itemId: f.metadata.item});
        if(f.subject?.core === 'init') return parsed({documentType: 'initiative'});
    }
    if(message.flags.core?.initiativeRoll) return parsed({documentType: 'initiative'});
    const prs = message.content ? _parseChatMessageHTML(message) : false;
    if(prs) return parsed({documentType: 'flavor', itemId: prs});  
    if(message.flavor) return parsed({documentType: 'flavor', documentName: message.flavor});
    if(message.document?.itemSource?.name) return parsed({documentType: 'flavor', documentName: message.document.itemSource.name})
}

function _parseChatMessageHTML(message){
    const parser = new DOMParser()
    const html = parser.parseFromString(message.content, 'text/html')
    if(html) return html.querySelectorAll(`div[data-item-id]`)[0]?.getAttribute("data-item-id");
}

export function midiToWorkflowData(midiWorkflow, rollType){
    if(!game.settings.get(tokenSays.ID,'suppressPrivateGMRoles') || !midiWorkflow.whisperAttackCard) {
        return {
            documentType: rollType, 
            itemId: midiWorkflow.itemId, 
            speaker: midiWorkflow.speaker,
            isCritical: midiWorkflow.isCritical,
            isFumble: midiWorkflow.isFumble
        }
    }
}

export function movementToWorkflowData(token, userId, diff){
    return {
        documentName: token.parent.name,
        documentType: 'move',
        speaker: {scene: token.parent.id, actor: token.actor?.id, token: token.id, alias: token.name},
        diff: diff
    }
}

export function parseSeparator(string){
    const sep = game.settings.get(tokenSays.ID, 'separator');
    return string.split(sep).map(n => n.trim())
}

export function pf2eItemToWorkflowData(document,  isDelete = false) {
    return {
        documentName: document.name,
        documentType: isDelete ? "effectDelete" : "effectAdd",
        speaker: {
            scene: document.parent.token ? document.parent.token.parent.id : canvas.scene.id, 
            actor: document.parent.id,
            token: document.parent.token ? document.parent.token.id : canvas.scene.tokens.find(t => t.actor && t.actor?.id === document.parent.id)?.id, 
            alias: document.parent.token ? document.parent.token.name : document.parent.name
        }
    }
}

export function promptToWorkflowData(token, type){
    return {
        documentName: token.scene?.name,
        documentType: type,
        speaker: {scene: token.scene?.id, actor: token.actor?.id, token: token.id, alias: token.name}
    }
}


export function damageToWorkflowData(d, change, diff){
    if(change.system?.attributes?.hp?.value === undefined) {
        return
    }
    let dmgSystem = '';
    if(diff.dnd5e) {
        dmgSystem = 'dnd5e'
 
    } else if(diff.damageTaken) {
        dmgSystem = 'pf2e'
    } else {
        // TODO: Pf1e
        // More systems can be handled later
        return
    }

   const hpDiff = {
        start: 0,
        end: 0,
        max: 0,
    }

    if(dmgSystem === 'dnd5e') {
        hpDiff.start = diff.dnd5e.hp.value
        hpDiff.end = change.system.attributes.hp.value
    } else {
        hpDiff.start = change.system.attributes.hp.value + diff.damageTaken
        hpDiff.end = change.system.attributes.hp.value
    }

    // This is healing, not damage. I'll handle this scenario at a later date
    if(hpDiff.end >= hpDiff.start) {
        return
    }

    hpDiff.max = d.system.attributes.hp.max

    const taken = hpDiff.start - hpDiff.end
    let dmgLevel = 'avg'
    if(taken >= hpDiff.max * .5) {        
        dmgLevel = 'major'
    } else if (taken < hpDiff.max * .20) {
        dmgLevel = 'minor'
    }
    return {
        documentName: dmgLevel,
        documentType: 'incoming-damage',
        speaker: {
            scene: canvas.scene.id, 
            actor: d.id,
            token: canvas.scene.tokens.find(t => t.actor && t.actor?.id === d.id)?.id, 
            alias: d.parent ? d.parent.name : d.name
        },
        diff: hpDiff,
    }
}


function _ray(start, end){
    const orig = new PIXI.Point(...canvas.grid.getCenter(start.x, start.y));
    const dest = new PIXI.Point(...canvas.grid.getCenter(end.x, end.y));
    return new Ray(orig, dest);
}

export function wildcardName(ObjArr, names, isNameArray = false){
    const pool = isNameArray ? ObjArr : [...new Set(ObjArr.filter(o => o.name).map(obj => obj.name))]
    const wc = str => pool.filter(
        p => new RegExp('^' + str.replace(/\*/g, '.*') + '$').test(p)
    );
    let arr = []
    for(const name of names) {
        const res = wc(name)
        arr = arr.concat(res.filter(r => !arr.includes(r)))
    }
    return arr
}

export function regTestTermList(wildcardTerms, test){
    return wildcardTerms.find(
        t => new RegExp('^' + t.replace(/\*/g, '.*') + '$').test(test)
    );
}