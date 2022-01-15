import {say} from './say.js';
import {workflow} from './workflow.js';
import {tokenSays} from '../token-says.js';
import {nullTokenSaysRuleString, outOfRangTokenSaysRuleInt} from './helpers.js'

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
    static async _saysDirect(tokenId, actorId, sceneId, options) {
        if((!actorId && !tokenId) || (!['audio', 'rollTable'].includes(options?.type))) return tokenSays.log(false,'Says Direct No Type Provided.. ', {options});
            
        let token, scene, alias, sy = new say(options.type);

        sy.fileName = nullTokenSaysRuleString(options.source, sy.fileName );
        sy.compendiumName = nullTokenSaysRuleString(options.compendium, sy.compendiumName);
        sy.fileTitle = nullTokenSaysRuleString(options.quote, sy.fileTitle);
        sy.likelihood = outOfRangTokenSaysRuleInt(options.likelihood, 1,100, sy.likelihood);
        sy.documentName = 'direct';
        
        if(sy.fileTitle === '' && sy.fileName === '') {
            tokenSays.log(false,'Says Direct No Source and Says Provided.. ', {options, sy});
            return false
        }
        if(sceneId){
            scene = game.scenes.get(sceneId)
        } else {
            scene = game.scenes.current;
        }

        if(tokenId){token = scene.tokens.get(tokenId)}
        if(!actorId && token){actorId = token.actor?.id}

        if(token){
            alias = token.name
        } else if(actorId){
            alias = game.actors.get(actorId).name
        } else {
            tokenSays.log(false,'Says Direct No Token or Actor Found.. ', {"token": tokenId, "actor": actorId, "scene": scene.id, options, sy});
            return false
        }

        tokenSays.log(false,'Direct Generated Say... ', {"rule": sy});
        
        const result = await workflow.go(game.userId, {documentType: sy.documentType, documentName: sy.documentName, say: sy, speaker: {scene: scene.id, actor: actorId, token: tokenId, alias: alias}});
        return result
    }
}