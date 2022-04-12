import {TokenSaysSettingsConfig} from './apps/say-list-form.js';
import {workflow} from "./apps/workflow.js";
import {promptToWorkflowData} from './apps/helpers.js';

/**
 * A class which holds some constants for tokenSays
 */
export class tokenSays {
    static ID = 'token-says';
    static NAME = 'tokenSays';
    
    static FLAGS = {
      TOKENSAYS: 'token-says',
      LIMITCOUNT: 'count',
      SAYING: 'saying'
    }

    static TEMPLATES = {
      SAYS: `modules/${this.ID}/templates/says-form.hbs`,
      SAY: `modules/${this.ID}/templates/say-form.hbs`
    }

    static get conditionEscape(){
      return game.settings.get(this.ID, 'conditions').split('|').map(n => n.trim()).filter(n => n !== "")
    }
    
    /**
     * Performs escape of token says if certain game settings are matched. Settings may be world or client.
    */
    static get escape(){
      return !game.settings.get(this.ID,'isActive') ? true : false
    }

    /**
     * A small helper function which leverages developer mode flags to gate debug logs.
     * @param {boolean} force - forces the log even if the debug flag is not on
     * @param  {...any} args - what to log
    */
    static log(force, ...args) {  
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
    
        if (shouldLog) {
          console.log(this.ID, '|', ...args);
        }
      }

    static initialize() {
        this.TokenSaysSettingsConfig = new TokenSaysSettingsConfig();
    }

    /**
     * method that interrupts the renderedChatMessage (when called by that hook) to update the
     * Polyglot chat message and conform it to Token Says format
     * Need to do it this way as opposed to including HTML to start else Polyglot translates the html
     * @param {object} chatMessage 
     * @param {object} html 
     * @param {object} message 
     */
    static _insertHTMLToPolyglotMessage(chatMessage, html, message) {
        let img = chatMessage.data.flags.TOKENSAYS.img;
        if(img){
            let content = html.find(".message-content");
            let translatedContent = html.find(".polyglot-original-text");
            let common = 0;
            let contentText = '';
            if(!translatedContent.length) {
                common = 1;
                contentText = '<span>' + chatMessage.data.content + '</span>';
            }
            let newContent='<div class="token-says chat-window" style="margin-bottom:6px;">'+ img + '<div class="what-is-said">' + contentText + '</div></div>';
            if(common) {
                $(content).empty().append(newContent);
            } else {
                $(newContent).prependTo(content);
                let contentSays = html.find('.what-is-said');
                translatedContent.prependTo(contentSays);
            }
        }
    }

    static _prompt(context) {
      if (canvas.ready) {
        const layer = canvas.activeLayer;
        if ((layer instanceof TokenLayer)) {
          const token = layer.placeables.find(t => t._hover);
          if(token) tokenSays.prompt(token, context.isShift)
        }
      }
    }

    static prompt(token, isShift = false){
      const data = promptToWorkflowData(token, isShift ? 'prompt-alt' : 'prompt');
      if(data) workflow.go(game.userId, data);
    }

    static async resetTokenSayingCount(tokenId, sceneId){
      const tok = game.scenes.get(sceneId).tokens.get(tokenId);
      await tok.unsetFlag(tokenSays.ID, `${tokenSays.FLAGS.SAYING}.${tokenSays.FLAGS.LIMITCOUNT}`)
      ui.notifications?.info(game.i18n.localize("TOKENSAYS.alerts.counts-reset"))
    }
}
