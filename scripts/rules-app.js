/*
 * MIT License
 * 
 * Copyright (c) 2020-2021 DnD5e Helpers Team
 *
 * Portions re-used with permission from Foundry Network
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
        this.render();
        tokenSays.TokenSaysRuleConfig.render(true, {tokenSaysRuleId: newRule.id});
        break;
      }
      case 'create-rolltable': {
        const newRule =  await tokenSaysData.createTokenSaysRollTableRule(); 
        this.render();
        tokenSays.TokenSaysRuleConfig.render(true, {tokenSaysRuleId: newRule.id});
        break;
      }
      case 'edit': {
        tokenSays.TokenSaysRuleConfig.render(true, {tokenSaysRuleId: tokenSaysRuleId});
        break;
      }
      case 'delete': {
        await tokenSaysData.deleteTokenSaysRule(tokenSaysRuleId);
        this.render();
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
  }

  getData(options){
    return {
      tokenSaysRollTable: tokenSaysData.allTokenSaysRollTableRules,
      tokenSaysAudio: tokenSaysData.allTokenSaysAudioRules
    }
  }

  async _updateObject(event, formData) {
    const clickedElement = $(event.currentTarget);
    const idToUpdate = clickedElement.parents('[data-id]')?.data()?.id; 
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

    /*const documentNameOps = {
      "ability": {
        "str": "TOKENSAYS.document-type-options.ability.str",
        "dex": "TOKENSAYS.document-type-options.ability.dex",
        "con": "TOKENSAYS.document-type-options.ability.con",
        "wis": "TOKENSAYS.document-type-options.ability.wis",
        "int": "TOKENSAYS.document-type-options.ability.int",
        "cha": "TOKENSAYS.document-type-options.ability.cha"
        },
      "save" : {
        "str": "TOKENSAYS.document-type-options.ability.str",
        "dex": "TOKENSAYS.document-type-options.ability.dex",
        "con": "TOKENSAYS.document-type-options.ability.con",
        "wis": "TOKENSAYS.document-type-options.ability.wis",
        "int": "TOKENSAYS.document-type-options.ability.int",
        "cha": "TOKENSAYS.document-type-options.ability.cha"
      },
      "skill" : {
        "ath": "TOKENSAYS.document-type-options.skill.ath",
        "int": "TOKENSAYS.document-type-options.skill.itm"
      }
    }*/
    
    if (sys === "dnd5e"){ return {...dnd5eDocumentTypeOps, ...universalTypeOps}} 

    return universalTypeOps;
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
    //tsd.documentNameOptions = documentNameOps[tsd.documentType];
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