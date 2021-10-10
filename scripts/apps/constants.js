import {says} from './says.js';

export const FILETYPEENTITYTYPE = {
    rollTable: "RollTable",
    audio: "Playlist"
  }

export const SEPARATOROPTIONS = {
    "|": "| (pipe)",
    "||": "|| (pipes)",
    ";": "; (semicolon)",
    "/": "/ (backslash)",
    ",": ", (comma)"
}
  
export const UNIVERSALDOCUMENTTYPEOPS = {
    "effectAdd": "TOKENSAYS.document-type-options.effectAdd.label",
    "effectDelete": "TOKENSAYS.document-type-options.effectDelete.label",
    "initiative":  "TOKENSAYS.document-type-options.initiative.label",
    "flavor":  "TOKENSAYS.document-type-options.flavor.label",
    "macro":  "TOKENSAYS.document-type-options.macro.label",
    "reacts":  "TOKENSAYS.document-type-options.reacts.label",
    "say": "TOKENSAYS.document-type-options.say.label"
}

export function getUniversalDocumentNameOps(documentType) {
    switch (documentType) {
        case "say":
            return says.saysList
        default:
            return false
    }
};

export const DND5EDOCUMENTTYPEOPS  = {
    "ability":  "TOKENSAYS.document-type-options.ability.label",
    "attack":  "TOKENSAYS.document-type-options.attack.label",
    "damage":  "TOKENSAYS.document-type-options.damage.label",
    "save": "TOKENSAYS.document-type-options.save.label",
    "skill":  "TOKENSAYS.document-type-options.skill.label"
}

export function getDnd5eDocumentNameOps(documentType){
    switch (documentType) {
        case "ability": 
            return game.dnd5e?.config.abilities
        case "save":
            return game.dnd5e?.config.abilities
        case "skill":
            return game.dnd5e?.config.skills
        default:
            return getUniversalDocumentNameOps(documentType)
        }
}

export const PF2EDOCUMENTTYPEOPS  = {
    "attack":  "TOKENSAYS.document-type-options.attack.label",
    "damage":  "TOKENSAYS.document-type-options.damage.label",
    "skill":  "TOKENSAYS.document-type-options.skill.label"
}

export const P52EDOCUMENTNAMEOPS  = {
    "ability":  {
        'Strength Check': 'Strength Check', 
        'Dexterity Check': 'Dexterity Check', 
        'Constitution Check': 'Constitution Check', 
        'Intelligence Check': 'Intelligence Check', 
        'Wisdom Check': 'Wisdom Check', 
        'Charisma Check': 'Charisma Check'
    }
}

export const TOKENFORMICONDISPLAYOPTIONS = {
    'B': 'TOKENSAYS.setting.tokenHeader.display.iconLabel', 
    'I': 'TOKENSAYS.setting.tokenHeader.display.iconOnly', 
    'N': 'TOKENSAYS.setting.tokenHeader.display.none'
};

export const SUPPRESSOPTIONS = {
    '': 'TOKENSAYS.setting.suppressOptions.none', 
    'A': 'TOKENSAYS.setting.suppressOptions.audio', 
    'R': 'TOKENSAYS.setting.suppressOptions.rollTable', 
    'X': 'TOKENSAYS.setting.suppressOptions.all'
};

export function getCompendiumOps(fileType){
    return game.packs.filter((x) => x.metadata.entity == FILETYPEENTITYTYPE[fileType]).reduce((obj, p) => {obj['']=''; obj[p.collection] = p.title; return obj;}, {})
}


  