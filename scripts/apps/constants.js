export const FILETYPEENTITYTYPE = {
    rollTable: "RollTable",
    audio: "Playlist"
  }
  
export const UNIVERSALDOCUMENTTYPEOPS = {
"initiative":  "TOKENSAYS.document-type-options.initiative.label",
"flavor":  "TOKENSAYS.document-type-options.flavor.label",
"macro":  "TOKENSAYS.document-type-options.macro.label"
}

export const DND5EDOCUMENTTYPEOPS  = {
"ability":  "TOKENSAYS.document-type-options.ability.label",
"attack":  "TOKENSAYS.document-type-options.attack.label",
"damage":  "TOKENSAYS.document-type-options.damage.label",
"save": "TOKENSAYS.document-type-options.save.label",
"skill":  "TOKENSAYS.document-type-options.skill.label"
}

export const UNIVERSALDOCUMENTNAMEOPS = {};

export const DND5EDOCUMENTNAMEOPS = {};

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

export function getDnd5eDocumentNameOps(){
    return {
        "ability": game.dnd5e?.config.abilities,
        "save" : game.dnd5e?.config.abilities,
        "skill" : game.dnd5e?.config.skills
        }
}
  