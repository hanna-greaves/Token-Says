import { tokenSays } from '../token-says.js';
import {say, reacts} from './say.js';
import {BYPASSNAMETYPES} from './constants.js';

 export class says {
   static get _says() {
        return game.settings.get(tokenSays.ID, 'rules');
   }

    static get says() {
        const flag = game.settings.get(tokenSays.ID, 'rules');
        const ar = [];
        for (var sy in flag) {
            ar.push(this._toClass(flag[sy]));
        }
        return ar
    }

    static get saysList() {
        const obj = {};
        const sys = this._says;
        for (var sy in sys){
            obj[sy] = sys[sy].label
        }
        return obj;
    }

    static get saysActive() {
        return this.says.filter(s => s.isActive);
    }

    static get rollTableSays() {
        return this.says.filter(s => s.fileType === 'rollTable')
    }

    static get audioSays() {
        return this.says.filter(s => s.fileType === 'audio')
    }

    static get responses() {
        return this.says.filter(s => s.isActive && s.documentType === 'reacts')
    }

    static _toClass(flag){
        if(!flag?.fileType){return {}}
        let sy = flag.documentType==='reacts' ? new reacts(flag.fileType) : new say(flag.fileType);
        return mergeObject(sy, flag, {insertKeys: false, enforceTypes: true})
    }

    static getSay(id){
        return this._toClass(this._says[id]);
    }

    static findSays(tokenName, actorName, documentType, documentName, isActive = true){
        const sys = isActive ? this.saysActive : this.says;
        return sys.filter(sy => 
            sy.documentType === documentType 
            && sy.nameList.includes((sy.isActorName && actorName) ? actorName : tokenName)
            && (
                !sy.documentName 
                || BYPASSNAMETYPES.includes(documentType)
                || sy.documentNameList.includes(documentName) 
            )
        )
    }

    static findResponses(tokenName, actorName, documentType, documentName, sayTrigger){
        const sys = this.responses;
        return sys.filter(sy =>
            sy.to.documentType === 'say' ? sy.to.documentName === sayTrigger?.id : (
                sy.to.documentType === documentType 
                && (
                    !sy.to.name
                    || sy.toNameList.includes((sy.to.isActorName && actorName) ? actorName : tokenName)
                ) 
                && (
                    !sy.to.documentName 
                    || BYPASSNAMETYPES.includes(documentType)
                    || sy.toDocumentNameList.includes(documentName)
                ) 
            )
        )
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

    static async updateSay(id, data, insertKeys = false) {
        const sys = this._says;
        const sy = mergeObject(data.documentType==='reacts' ? new reacts(data.fileType) : new say(data.fileType), sys[id], {insertKeys: false, enforceTypes: true});
        mergeObject(sy, data, {insertKeys: insertKeys, enforceTypes: true});
        sys[id] = sy;
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
                    mergeObject(sy, record, {insertKeys: false, enforceTypes: true});
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