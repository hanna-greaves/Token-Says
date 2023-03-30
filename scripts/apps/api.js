import {say} from './say.js';
import {says} from './says.js';
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
          deleteSaying : api._deleteSaying,
          getSaying : api._getSaying,
          getSayingName : api._getSayingName,
          says : api._says,
          saysDirect : api._saysDirect,
          getSayings : api._getSayings,
          toggleActivate: api._toggleActivate
        }

        game.modules.get(tokenSays.ID).api = {
            deleteSaying : api._deleteSaying,
            getSaying : api._getSaying,
            getSayingName : api._getSayingName,
            getSayings : api._getSayings,
            says: api._says,
            saysDirect: api._saysDirect,
            toggleActivate: api._toggleActivate
        }
    }

    /**
     * API call that intakes an id for a saying and deletes it
     * @param {string} id - id of saying
     * @returns the object of the deleted saying
     */
    static async _deleteSaying(id){
        const del = await says.deleteSay(id)
        del ? console.log('Saying deleted',{saying: del}) : console.log('No saying found with that id')
        return del
    }

    /**
     * Returns a saying for a given id
     * @param {string} id - saying id
     * @returns saying 
     */
    static _getSaying(id){
        return says.getSay(id)
    }

    /**
     * Returns a saying for a given name
     * @param {string} name - saying name
     * @returns saying 
     */
    static _getSayingName(name){
        return says.says.find(s => s.label === name)
    }

    /**
     * 
     * @returns all of the sayings in an array
     */
    static _getSayings(){
        return says.says
    }

    //tokenSays.toggleActivate()
    static async _toggleActivate() {
        await game.settings.set(tokenSays.ID, 'isActive', !game.settings.get(tokenSays.ID, 'isActive'));
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
     *  does not include play type/limit handling, due to the need for these to make use of a saying id to track sequence
     * @param {string} tokenId - id of the token
     * @param {string} actorId - id of the actor
     * @param {string} sceneId - id of the scene
     * @param {object} options - some values in object form that replicate a tokenSays saying
    */
    static async _saysDirect(tokenId, actorId, sceneId, options = {}) {
        if(!actorId && !tokenId) return console.log('Says Direct, must an actor id or token id.. ');
        const scene = sceneId ? game.scenes.get(sceneId) : game.scenes.current;
        const token = tokenId ? scene.tokens.get(tokenId) : ''
        const actor = actorId ? game.actors.get(actorId) : game.actors.get(token?.actor?.id) 

        if(!token && !actor) return console.log('Says Direct, no token or actor found with the given ids.. ', {"token": tokenId, "actor": actorId, "scene": scene?.id, "options": options});
        
        const alias = token ? token.name : actor.name
        const sy = new say('rollTable');
        sy.documentName = 'direct';
        if(options.actorType) sy.actorType = options.actorType;
        if(options.delay) sy.delay = options.delay;
        sy.fileName = (options.chat?.source ? options.chat.source : (options.type === 'rollTable' ? options.source : ''));
        sy.compendiumName = (options.chat?.compendium ? options.chat.compendium : (options.type === 'rollTable' ? options.compendium : ''));
        sy.fileTitle = (options.chat?.quote ? options.chat.quote : (options.type === 'rollTable' ? options.quote : ''));
        if(options.lang) sy.lang = options.lang;
        if(options.reverse) sy.reverse = true;
        if(options.suppress?.bubble) sy.suppressChatbubble = true;
        if(options.suppress?.pan) sy.suppressPan = true;
        if(options.suppress?.message) sy.suppressChatMessage = true;
        if(options.suppress?.quotes) sy.suppressQuotes = true;
        sy['paired'] = {
            compendiumName: (options.audio?.compendium ? options.audio.compendium : (options.type === 'audio' ? options.compendium : '')),
            fileName: (options.audio?.source ? options.audio.source : (options.type === 'audio' ? options.source : '')),
            fileTitle: (options.audio?.quote ? options.audio.quote : (options.type === 'audio' ? options.quote : ''))
        };
        sy.likelihood = outOfRangNum(options.likelihood, 1,100, sy.likelihood);
        sy.volume = outOfRangNum(options.volume,0.01,1.00, sy.volume)

        tokenSays.log(false,'Direct Generated Say... ', {"rule": sy});
        const result = await workflow.go(game.userId, {documentType: sy.documentType, documentName: sy.documentName, say: sy, speaker: {scene: scene.id, actor: actor?.id, token: tokenId, alias: alias}});
        return result
    }
}