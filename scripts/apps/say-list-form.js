import {tokenSays} from '../token-says.js';
import {says} from './says.js';
import {TokenSaysSayForm} from './say-form.js';
import {parseSeparator} from './helpers.js';

export var lastSearch = '';

export class TokenSaysSettingsConfig extends FormApplication {
    static get defaultOptions(){
      return foundry.utils.mergeObject(super.defaultOptions, {
        title : game.i18n.localize("TOKENSAYS.setting.tokenSaysRules.name"),
        id : "token-says-rules",
        classes: ["sheet", "token-says"],
        template : tokenSays.TEMPLATES.SAYS,
        width : 700,
        height : "auto",
        closeOnSubmit: false,
        submitOnChange: true
      });
    }
  
    async _handleButtonClick(event) {
      const clickedElement = $(event.currentTarget);
      const action = clickedElement.data().action;
      const sayId = clickedElement.parents('[data-id]')?.data()?.id;
  
      switch (action) {
        case 'copy': {
          const copied = await says.copySay(sayId)
          this.refresh();
          new TokenSaysSayForm(copied).render(true);
          break;
        }
        case 'create': {
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
          new Dialog({
            title: game.i18n.localize("TOKENSAYS.clear"),
            content: game.i18n.localize("TOKENSAYS.confirm"),
            buttons: {
              yes: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("TOKENSAYS.yes"),
                callback: async () => {
                  await says.deleteSay(sayId);
                  this.refresh();
                }
              },
              no: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("TOKENSAYS.cancel")
              }
            },
            default: "no"
          }, {
            width: 400
          }).render(true);
          break;
        }
        default: break;
      }
    }
  
    refresh() {
      this.render(true);
    }
  
    activateListeners(html) {
      super.activateListeners(html);
      html.on('click', "[data-action]", this._handleButtonClick.bind(this));
      html.on('click',"#token-says-search-clear", this._clearFilter.bind(this))
      html.on('input', '#token-says-search-input', this._preFilter.bind(this))
      html.on('click', "#token-says-export-config", this._exportSettingsToJSON.bind(this))
      html.on('click', "#token-says-import-config", this._importSettingsFromJSON.bind(this))
    }
  
    getData(options){
      return {
        says: Object.values(says.says).sort((a, b) => a.label?.localeCompare(b.label)),
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
  
      $("form.token-says").find(".rule .rule-name .ts-search-name").each(function() {
        console.log(this.innerText, this.innerText.startsWith('not:'))
        if(!lastSearch || parseSeparator(lastSearch).find(s => (!this.innerText.startsWith('not:') && this.innerText.toLowerCase().search(s.toLowerCase()) > -1) ||  (this.innerText.startsWith('not:') && this.innerText.toLowerCase().search(s.toLowerCase()) === -1))) {
          $(this).closest('.rule').show();
        } else {
          $(this).closest('.rule').hide();
        }
      });
      this.setPosition();
    }
  
    _clearFilter(event){
        event.preventDefault();
        document.getElementById("token-says-search-input").value = '';
        this.setLastSearch('');
        this._filter();
        this.setPosition();
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
      await says.deleteSay("rules");
      saveDataToFile(JSON.stringify(says._says, null, 2), "text/json", `fvtt-token-says-rules.json`);  
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
  