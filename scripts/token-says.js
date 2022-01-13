import {TokenSaysSettingsConfig} from './apps/say-list-form.js';

/**
 * A class which holds some constants for tokenSays
 */
export class tokenSays {
    static ID = 'token-says';
    static NAME = 'tokenSays';
    
    static FLAGS = {
      TOKENSAYS: 'token-says'
    }
    
    static TEMPLATES = {
      SAYS: `modules/${this.ID}/templates/says-form.hbs`,
      SAY: `modules/${this.ID}/templates/say-form.hbs`
    }

    
    /**
     * Performs escape of token says if certain game settings are matched. Settings may be world or client.
    */
    get _escape(){
      if(this.flags?.TOKENSAYS?.cancel) return 'Token Says flag'
      if(!game.settings.get('token-says','isActive')) return 'Token Says is set to Inactive'
      if(game.user?.id !== this.user) return 'Chat user is not game user'
      if(!this.message?.speaker?.actor || !this.message?.speaker?.alias || !this.message?.speaker?.token) return 'No speaker in message data'
      if(game.settings.get('token-says','suppressPrivateGMRoles') && (this.message.whisper?.length || this.message.whisperAttackCard)) return 'Private GM Roll to be escaped due to world settings'
      if(this.hasCancelConditionResponse(this.token, true)) return 'TokenSays response killed - condition'
      return false;
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
            tokenSays.log(false,'Polyglot chat rendered ', {chatMessage, html, message}); 
        }
    }
}
