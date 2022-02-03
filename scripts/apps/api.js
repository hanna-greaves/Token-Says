import {say} from './say.js';
import {workflow} from './workflow.js';
import {tokenSays} from '../token-says.js';
import {outOfRangNum} from './helpers.js'

export class api {
    static register() {
        api.set();
    }
    
    static settings() {

    }

    static set() {
        window[tokenSays.NAME] = {
          says : api._says,
          saysDirect : api._saysDirect,
        }

        game.modules.get(tokenSays.ID).api = {
            says: api._says,
            saysDirect: api._saysDirect
        }
    }

    /**
     * API call allow for call from macro
     * @param {string} tokenId - id of the token
     * @param {string} actorId - id of the actor
     * @param {string} actionName - the name of the action that. Should match the token says saying Action Name
    */
     static async _says(tokenId, actorId, actionName){
        if(!tokenId && !actorId) return
        let token;
        if(tokenId){token = canvas.scene.tokens.get(tokenId)}
        const options = {
            documentType: "macro", 
            documentName: actionName, 
            speaker: {
                scene: canvas.scene.id, 
                actor: actorId ? actorId : token.actor.id, 
                token: tokenId ? tokenId : '', 
                alias: token ? token.name : game.actors.get(actorId)?.name
                }
            }
        tokenSays.log(false,'Macro Generated Rule... ', options);
        const result = await workflow.go(game.userId, options);
        return result?.say
    }

    /**
     * API call allow for call directly with in time rule
     * @param {string} tokenId - id of the token
     * @param {string} actorId - id of the actor
     * @param {string} sceneId - id of the scene
     * @param {object} options - some values in object form that replicate a tokenSays saying
    */
    static async _saysDirect(tokenId, actorId, sceneId, options = {}) {
        if(!actorId && !tokenId) return console.log('Says Direct, must an actor id or token id.. ');
        if(!['audio', 'rollTable'].includes(options?.type)) return console.log('Says Direct, must provide "audio" or "rollTable" as type in options.. ', {options});
        if(!options.quote && !options.source) return console.log('Says Direct, must provide quote or source in options.. ', {options});

        const scene = sceneId ? game.scenes.get(sceneId) : game.scenes.current;
        const token = tokenId ? scene.tokens.get(tokenId) : ''
        const actor = actorId ? game.actors.get(actorId) : game.actors.get(token?.actor?.id) 

        if(!token && !actor) return console.log('Says Direct, no token or actor found with the given ids.. ', {"token": tokenId, "actor": actorId, "scene": scene?.id, "options": options});
        
        const alias = token ? token.name : actor.name
        const sy = new say(options.type);
        sy.documentName = 'direct';
        if(options.delay) sy.delay = options.delay;
        if(options.source) sy.fileName = options.source;
        if(options.compendium) sy.compendiumName = options.compendium;
        if(options.quote) sy.fileTitle = options.quote;
        if(options.lang) sy.lang = options.lang;
        if(options.suppress?.bubble) sy.suppressChatbubble = true;
        if(options.suppress?.message) sy.suppressChatMessage = true;
        if(options.suppress?.quotes) sy.suppressQuotes = true;
        sy.likelihood = outOfRangNum(options.likelihood, 1,100, sy.likelihood);
        sy.volume = outOfRangNum(options.volume,0.01,1.00, sy.volume)

        tokenSays.log(false,'Direct Generated Say... ', {"rule": sy});
        const result = await workflow.go(game.userId, {documentType: sy.documentType, documentName: sy.documentName, say: sy, speaker: {scene: scene.id, actor: actor?.id, token: tokenId, alias: alias}});
        return result
    }
}