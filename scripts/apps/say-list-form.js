import {tokenSays} from '../token-says.js';
import {says} from './says.js';
import {TokenSaysSayForm} from './say-form.js'

export var lastSearch = '', lastTab = 'token-says-roll-table';

export class TokenSaysSettingsConfig extends SettingsConfig {
    static get defaultOptions(){
      return foundry.utils.mergeObject(super.defaultOptions, {
        title : game.i18n.localize("TOKENSAYS.setting.tokenSaysRules.name"),
        id : "token-says-rules",
        template : tokenSays.TEMPLATES.SAYS,
        width : 700,
        height : "auto",
        closeOnSubmit: false,
        submitOnChange: true, 
        tabs : [
          {navSelector: ".tabs", contentSelector: ".content", initial: lastTab}
        ],
      });
    }
  
    async _handleButtonClick(event) {
      const clickedElement = $(event.currentTarget);
      const action = clickedElement.data().action;
      const sayId = clickedElement.parents('[data-id]')?.data()?.id;
  
      switch (action) {
        case 'create-audio': {
          const sy =  await says.newAudioSay(); 
          this.refresh();
          new TokenSaysSayForm(sy.id).render(true);
          break;
        }
        case 'create-rolltable': {
          const sy =  await says.newRollTableSay(); 
          this.refresh();
          new TokenSaysSayForm(sy.id).render(true);
          break;
        }
        case 'edit': {
          new TokenSaysSayForm(sayId).render(true);
          break;
        }
        case 'delete': {
          await says.deleteSay(sayId);
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
      html.on('click', "#token-says-export-config", this._exportSettingsToJSON.bind(this))
      html.on('click', "#token-says-import-config", this._importSettingsFromJSON.bind(this))
    }
  
    //ensures that current tab selected isn't lost on rerender
    async _handleTabClick (event) {
      let clickedTab = $(event.currentTarget).data().tab;
      if(clickedTab){lastTab=clickedTab;}
    }
  
    getData(options){
      return {
        rollTable: Object.values(says.rollTableSays).sort((a, b) => a.label.localeCompare(b.label)),
        audio: Object.values(says.audioSays).sort((a, b) => a.label.localeCompare(b.label)),
        search: lastSearch
      }
    }
  
    _preFilter(event) {
        this.setLastSearch(event.target.value);
        this._filter();
    }
  
    _filter() {
      const clear = document.getElementById("token-says-search-clear");
      const searchBox = document.getElementById("token-says-search-input");
  
      if(lastSearch != ''){
        clear.classList.remove('hidden');
        searchBox.classList.add('outline');
      } else {
        clear.classList.add('hidden');
        searchBox.classList.remove('outline');
      }
  
      $("form.token-says").find(".rule .rule-name").each(function() {
        if(this.innerText.toLowerCase().search(lastSearch.toLowerCase()) > -1) {
          $(this).closest('.rule').show();
        } else {
          $(this).closest('.rule').hide();
        }
      });
    }
  
    _clearFilter(event){
        event.preventDefault();
        document.getElementById("token-says-search-input").value = '';
        this.setLastSearch('');
        this._filter();
    }

    _tab(){
        $(`a[data-tab=${lastTab}]`)[0].click();
    }

    setLastSearch(search){
        lastSearch = search;
    }
  
    async _updateObject(event, formData) {
      const idToUpdate = $(event.currentTarget).parents('[data-id]')?.data()?.id; 
      if(!idToUpdate){return};
      const expandedData = foundry.utils.expandObject(formData); 
      const statusUpdate = expandedData[idToUpdate].isActive;
      await says.updateSayStatus(idToUpdate, statusUpdate);
    }
  
    async _exportSettingsToJSON() {
      await says.deleteSay("rules");///Temporary cleanup of alpha initialized data on early mods.
      saveDataToFile(JSON.stringify(says.says, null, 2), "text/json", `fvtt-token-says-rules.json`);  
    }
  
    async _importFromJSON(json) {
      const data = JSON.parse(json);
      tokenSays.log(false, 'JSON Import Parse Complete ', data);

      let response = await says.importSays(data); 
      tokenSays.log(false, 'Rules Import Complete ', response);

      this.refresh();

      if(response) {
        let info = game.i18n.localize("TOKENSAYS.setting.import.complete") 
         + ': ' + response.added.length + ' ' + game.i18n.localize("TOKENSAYS.setting.import.success") 
         + ', ' + response.error.length + ' ' + game.i18n.localize("TOKENSAYS.setting.import.error") 
         + ', ' + response.skipped.length + ' ' + game.i18n.localize("TOKENSAYS.setting.import.skipped");
        ui.notifications?.info(info)
      }

      return response
    }
  
    async _importSettingsFromJSON() {
      const options = {
        name: "Token Says",
        entity: "token-says"
      }
      const content = await renderTemplate("templates/apps/import-data.html", options);
      new Dialog({
        title: game.i18n.localize("TOKENSAYS.setting.import.title"),
        content: content,
        buttons: {
          import: {
            icon: '<i class="fas fa-file-import"></i>',
            label: game.i18n.localize("TOKENSAYS.import"),
            callback: html => {
              const form = html.find("form")[0];
              if ( !form.data.files.length ) return ui.notifications?.error(game.i18n.localize("TOKENSAYS.setting.import.noFile"));
              readTextFromFile(form.data.files[0]).then(json => this._importFromJSON(json));
            }
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("TOKENSAYS.cancel")
          }
        },
        default: "import"
      }, {
        width: 400
      }).render(true);
    }
  }
  