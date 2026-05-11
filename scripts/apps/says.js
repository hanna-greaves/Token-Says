import { tokenSays } from '../token-quips.js';
import {say, reacts} from './say.js';
import {BYPASSNAMETYPES} from './constants.js';
import {regTestTermList} from './helpers.js';
import { foundryInterface } from '../foundry-interface.js'

 export class says {
   static get _says() {
        return game.settings.get(tokenSays.ID, 'rules');
   }

    // All player sayings merged from every user's flags
    static get _playerSays() {
        if (!game.users) return {};
        return game.users.reduce((acc, u) => {
            const rules = u.getFlag(tokenSays.ID, 'rules') ?? {};
            return Object.assign(acc, rules);
        }, {});
    }

    // GM sayings + all player sayings combined (used by workflow)
    static get _allSays() {
        return { ...this._says, ...this._playerSays };
    }

    // Sayings the current user is allowed to manage in the UI:
    // GM → only GM sayings (players manage their own separately)
    // Player → only their own sayings
    static get _mySays() {
        if (game.user.isGM) return this._says;
        const playerRules = game.user.getFlag(tokenSays.ID, 'rules') ?? {};
        return Object.fromEntries(
            Object.entries(playerRules).filter(([, s]) => s.ownerId === game.userId)
        );
    }

    static get says() {
        const flag = this._allSays;
        const ar = [];
        for (var sy in flag) {
            ar.push(this._toClass(flag[sy]));
        }
        return ar
    }

    static get saysList() {
        const obj = {};
        const sys = this._allSays;
        for (var sy in sys){
            obj[sy] = sys[sy].label
        }
        return obj;
    }

    static get saysActive() {
        return this.says.filter(s => s.isActive);
    }

    static get sayContinues() {
        return this.says.filter(s => s.isActive && s.documentType === 'continues')
    }

    static get responses() {
        return this.says.filter(s => s.isActive && s.documentType === 'reacts')
    }

    static get sceneAudioFileSays(){
        return this.says.filter(s =>
            s.hasAudio
            && s.audioFileTitle
            && s.isActive
            && (!s.documentName || !['arrive', 'move'].includes(s.documentType) || s.documentNameList.includes(canvas.scene.name))
            && (!s.name || canvas.scene.tokens?.find(t=> s.nameList.includes(s.isActorName ? t.actor?.name : t.name) !== s.reverse))
        )
    }

    static _toClass(flag){
        if(!flag?.fileType){return {}}
        let sy = flag.documentType==='reacts' ? new reacts(flag.fileType) : new say(flag.fileType);
        return foundry.utils.mergeObject(sy, flag, {insertKeys: false, enforceTypes: true})
    }

    static getSay(id){
        return this._toClass(this._says[id] ?? this._playerSays[id]);
    }

    static findSays(tokenName, actor ={}, documentType, documentName, isActive = true){
        const sys = isActive ? this.saysActive : this.says;
        return sys.filter(sy =>
            sy.documentType === documentType
            && (
                !sy.name
                || (!sy.reverse && sy.nameList.includes(((sy.isActorName && actor.name) ? actor.name : tokenName)))
                || (sy.reverse && !sy.nameList.includes(((sy.isActorName && actor.name) ? actor.name : tokenName)))
            )
            && (
                !sy.documentName
                || BYPASSNAMETYPES.includes(documentType)
                || sy.documentNameList.includes(documentName)
                || (sy.dnwc && regTestTermList(sy.documentNameList, documentName))
            )
            && (!sy.actorType || sy.actorType === actor.type)
        )
    }

    static findEventResponses(tokenName, actorName, documentType, documentName){
        return this.responses.filter(sy =>
            sy.to.documentType !== 'say'
            && sy.to.documentType === documentType
            && (
                !sy.to.name
                || (!sy.to.reverse && sy.toNameList.includes((sy.to.isActorName && actorName) ? actorName : tokenName))
                || (sy.to.reverse && !sy.toNameList.includes((sy.to.isActorName && actorName) ? actorName : tokenName))
            )
            && (
                !sy.to.documentName
                || BYPASSNAMETYPES.includes(documentType)
                || sy.toDocumentNameList.includes(documentName)
                || (sy.to.dnwc && regTestTermList(sy.toDocumentNameList, documentName))
            )
        )
    }

    static findSayContinues(sayTrigger){
        return this.sayContinues.filter(sy => sy.documentName === sayTrigger?.id)
    }

    static findSayResponses(sayTrigger){
        return this.responses.filter(sy => sy.to.documentType === 'say' && sy.to.documentName === sayTrigger?.id)
    }

    static async updateSays(sys) {
        return await game.settings.set(tokenSays.ID, 'rules', sys);
    }

    static async newSay(fileType) {
        const sy = new say(fileType)
        const sys = this._says;
        sys[sy.id] = sy;
        await this.updateSays(sys);
        return sy;
    }

    static async newRollTableSay() {
       return await this.newSay("rollTable")
    }

    static async newAudioSay() {
       return await this.newSay("audio")
    }

    // --- Player-sayings CRUD (stored in User document flags) ---

    static async newPlayerSay(fileType) {
        const sy = new say(fileType);
        sy.ownerId = game.userId;
        const playerRules = foundry.utils.deepClone(game.user.getFlag(tokenSays.ID, 'rules') ?? {});
        playerRules[sy.id] = sy;
        await game.user.setFlag(tokenSays.ID, 'rules', playerRules);
        return sy;
    }

    static async updatePlayerSay(id, data, insertKeys = false) {
        const playerRules = foundry.utils.deepClone(game.user.getFlag(tokenSays.ID, 'rules') ?? {});
        const stored = playerRules[id] ?? {};
        // Use the stored documentType (not data's) so reacts sayings keep their class template
        const isReacts = (data.documentType ?? stored.documentType) === 'reacts';
        const fileType = data.fileType ?? stored.fileType;
        const sy = foundry.utils.mergeObject(
            isReacts ? new reacts(fileType) : new say(fileType),
            stored,
            {insertKeys: false, enforceTypes: true}
        );
        foundry.utils.mergeObject(sy, data, {insertKeys, enforceTypes: true});
        sy.ownerId = game.userId;
        playerRules[id] = sy;
        tokenSays.log(false, 'Update player saying ', {playerRules, saying: sy, data});
        return await game.user.setFlag(tokenSays.ID, 'rules', playerRules);
    }

    // GM can update a specific player's saying
    static async updatePlayerSayForUser(userId, id, data, insertKeys = false) {
        const user = game.users.get(userId);
        if (!user) return;
        const playerRules = foundry.utils.deepClone(user.getFlag(tokenSays.ID, 'rules') ?? {});
        const stored = playerRules[id] ?? {};
        const isReacts = (data.documentType ?? stored.documentType) === 'reacts';
        const fileType = data.fileType ?? stored.fileType;
        const sy = foundry.utils.mergeObject(
            isReacts ? new reacts(fileType) : new say(fileType),
            stored,
            {insertKeys: false, enforceTypes: true}
        );
        foundry.utils.mergeObject(sy, data, {insertKeys, enforceTypes: true});
        sy.ownerId = userId;
        playerRules[id] = sy;
        tokenSays.log(false, 'GM update player saying ', {playerRules, saying: sy, userId});
        return await user.setFlag(tokenSays.ID, 'rules', playerRules);
    }

    static async deletePlayerSay(id) {
        // Use the -=key operator so Foundry removes the entry rather than
        // merging the object (a plain setFlag with the key absent gets merged
        // back in by Foundry's document update machinery).
        return await game.user.update({
            [`flags.${tokenSays.ID}.rules.-=${id}`]: null
        });
    }

    // GM can delete a specific player's saying
    static async deletePlayerSayForUser(userId, id) {
        const user = game.users.get(userId);
        if (!user) return;
        return await user.update({
            [`flags.${tokenSays.ID}.rules.-=${id}`]: null
        });
    }

    static async copyPlayerSay(id) {
        const playerRules = foundry.utils.deepClone(game.user.getFlag(tokenSays.ID, 'rules') ?? {});
        const sy = playerRules[id];
        if (!sy) return null;
        const newId = foundry.utils.randomID(16);
        playerRules[newId] = { ...sy, id: newId, label: (sy.label ?? '') + ' (copy)', ownerId: game.userId };
        await game.user.setFlag(tokenSays.ID, 'rules', playerRules);
        return newId;
    }

    // GM copies a player saying into GM sayings (clears ownerId)
    static async copySayFromPlayer(sourceId) {
        const playerSay = this._playerSays[sourceId];
        if (!playerSay) return null;
        const sys = this._says;
        const newId = foundry.utils.randomID(16);
        sys[newId] = { ...playerSay, id: newId, label: (playerSay.label ?? '') + ' (copy)', ownerId: '' };
        await this.updateSays(sys);
        return newId;
    }

    // --- End player-sayings CRUD ---

    static async preloadSceneSounds(){
        tokenSays.log(false, 'Caching audio ', {says: this.sceneAudioFileSays})
        for(const sy of this.sceneAudioFileSays){
            const sound = await sy.sound()
            if(sound) foundryInterface.audioHelper.preloadSound(sound)
        }
    }

    static async preloadTokenSounds(token){
        if(canvas.scene.tokens.find(t=> token.name === t.name || token.actor?.name === t.actor?.name)) return
        const sys = this.tokenAudioFileSays(token);
        tokenSays.log(false, 'Caching audio ', {says: sys})
        for(const sy of sys){
            const sound = await sy.sound()
            foundryInterface.audioHelper.preloadSound(sound)
            game.socket.emit('module.token-quips', {load: sound});
        }
    }

    static tokenAudioFileSays(token){
        return this.says.filter(s =>
            s.hasAudio
            && s.audioFileTitle
            && s.isActive
            && (!s.documentName || !['arrive', 'move'].includes(s.documentType) || s.documentNameList.includes(canvas.scene.name))
            && s.name
            && s.nameList.includes(s.isActorName ? token.actor?.name : token.name) !== s.reverse
        )
    }

    static async copySay(id) {
        const sys = this._says;
        const sy = says.getSay(id);
        const newId = foundry.utils.randomID(16);
        sy['id'] = newId;
        sy['label'] = sy['label'] + ' (copy)';
        sys[newId] = sy;
        tokenSays.log(false, 'Copy saying ', {says: sys, new: sy})
        await this.updateSays(sys);
        return newId;
    }

    static async updateSay(id, data, insertKeys = false) {
        const sys = this._says;
        const sy = foundry.utils.mergeObject(data.documentType==='reacts' ? new reacts(data.fileType) : new say(data.fileType), sys[id], {insertKeys: false, enforceTypes: true});
        foundry.utils.mergeObject(sy, data, {insertKeys: insertKeys, enforceTypes: true});
        sys[id] = sy;
        tokenSays.log(false, 'Update saying ', {says: sys, saying: sy, data: data})
        return await this.updateSays(sys);
    }

    static async updateSayStatus(id, status) {
        if(status  === undefined) return
        await this.updateSay(id, {isActive: status})
    }

    static async deleteSay(id) {
        const sys = this._says;
        const sy = sys[id];
        delete sys[id];
        await this.updateSays(sys);
        return sy;
    }

    async _deleteSays() {
        await this.updateSays({});
    }

    static async importSays(json){
        const sys = this._says;
        let added = [];
        let alreadyExists = [];
        let inError = [];

        if(json){
            for (var s in json) {
                let record = json[s];
                if(!record || s===undefined || record.fileType===undefined || (record.fileType!=="rollTable" && record.fileType!=='audio')){
                    inError.push(record)
                } else if (sys[s]) {
                    alreadyExists.push(record);
                } else {
                    let sy = record.documentType==='reacts' ? new reacts(record.fileType) : new say(record.fileType);
                    foundry.utils.mergeObject(sy, record, {insertKeys: false, enforceTypes: true});
                    if(sy){
                        sys[sy.id]=sy;
                        added.push(sy);
                    } else inError.push(sy);
                }
            }
        } else{inError.push(json)}

        await this.updateSays(sys);

        return {"added": added, "skipped": alreadyExists, "error": inError}
    }
}
