
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
        speaker: {scene: document.parent.token.parent.id, actor: document.parent.id, token: document.parent.token.id, alias: document.parent.token.name}
    }
}