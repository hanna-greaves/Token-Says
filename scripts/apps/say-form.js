import {UNIVERSALDOCUMENTTYPEOPS, DND5EDOCUMENTTYPEOPS, UNIVERSALDOCUMENTNAMEOPS, getDnd5eDocumentNameOps, getCompendiumOps} from './constants.js';
import {tokenSays} from '../token-says.js';
import {says} from './says.js';

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
      template : tokenSays.TEMPLATES.SAY,
      width : 700,
      height : "auto",
      closeOnSubmit: true
    });
  }

  _determineWorldOptions() {
    if (game.world.data.system === "dnd5e"){ return {...DND5EDOCUMENTTYPEOPS, ...UNIVERSALDOCUMENTTYPEOPS}} 
    return UNIVERSALDOCUMENTTYPEOPS;
  }

  _determineWorldDocumentNameOptions(documentType) {
    let allOps = UNIVERSALDOCUMENTNAMEOPS;
    if (game.world.data.system === "dnd5e"){ allOps = {...getDnd5eDocumentNameOps(), ...UNIVERSALDOCUMENTNAMEOPS}} 
    return allOps[documentType];
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('select').change((event) => {
      if(event.currentTarget.id === "token-says-documenttype-value") {
        let documentType = event.currentTarget.value;
        this._refreshDocumentNameOptions(documentType);
      }
    });
  }
  
  async _refreshDocumentNameOptions(documentType){
    const documentName = document.getElementById("token-says-documentname-value").value
    let documentNameSelectHTML = document.getElementById("token-says-documentname");
    documentNameSelectHTML.innerHTML = this._createNameOptionsHTML(documentType, documentName);
  }

  _createNameOptionsHTML(documentType, documentName) {
    const inputTypes = ['macro', 'flavor', 'attack', 'damage', 'initiative', ''];
    let finalHTML = '';
    const optionListOptions  = this._determineWorldDocumentNameOptions(documentType);
    if (inputTypes.indexOf(documentType) === -1){
      let optionList = '<option value=""></option>';
      for (var option in optionListOptions) {
        let selected = '';
        if (option === documentName) {
            selected = ' selected '
          }
        optionList += '<option value="'+ option +'" ' + selected + '>' + optionListOptions[option] + '</option>';
      }
      finalHTML = '<select id="token-says-documentname-value" name="documentName" value="' + documentName + '">'+ optionList + '</select>'  
    } else {
      let disabled = ''
      if(documentType ==='initiative'){disabled = ' disabled '}
      finalHTML = '<input id="token-says-documentname-value" type="text" name="documentName" value="' + documentName + '" ' + disabled + '/>'
    }
    return finalHTML
  }

  getData(options){
    const sy = says.getSay(this.sayId);
    return {
      say: sy,
      documentTypeOptions: this._determineWorldOptions(),
      compendiumList: getCompendiumOps(sy.fileType),
      documentNameOptions: this._createNameOptionsHTML(sy.documentType, sy.documentName)
    } 
  }
  
  async _updateObject(event, formData) {
    const expandedData = foundry.utils.expandObject(formData); 
    await says.updateSay(expandedData.id, expandedData);
    tokenSays.TokenSaysSettingsConfig.refresh();
  }
}