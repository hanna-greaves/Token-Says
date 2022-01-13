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
     static async _says(tokenId, actorId, actionName) {
        let token, alias = '', scene = canvas.scene, user = game.userId, message = new ChatMessage; 
        if(tokenId){token = scene.tokens.get(tokenId)}
        if(!actorId){actorId = token.actor.id}
        if(!actorId && !tokenId){return;}

        if(token){
            alias = token.name
        } else {
            alias = game.actors.get(actorId).name
        }

        message.data.speaker = {scene: scene.id, actor: actorId, token: tokenId, alias: alias};

        tokenSays.log(false,'Macro Generated Rule... ', {message, user, documentType: "macro", documentName: actionName});
        const result = await workflow.go(message.data, user, {documentType: "macro", documentName: actionName});
                
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
        if((!actorId && !tokenId) || (options?.type !== 'audio' && options?.type !== 'rollTable') ){
            tokenSays.log(false,'Says Direct No Type Provided.. ', {options});
            return false
        }
        tokenSays.log(false,'Initiate Token Says Direct.. ', {"token": tokenId, "actor": actorId, "scene": sceneId, options});
            
        let token, scene, alias, user = game.userId, message = new ChatMessage, sy = new say(options.type);

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

        message.data.speaker = {scene: scene.id, actor: actorId, token: tokenId, alias: alias};

        tokenSays.log(false,'Direct Generated Say... ', {message, user, "rule": sy});
        
        const result = await workflow.go(message.data, user, {documentType: sy.documentType, documentName: sy.documentName, say: sy});
        return result
    }
}