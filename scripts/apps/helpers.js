
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