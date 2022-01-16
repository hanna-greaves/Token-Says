import {tokenSays} from '../token-says.js';

export function nullTokenSaysRuleString(inString, returnIfNull){
    if(inString === undefined) {return returnIfNull} else {return inString}
}

export function outOfRangTokenSaysRuleInt(inNumber, min, max, returnIfOut){
    if(inNumber === null || isNaN(inNumber) || inNumber < min || inNumber > max) {return returnIfOut} else {return inNumber}
}

export function nullTokenSaysRuleBool(inBool, returnIfNotBool){
    if (inBool === undefined) {
        return returnIfNotBool 
    } else {
        return inBool
    }
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
    if(message.flags?.TOKENSAYS?.cancel) return
    if(game.settings.get(tokenSays.ID,'suppressPrivateGMRoles') && message.whisper?.length) return
    let f='';
    const options = {
        documentName: '',
        documentType: '',
        itemId: '',
        speaker: message.speaker
    }
    if(f=message.flags.dnd5e){
        if(f.roll?.skillId){
            options.documentType = 'skill'; options.documentName = f.roll.skillId;           
        } else if(f.roll?.abilityId){
            options.documentType = f.roll.type; options.documentName = f.roll.abilityId;           
        } else if(f.roll?.type ==="attack" && f.roll?.itemId) {
            options.documentType = 'attack'; options.itemId = f.roll.itemId;
        } else if(f.roll?.type ==="damage" && f.roll?.itemId) {
            options.documentType = 'damage'; options.itemId = f.roll.itemId;
        } else if(f.roll?.itemId){
            options.documentType = 'flavor';  options.itemId = f.roll.itemId;         
        } 
    } else if(f=message.flags['midi-qol']) {
        if (f.type === 0){
            options.documentType = 'flavor'; options.documentName = message.flavor;           
        } else if (f.type === 1){
            options.documentType = 'hit'; options.itemId = f.itemId;         
        } else if (f.type === 2){
            options.documentType = 'save'; options.itemId = f.itemId;          
        } else if (f.type === 3){
            options.documentType = 'attack'; options.itemId = f.itemId;          
        } else if (f.type === 4){
            options.documentType = 'damage'; options.itemId = f.itemId;     
        }
    } else if(f = message.flags['pf2e']) {
        if (f.context?.type === 'skill-check') {
            options.documentType = 'skill'; 
            options.documentName = f.modifierName.replace("Skill Check: ", ""); //e.g. Skill Check: Athletics
        } else if (f.context?.type === 'attack-roll') {
            options.documentType = 'attack'; 
            if(f.origin?.uuid){options.itemId = f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1)}
        } else if (f.damageRoll) {
            options.documentType = 'damage'; 
            if(f.origin?.uuid){options.itemId = f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1)}
        } else if (f.origin?.uuid) {
            options.documentType = 'flavor'; 
            options.itemId = f.origin.uuid.substring(f.origin.uuid.lastIndexOf('.')+1)
        } 
    } else if(f = message.flags['pf1']) {
        if (f.subject?.skill) {
            options.documentType = 'skill'; 
            options.documentName = f.subject.skill
        } else if (f.subject?.ability) {
            options.documentType = 'ability'; 
            options.documentName = f.subject.ability
        } else if (f.subject?.save) {
            options.documentType = 'save'; 
            options.documentName = f.subject.save
        } else if (f.metadata?.rolls?.attacks) {
            options.documentType = 'attack'; 
            options.itemId = f.metadata.item;
        } else if (f.metadata?.item) {
            options.documentType = 'flavor'; 
            options.itemId = f.metadata.item
        }  else if (f.subject?.core === 'init') {
            options.documentType = 'initiative'; 
        }  
    }
    else if (message.flags.core?.initiativeRoll) {
        options.documentType = 'initiative'; 
    }   
    else if(message.flavor){
        options.documentType = 'flavor'; 
        options.documentName =  message.flavor 
    }   
    else if(message.document?.itemSource?.name ){
        options.documentType = 'flavor'; 
        options.documentName =  message.document.itemSource.name
    }
    return options
}

export function midiToWorkflowData(midiWorkflow, rollType){
    if(game.settings.get(tokenSays.ID,'suppressPrivateGMRoles') && !midiWorkflow.whisperAttackCard) {
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

function _ray(start, end){
    const orig = new PIXI.Point(...canvas.grid.getCenter(start.x, start.y));
    const dest = new PIXI.Point(...canvas.grid.getCenter(end.x, end.y));
    return new Ray(orig, dest);
}