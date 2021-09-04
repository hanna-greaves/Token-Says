import {tokenSays} from '../token-says.js';

export class TokenSaysTokenForm extends TokenConfig{
    static get defaultOptions(){
        return super.defaultOptions;
      }
  
    static _init(app, html, data){ 
        let opt = game.settings.get('token-says', 'tokenHeader');   
        if(opt !== 'N' && game.user.isGM){
          let icn = '<i class="fas fa-comment"></i>';
          if(opt === 'B'){
              icn+='Says'
            }  

          let openButton = $(`<a class="open-tokensays" title="Token Says Config">` + icn + `</a>`);

          openButton.click(event => {
            const form = tokenSays.TokenSaysSettingsConfig;
            if(app.token?.name){
                form.setLastSearch(app.token.name)
            }
            form.render(true);
          });

          html.closest('.app').find('.open-tokensays').remove();
          let titleElement = html.closest('.app').find('.window-title');
          openButton.insertAfter(titleElement);
        }
      }
  }