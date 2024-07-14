import {ACTORTYPES, BYPASSNAMETYPES, determineMacroList, DOCUMENTNAMELABELS, GAMETYPEOPS, getWorldDocumentNameOptions, getCompendiumOps, getPolyglotLanguages, PLAYTYPE, PLAYTYPEROLLTABLE, WHISPEROPTIONS} from './constants.js';
import {tokenSays} from '../token-says.js';
import {says} from './says.js';
import {parseSeparator, wildcardName} from './helpers.js';
/**
 * form extension supporting the form used to add or update an individual rules
*/
export class TokenSaysSayForm extends FormApplication {
    constructor(sayId, ...args) {
      super(...args),
      this.sayId = sayId
  }

  static get defaultOptions(){
    const defaults = super.defaultOptions;

    return foundry.utils.mergeObject(defaults, {
      title : game.i18n.localize("TOKENSAYS.setting.tokenSaysRule.name"),
      id : "token-says-rules-rule",
      classes: ["sheet", "token-says-rule"],
      template : tokenSays.TEMPLATES.SAY,
      width : 400,
      height : "auto",
      closeOnSubmit: true,
      tabs : [
        {navSelector: ".tabs", contentSelector: "form", initial: "basics"}
      ]   
    });
  }

  _determineWorldOptions(reacts) {
    return reacts ? (({ reacts, ...o }) => o)(GAMETYPEOPS) : (({ say, ...o }) => o)(GAMETYPEOPS)
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on('change', "#token-says-documenttype-value",(event) => {
      this._refreshDocumentNameOptions(event.currentTarget.value, '');
      let reactsDiv = document.getElementById(`token-says-reacts`);
      event.currentTarget.value === 'reacts' ? reactsDiv.classList.remove('hidden') : reactsDiv.classList.add('hidden');
      event.currentTarget.value === 'reacts' ? $(this.form).find(`[data-tab="reacts"]`).removeClass('hidden') :  $(this.form).find(`[data-tab="reacts"]`).addClass('hidden');
      let capDiv = document.getElementById(`token-says-cap`);
      if(capDiv) event.currentTarget.value === 'move' ? capDiv.classList.remove('hidden') : capDiv.classList.add('hidden');
      document.getElementById(`token-says-documentname-label`).innerHTML = this.documentNameLabel(event.currentTarget.value);
      this.setPosition();
    });
    html.on('change', "#token-says-documenttype-reacts-value",(event) => {
      this._refreshDocumentNameOptions(event.currentTarget.value, 'to.');
      document.getElementById(`token-says-documentname-reacts-label`).innerHTML = this.documentNameLabel(event.currentTarget.value);
      this._duplicateNameWarning();
    });
    html.on('change', "#token-says-fileTitle-audio-value",(event) => {
      let audioSeq = document.getElementById(`token-says-play-type-audio-label`);
      if(event.currentTarget.value){
        audioSeq.classList.add('hidden')
      } else {
        audioSeq.classList.remove('hidden')
      }
      this.setPosition();
    });  
    html.on('change', "#token-says-fileTitle-chat-value",(event) => {
      let chatFName = document.getElementById(`token-says-fileName-chat-label`);
      let chatCName = document.getElementById(`token-says-compendium-chat-label`);
      let chatSeq = document.getElementById(`token-says-play-type-chat-label`);
      if(event.currentTarget.value){
        chatFName.classList.add('hidden')
        chatCName.classList.add('hidden')
        chatSeq.classList.add('hidden')
      } else {
        chatFName.classList.remove('hidden')
        chatCName.classList.remove('hidden')
        chatSeq.classList.remove('hidden')
      }
      this.setPosition();
    });  
    html.on('change', '#token-says-documentname-reacts-value', this._duplicateNameWarning.bind(this));  
    html.on('input', '#token-says-name-value', this._duplicateNameWarning.bind(this));  
    html.on('input', '#token-says-name-value', this._existsCheck.bind(this, 'name')); 
    html.on('change', '#token-says-name-is-actor', this._existsCheck.bind(this, 'name'));  
    html.on('change', '#token-says-name-is-wildcard', this._existsCheck.bind(this, 'name'));  
    html.on('input', '#token-says-to-name-value', this._existsCheck.bind(this, 'to-name')); 
    html.on('change', '#token-says-to-name-is-actor', this._existsCheck.bind(this, 'to-name')); 
    html.on('change', '#token-says-to-name-is-wildcard', this._existsCheck.bind(this, 'to-name')); 
  }
  
  async _refreshDocumentNameOptions(documentType, reacts){
    let reactsHTML = reacts ? '-reacts' : '';
    const documentName = document.getElementById(`token-says-documentname${reactsHTML}-value`).value
    let documentNameSelectHTML = document.getElementById(`token-says-documentname${reactsHTML}`);
    documentNameSelectHTML.innerHTML = this._createNameOptionsHTML(documentType, documentName, reacts);
    this._documentNameWildcardHTML(documentType,reactsHTML)
  }

  _documentNameWildcardHTML(documentType, reacts){
    const suppress = this._suppressDocumentNameWildcard(documentType)
    const wc = document.getElementById(`token-says-documentname${reacts}-is-wildcard`)
    const formGroup = document.getElementById(`token-says-documentname${reacts}-is-wildcard-formgroup`)
    if(!wc) return 
    if(suppress) {
      wc.checked = false
      formGroup.classList.add('hidden')
    } else {
      formGroup.classList.remove('hidden')
    }
  }

  _suppressDocumentNameWildcard(documentType) {
    return (BYPASSNAMETYPES.includes(documentType) || documentType ==='reacts' || getWorldDocumentNameOptions(documentType)) ? true : false
  }

  _createNameOptionsHTML(documentType, documentName, reacts) {
    let finalHTML = '', reactsHTML = reacts ? '-reacts' : '', disabled = '';
    documentName = documentName ? documentName : '';
    const optionListOptions  = getWorldDocumentNameOptions(documentType);
    if(optionListOptions) {
      const sortedList = optionListOptions.dontSort ? optionListOptions : Object.entries(optionListOptions).sort(([,a],[,b]) => a.localeCompare(b))
      let optionList = '<option value=""></option>';
      for(let i = 0; i < sortedList.length; i++) {
        let selected = '';
        if (sortedList[i][0] === documentName) {
            selected = ' selected '
          }
        optionList += '<option value="'+ sortedList[i][0] +'" ' + selected + '>' + sortedList[i][1] + '</option>';
      }
      finalHTML = `<select id="token-says-documentname${reactsHTML}-value" name="${reacts}documentName" value="` + documentName + '">'+ optionList + '</select>'  
    } else {
      if(BYPASSNAMETYPES.includes(documentType) || documentType ==='reacts'){disabled = ' disabled '}
      finalHTML = `<input id="token-says-documentname${reactsHTML}-value" type="text" name="${reacts}documentName" value="` + documentName + '" ' + disabled + '/>'
    }
    return finalHTML
  }

  documentNameLabel(documentType){
    return (documentType && DOCUMENTNAMELABELS[documentType]) ? game.i18n.localize(DOCUMENTNAMELABELS[documentType]) : game.i18n.localize(DOCUMENTNAMELABELS[''])
  }

  getData(){
    const sy = says.getSay(this.sayId);
    return {
      say: sy,
      actorTypeOps: ACTORTYPES,
      documentTypeOptions: this._determineWorldOptions(false),
      documentTypeReactsOptions: this._determineWorldOptions(true),
      compendiumListRollTable: getCompendiumOps('rollTable'),
      compendiumListAudio: getCompendiumOps('audio'),
      documentNameLabel: this.documentNameLabel(sy.documentType),
      documentNameOptions: this._createNameOptionsHTML(sy.documentType, sy.documentName, ''),
      documentNameWildCardSuppress: this._suppressDocumentNameWildcard(sy.documentType),
      documentNameReactsOptions: this._createNameOptionsHTML(sy.to?.documentType, sy.to?.documentName, 'to.'),
      documentNameReactsWildCardSuppress: this._suppressDocumentNameWildcard(sy.to?.documentType),
      hasAudioFileTitle: sy.audioFileTitle ? true : false,
      hasChatFileTitle: sy.chatFileTitle ? true : false,
      isAudio: sy.isAudio,
      isMove: (sy.hasAudio && sy.documentType === 'move') ? true : false,
      isReact: sy.documentType === 'reacts' ? true : false,
      languageOptions: getPolyglotLanguages(),
      macroOps: determineMacroList(),
      playOptions: PLAYTYPE,
      rollTablePlayOptions: PLAYTYPEROLLTABLE,
      responseDocumentNameLabel: this.documentNameLabel(sy.to?.documentType),
      whisperOps: WHISPEROPTIONS
    } 
  }
  
  async _updateObject(event, formData) {
    const expandedData = foundry.utils.expandObject(formData); 
    await says.updateSay(expandedData.id, expandedData, true);
    tokenSays.TokenSaysSettingsConfig.refresh();
  }

  _duplicateNameWarning(){
    const warning = document.getElementById(`token-says-rule-dup-name-warning`);
    if(document.getElementById(`token-says-documenttype-reacts-value`).value === 'say'){
      document.getElementById(`token-says-to-name`).classList.add('hidden')
      document.getElementById(`token-says-to-name-is-actor`).disabled=true
      const reactsId = document.getElementById(`token-says-documentname-reacts-value`).value;
      if(document.getElementById(`token-says-name-value`).value === says.getSay(reactsId).name){ 
        warning.classList.remove('hidden')
      } else {
        warning.classList.add('hidden')
      }
    } else {
      warning.classList.add('hidden');
      document.getElementById(`token-says-to-name`).classList.remove('hidden')
      document.getElementById(`token-says-to-name-is-actor`).disabled=false
    }
    this.setPosition()
  }  

  _notExistsWarning(){
    this._existsCheck('name'); 
    this._existsCheck('to-name'); 
  }   

  _existsCheck(id){
    if (id ===`name` || id ===`to-name`){
      const fails = []; 
      const isWildcard = document.getElementById(`token-says-${id}-is-wildcard`).checked
      const isActor = document.getElementById(`token-says-${id}-is-actor`).checked;
      const warnId = isActor ? 'actor' : 'token'

      document.getElementById(`token-says-${id}-token-warning-container`).classList.add('hidden')
      document.getElementById(`token-says-${id}-actor-warning-container`).classList.add('hidden')

      const nameConcat = document.getElementById(`token-says-${id}-value`).value;
      if(nameConcat){
        const namesParsed = parseSeparator(nameConcat)
        const nameList = (!isWildcard ? namesParsed : wildcardName(isActor ? game.actors : [... new Set(game.scenes.map(s => s.tokens.map(t => t.name)).flat())], namesParsed, isActor ? false : true)) ;
        
        if(namesParsed.length > 0 && !nameList.length){
          fails.push(nameConcat)
        } else if(isActor){
          for (const actorName of nameList){
            if(!game.actors.getName(actorName)){fails.push(actorName)}
          }
        } else {
          for (const tokenName of nameList){
            if(!game.scenes.find(s => s.tokens.find(t => t.name===tokenName))){fails.push(tokenName)}
          }
        }
      }
      const warning = document.getElementById(`token-says-${id}-${warnId}-warning`);
      if(fails.length) {
        warning.innerHTML = fails.join(', ');
        document.getElementById(`token-says-${id}-${warnId}-warning-container`).classList.remove('hidden');
      } else {
        warning.innerHTML = '';
      }
      this.setPosition()
    }
  }
}