import {tokenSays} from '../token-says.js';

export function outOfRangNum(inNumber, min, max, returnIfOut){
    if(inNumber === null || isNaN(inNumber) || inNumber < min || inNumber > max) {return returnIfOut} else {return inNumber}
}

export function activeEffectToWorkflowData(document, isDelete = false){
    return {
        documentName: document.data.label,
        documentType: isDelete ? "effectDelete" : "effectAdd",
        speaker: {
            scene: document.parent.token ? document.parent.token.parent.id : canvas.scene.id, 
            actor: document.parent.id, 
            token: document.parent.token ? document.parent.token.id : canvas.scene.tokens.find(t => t.actor.id === document.parent.id)?.id, 
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
        speaker: {scene: combat.scene.id, actor: combat.combatant?.actor?.id, token: combat.combatant?.token?.id, alias: combat.combatant?.token?.name}
    }
}

export function getDistance(start, end, gridSpaces = true){
    return gridSpaces ? canvas.grid.measureDistances([{ray:_ray(start, end)}], {gridSpaces: true})[0] : _ray(start, end).distance 
}

export function inDistance(provokingToken, respondingToken, distance){
    return (getDistance(provokingToken.data, respondingToken.data) <= distance) ? true : false
}

export function inView(provokingToken, respondingToken){
    return (canvas.walls?.checkCollision(_ray(provokingToken.data, respondingToken.data)) || !respondingToken.hasSight) ? false : true
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
        if(f.roll?.abilityId) return parsed({documentType: f.roll.type, documentName: f.roll.abilityId});           
        if(f.roll?.type ==="attack" && f.roll?.itemId) return parsed({documentType: 'attack', itemId: f.roll.itemId});
        if(f.roll?.type ==="damage" && f.roll?.itemId) return parsed({documentType: 'damage', itemId: f.roll.itemId});
        if(f.roll?.itemId) return parsed({documentType: 'flavor', itemId: f.roll.itemId});        
    } else if(f=message.flags['midi-qol']) {
        if(f.type === 0) return parsed({documentType: 'flavor', documentName: message.flavor});         
        if(f.type === 1) return parsed({documentType: 'hit', itemId: f.itemId});        
        if(f.type === 2) return parsed({documentType: 'save', itemId: f.itemId});         
        if(f.type === 3) return parsed({documentType: 'attack', itemId: f.itemId});         
        if(f.type === 4) return parsed({documentType: 'damage', itemId: f.itemId});    
    } else if(f = message.flags['pf2e']) {
        if(f.context?.type === 'skill-check') return parsed({documentType: 'skill', documentName: f.modifierName.substring(f.modifierName.lastIndexOf(':')+2)});
        if(['attack-roll','spell-attack-roll'].includes(f.context?.type)) return parsed({documentType: 'attack', itemId: f.origin?.uuid ? f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1) : ''});
        if(f.damageRoll) return  parsed({documentType: 'damage',  itemId: f.origin?.uuid ? f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1) : ''})
        if(f.origin?.uuid) return  parsed({documentType: 'flavor', itemId: f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1)});
    } else if(f = message.flags['pf1']) {
        if(f.subject?.skill) return parsed({documentType: 'skill', documentName: f.subject.skill});
        if(f.subject?.ability) return parsed({documentType: 'ability', documentName: f.subject.ability});
        if(f.subject?.save) return parsed({documentType: 'save', documentName: f.subject.save});
        if (f.metadata?.rolls?.attacks) return parsed({documentType: 'attack', itemId: f.metadata.item});
        if(f.metadata?.item) return parsed({documentType: 'flavor', itemId: f.metadata.item});
        if(f.subject?.core === 'init') return parsed({documentType: 'initiative'});
    }
    if(message.flags.core?.initiativeRoll) return parsed({documentType: 'initiative'});  
    if(message.flavor) return parsed({documentType: 'flavor', documentName: message.flavor});
    if(message.document?.itemSource?.name) return parsed({documentType: 'flavor', documentName: message.document.itemSource.name})
}

export function midiToWorkflowData(midiWorkflow, rollType){
    if(!game.settings.get(tokenSays.ID,'suppressPrivateGMRoles') || !midiWorkflow.whisperAttackCard) {
        return {
            documentType: rollType, 
            itemId: midiWorkflow.itemId, 
            speaker: midiWorkflow.speaker
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

export function promptToWorkflowData(token, type){
    return {
        documentName: token.scene?.name,
        documentType: type,
        speaker: {scene: token.scene?.id, actor: token.actor?.id, token: token.id, alias: token.name}
    }
}

function _ray(start, end){
    const orig = new PIXI.Point(...canvas.grid.getCenter(start.x, start.y));
    const dest = new PIXI.Point(...canvas.grid.getCenter(end.x, end.y));
    return new Ray(orig, dest);
}