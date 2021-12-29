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

export async function checkToWorkflowData(actor, roll, type, check){
    if(check.messageData){//kicked out because these will be handled in chat message parsing 
        return
    }
    const token = roll.tokenId ? await fromUuid(roll.tokenId ) : canvas.scene.tokens.getName(roll.actor?.name)
    const sceneId = token ? token.parent.id : game.scenes.current.id
    const alias = token ? token.name : actor.name
    return {
        documentName: check,
        documentType: type,
        speaker: {scene: sceneId, actor: actor.id, token: token?.id, alias: alias}
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

export function parseSeparator(string){
    const sep = game.settings.get(tokenSays.ID, 'separator');
    return string.split(sep).map(n => n.trim())
}