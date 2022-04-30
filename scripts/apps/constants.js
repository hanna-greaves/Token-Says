import {says} from './says.js';
import {tokenSaysHasPolyglot, tokenSaysHasMQ} from '../index.js';

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
  
const UNIVERSALDOCUMENTTYPEOPS = {
    "effectAdd": "TOKENSAYS.document-type-options.effectAdd.label",
    "effectDelete": "TOKENSAYS.document-type-options.effectDelete.label",
    "initiative":  "TOKENSAYS.document-type-options.initiative.label",
    "flavor":  "TOKENSAYS.document-type-options.flavor.label",
    "macro":  "TOKENSAYS.document-type-options.macro.label",
    "move": "TOKENSAYS.document-type-options.move.label",
    "arrive": "TOKENSAYS.document-type-options.arrive.label",
    "prompt": "TOKENSAYS.document-type-options.prompt.label",
    "prompt-alt": "TOKENSAYS.document-type-options.prompt-alt.label",
    "reacts":  "TOKENSAYS.document-type-options.reacts.label",
    "say": "TOKENSAYS.document-type-options.say.label",
    "turn": "TOKENSAYS.document-type-options.turn.label"
}

const DND5EDOCUMENTTYPEOPS  = {
    "ability":  "TOKENSAYS.document-type-options.ability.label",
    "attack":  "TOKENSAYS.document-type-options.attack.label",
    "damage":  "TOKENSAYS.document-type-options.damage.label",
    "save": "TOKENSAYS.document-type-options.save.label",
    "skill":  "TOKENSAYS.document-type-options.skill.label"
}

const PF1DOCUMENTTYPEOPS  = {
    "ability":  "TOKENSAYS.document-type-options.ability.label",
    "attack":  "TOKENSAYS.document-type-options.attack.label",
    //"damage":  "TOKENSAYS.document-type-options.damage.label",
    "save": "TOKENSAYS.document-type-options.save.label",
    "skill":  "TOKENSAYS.document-type-options.skill.label"
}

const PF2EDOCUMENTTYPEOPS  = {
    "attack":  "TOKENSAYS.document-type-options.attack.label",
    "critical":  "TOKENSAYS.document-type-options.critical.label",
    "damage":  "TOKENSAYS.document-type-options.damage.label",
    "skill":  "TOKENSAYS.document-type-options.skill.label",
    "fumble":  "TOKENSAYS.document-type-options.fumble.label"
}

const MIDIQOLTYPEOPS = {
    "critical":  "TOKENSAYS.document-type-options.critical.label",
    "fumble":  "TOKENSAYS.document-type-options.fumble.label"
}

export const GAMETYPEOPS = {};

export function _determineWorldOptions(){
    const temp = {};
    Object.assign(temp, UNIVERSALDOCUMENTTYPEOPS);
    switch(game.world.data.system){
        case "dnd5e": 
            Object.assign(temp, DND5EDOCUMENTTYPEOPS); 
            if(tokenSaysHasMQ) Object.assign(temp, MIDIQOLTYPEOPS);
        break;
        case "pf2e":
           Object.assign(temp, PF2EDOCUMENTTYPEOPS)
           break;
        case "pf1":
            Object.assign(temp, PF1DOCUMENTTYPEOPS)
            break;
    }
    Object.assign(GAMETYPEOPS, 
        Object.entries(temp)
            .sort(([,a],[,b]) => game.i18n.localize(a).localeCompare(game.i18n.localize(b)))
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {})
        );
    Object.freeze(GAMETYPEOPS)
};


export const BYPASSNAMETYPES = ['initiative', 'turn'];

export function getUniversalDocumentNameOps(documentType) {
    switch (documentType) {
        case "say":
            return says.saysList
        default:
            return false
    }
};

export function getWorldDocumentNameOptions(documentType) {
    switch(game.world.data.system){
      case "dnd5e": return getDnd5eDocumentNameOps(documentType)
      case "pf1":  return getPF1DocumentNameOps(documentType)
      default: return getUniversalDocumentNameOps(documentType)
    }
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

export function getPolyglotLanguages() {
    return  tokenSaysHasPolyglot ? game.polyglot?.languages : false
}

export function getPF1DocumentNameOps(documentType){
    switch (documentType) {
        case "ability": 
            return game.pf1.config.abilities
        case "save":
            return game.pf1.config.savingThrows
        case "skill":
            return game.pf1.config.skills
        default:
            return getUniversalDocumentNameOps(documentType)
        }
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

export function determineMacroList() {
    let list = {};
    for (let macro of game.macros.contents.sort((a, b) => { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)})) {
      list[macro.id] = macro.name;
    }
    return list;
  }  

export function getCompendiumOps(fileType){
    return game.packs.filter((x) => x.documentName == FILETYPEENTITYTYPE[fileType]).reduce((obj, p) => {obj['']=''; obj[p.collection] = p.title; return obj;}, {})
}
  
export const DOCUMENTNAMELABELS = {
    "":"TOKENSAYS.document-type-label.action",
    "ability":  "TOKENSAYS.document-type-label.ability",
    "attack":  "TOKENSAYS.document-type-label.item",
    "damage":  "TOKENSAYS.document-type-label.item",
    "initiative": "TOKENSAYS.document-type-label.action",
    "save": "TOKENSAYS.document-type-label.ability",
    "skill":  "TOKENSAYS.document-type-label.skill",
    "effectAdd": "TOKENSAYS.document-type-label.effect",
    "effectDelete": "TOKENSAYS.document-type-label.effect",
    "flavor":  "TOKENSAYS.document-type-label.item",
    "macro":  "TOKENSAYS.document-type-label.macro",
    "move": "TOKENSAYS.document-type-label.scene",
    "arrive": "TOKENSAYS.document-type-label.scene",
    "prompt": "TOKENSAYS.document-type-label.scene",
    "prompt-alt": "TOKENSAYS.document-type-label.scene",
    "reacts": "TOKENSAYS.document-type-label.action",
    "say": "TOKENSAYS.document-type-label.saying",
    "turn": "TOKENSAYS.document-type-label.action",
    "critical":  "TOKENSAYS.document-type-label.item",
    "fumble":  "TOKENSAYS.document-type-label.item"
}

export const PLAYTYPE = {
    "": "TOKENSAYS.play-type.random",
    "S": "TOKENSAYS.play-type.sequential-end",
    "L": "TOKENSAYS.play-type.sequential-loop"
}
  