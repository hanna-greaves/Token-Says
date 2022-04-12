import {tokenSays} from '../token-says.js';

export class TokenSaysTokenForm extends TokenConfig {
  static get defaultOptions(){
      return super.defaultOptions;
    }

  static _init(app, html, data){ 
    if (game.user.isGM) {
      let opt = game.settings.get('token-says', 'tokenHeader');   
      if(opt !== 'N'){
        let icn = '<i class="fas fa-comment"></i>';
        if(opt === 'B'){
            icn+='Says'
          }  

        let openButton = $(`<a class="open-tokensays" title="Token Says Config">` + icn + `</a>`);

        openButton.click(event => {
          const form = tokenSays.TokenSaysSettingsConfig;
          if(app.token?.name){
            form.setLastSearch(app.token.name.trim().concat((app.actor?.name && app.actor.name.trim() !== app.token.name.trim()) ? (game.settings.get(tokenSays.ID, 'separator') + app.actor.name.trim()) : ''))
          }
          form.render(true);
        });

        html.closest('.app').find('.open-tokensays').remove();
        let titleElement = html.closest('.app').find('.window-title');
        openButton.insertAfter(titleElement);
      }

      let countButton = $('<button>').attr('id', 'token-says-token-settings').text(game.i18n.localize("TOKENSAYS.token-form.counts-reset"));
      countButton.click(event => {
        event.preventDefault();
        tokenSays.resetTokenSayingCount(app.token.id, app.token.parent.id);
      });
      let group = $('<div>').addClass('form-group')
          .append($('<label>').html(game.i18n.localize("TOKENSAYS.token-form.history.label")))
          .append(countButton);

      $('div[data-tab="character"]', html).append(group);

      app.setPosition({height: 'auto'});
    }
  }
}