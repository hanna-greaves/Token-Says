/*
 * MIT License
 * 
 * Copyright (c) 2020-2021 Token Says Team and Contributers
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * form extension supporting the form that lists all rules
*/
class TokenSaysSettingsConfig extends SettingsConfig{
  static get defaultOptions(){
    const defaults = super.defaultOptions;

    const overrides = {
      title : game.i18n.localize("TOKENSAYS.setting.tokenSaysRules.name"),
      id : "token-says-rules",
      template : tokenSays.TEMPLATES.TOKENSAYS,
      width : 700,
      height : "auto",
      closeOnSubmit: false,
      submitOnChange: true, 
      tokenSaysCurrentSearch: null,
      tabs : [
        {navSelector: ".tabs", contentSelector: ".content", initial: tokenSaysSettingsTab}
      ],
    };

    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

    return mergedOptions;
  }

  async _handleButtonClick(event) {
    const clickedElement = $(event.currentTarget);
    const action = clickedElement.data().action;
    const tokenSaysRuleId = clickedElement.parents('[data-id]')?.data()?.id;
    tokenSays.log(false, 'Button Clicked!', {action, tokenSaysRuleId});

    switch (action) {
      case 'create-audio': {
        const newRule =  await tokenSaysData.createTokenSaysAudioRule(); 
        this.refresh();
        tokenSays.TokenSaysRuleConfig.render(true, {tokenSaysRuleId: newRule.id});
        break;
      }
      case 'create-rolltable': {
        const newRule =  await tokenSaysData.createTokenSaysRollTableRule(); 
        this.refresh();
        tokenSays.TokenSaysRuleConfig.render(true, {tokenSaysRuleId: newRule.id});
        break;
      }
      case 'edit': {
        tokenSays.TokenSaysRuleConfig.render(true, {tokenSaysRuleId: tokenSaysRuleId});
        break;
      }
      case 'delete': {
        await tokenSaysData.deleteTokenSaysRule(tokenSaysRuleId);
        this.refresh();
        break;
      }
      default:
        tokenSays.log(false, 'Invalid action detected', action);
    }
  }

  refresh() {
    this.render(true);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on('click', "[data-action]", this._handleButtonClick.bind(this));
    html.on('click',"[data-tab]", this._handleTabClick.bind(this))
    html.on('click',"#token-says-search-clear", this._clearFilter.bind(this))
    html.on('input', '#token-says-search-input', this._preFilter.bind(this))
  }

  //ensures that current tab selected isn't lost on rerender
  async _handleTabClick (event) {
    const clickedElement = $(event.currentTarget);
    let clickedTab = clickedElement.data().tab;
    if(clickedTab){tokenSaysSettingsTab=clickedTab;}
  }

  getData(options){
    const tokenSaysRollTable = Object.values(tokenSaysData.allTokenSaysRollTableRules).sort((a, b) => a.label.localeCompare(b.label));
    const tokenSaysAudio = Object.values(tokenSaysData.allTokenSaysAudioRules).sort((a, b) => a.label.localeCompare(b.label));
    return {
      tokenSaysRollTable: tokenSaysRollTable,
      tokenSaysAudio: tokenSaysAudio,
      tokenSaysCurrentSearch: tokenSaysCurrentSearch
    }
  }

  _preFilter(search) {
    let searchTerm = search.target.value;
    tokenSaysCurrentSearch = searchTerm;
    this._filter(searchTerm);
  }

  _filter(searchTerm) {
    const clear = document.getElementById("token-says-search-clear");
    const searchBox = document.getElementById("token-says-search-input");
    function lower(phrase) {
      return phrase.toLowerCase();
    }

    if(searchTerm != ''){
      searchTerm = lower(searchTerm);
      clear.classList.remove('hidden');
      searchBox.classList.add('outline');
    } else {
      clear.classList.add('hidden');
      searchBox.classList.remove('outline');
    }

    $("form.token-says").find(".rule .rule-name").each(function() {
      let label = lower(this.innerText);
      if (label.search(searchTerm) > -1) {
        $(this).closest('.rule').show();
      } else {
        $(this).closest('.rule').hide();
      }
    });
  }

  _clearFilter(clear){
    clear.preventDefault();
    let search = document.getElementById("token-says-search-input")
    search.value = '';
    search.innerHTML = '';
    tokenSaysCurrentSearch = '';
    this._filter('');
  }

  async _updateObject(event, formData) {
    const clickedElement = $(event.currentTarget);
    const idToUpdate = clickedElement.parents('[data-id]')?.data()?.id; 
    if(!idToUpdate){return};
    const expandedData = foundry.utils.expandObject(formData); 
    const statusUpdate = expandedData[idToUpdate].isActive;
    await tokenSaysData.updateTokenSaysRuleStatus(idToUpdate, statusUpdate);
  }
}

/**
 * form extension supporting the form used to add or update an individual rules
*/
class TokenSaysRuleConfig extends FormApplication{
  static get defaultOptions(){
    const defaults = super.defaultOptions;

    const overrides = {
      title : game.i18n.localize("TOKENSAYS.setting.tokenSaysRule.name"),
      id : "token-says-rules-rule",
      template : tokenSays.TEMPLATES.TOKENSAYSRULE,
      width : 700,
      height : "auto",
      closeOnSubmit: true,
      tokenSaysRuleId: null
    };

    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
   
    return mergedOptions;
  }

  _determineWorldOptions() {
    const sys = game.world.data.system;

    const universalTypeOps = {
      "initiative":  "TOKENSAYS.document-type-options.initiative.label",
      "flavor":  "TOKENSAYS.document-type-options.flavor.label",
      "macro":  "TOKENSAYS.document-type-options.macro.label"
    }

    const dnd5eDocumentTypeOps  = {
      "ability":  "TOKENSAYS.document-type-options.ability.label",
      "attack":  "TOKENSAYS.document-type-options.attack.label",
      "damage":  "TOKENSAYS.document-type-options.damage.label",
      "save": "TOKENSAYS.document-type-options.save.label",
      "skill":  "TOKENSAYS.document-type-options.skill.label"
    }

    const documentNameOps = {
      "ability": game.dnd5e?.config.abilities,
      "save" : game.dnd5e?.config.abilities,
      "skill" : game.dnd5e?.config.skills
    }
    
    if (sys === "dnd5e"){ return {...dnd5eDocumentTypeOps, ...universalTypeOps}} 

    return universalTypeOps;
  }

  _determineWorldDocumentNameOptions(documentType) {
    const sys = game.world.data.system;

    const universalTypeOps = {
    }

    const dnd5eDocumentNameOps = {
      "ability": game.dnd5e?.config.abilities,
      "save" : game.dnd5e?.config.abilities,
      "skill" : game.dnd5e?.config.skills
    }
    
    let allOps = {};
    if (sys === "dnd5e"){ allOps = {...dnd5eDocumentNameOps, ...universalTypeOps}} 

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
      finalHTML = '<input id="token-says-documentname-value" type="text" name="documentName" value="' + documentName + '"  data-dtype="String" ' + disabled + '/>'
    }
    return finalHTML
  }

  getData(options){
    const ruleId = options.tokenSaysRuleId;
    const tsd = tokenSaysData.getTokenSaysRule(ruleId);
    let entityType = "";
    if(tsd.fileType ==='rollTable') {entityType = "RollTable"} else if(tsd.fileType ==="audio") {entityType = "Playlist"}
    const comp = game.packs.filter((x) => x.metadata.entity == entityType).reduce((obj, p) => {
      obj[p.collection] = p.title;
      return obj;
    }, {})

    const documentTypeOps = this._determineWorldOptions();
    tsd.documentTypeOptions = documentTypeOps;
    tsd.compendiumList = comp;
    tsd.documentNameOptions = this._createNameOptionsHTML(tsd.documentType, tsd.documentName);
    const dataToSend =  {
      tokenSaysRule: {[ruleId]: tsd} 
    } 
    return dataToSend
  }
  
  async _updateObject(event, formData) {
    const expandedData = foundry.utils.expandObject(formData); 
    const tokenSaysRuleId = expandedData.id;
    await tokenSaysData.updateTokenSaysRule(tokenSaysRuleId, expandedData);
    tokenSays.TokenSaysSettingsConfig.refresh();
  }

}