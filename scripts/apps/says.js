import { tokenSays } from '../token-says.js';
import {say, reacts} from './say.js';

 export class says {
    static get says() {
        return game.settings.get('token-says', 'rules');
    }

    static get saysList() {
        const obj = {};
        const sys = this.says;
        for (var sy in sys){
            obj[sy] = sys[sy].label
        }
        return obj;
    }

    static get rollTableSays() {
        const obj = {}
        const sys = this.says;
        for (var sy in sys) {
            if (sys[sy].fileType == 'rollTable') {
                obj[sy]=sys[sy];
            }
        }
        return obj;
    }

    static get audioSays() {
        const obj = {}
        const sys = this.says;
        for (var sy in sys) {
            if (sys[sy].fileType == 'audio') {
                obj[sy]=sys[sy];
            }
        }
        return obj;
    }

    static get responses() {
        const obj = {}
        const sys = this.says;
        for (var sy in sys) {
            if (sys[sy].documentType === 'reacts') {
                obj[sy]=sys[sy];
            }
        }
        return obj;
    }
    /**
   * converts a JSON object to a zone class
   * @param {object} flag 
   * @returns 
   */
    static _toClass(flag){
        if(!flag?.fileType){return {}}
        let sy = flag.documentType==='reacts' ? new reacts(flag.fileType) : new say(flag.fileType);
        return mergeObject(sy, flag, {insertKeys: false, enforceTypes: true})
    }

    static getSay(id){
        return this._toClass(this.says[id]);
    }

    static findSay(tokenName, actorName, documentType, documentName){
        const bypassNameTypes = ['initiative'];
        const sys = this.says;
        const sep = game.settings.get('token-says', 'separator');
        for (var sy in sys) {
            const names = sys[sy].name.split(sep).map(n => n.trim());
            if (
                (
                    (sys[sy].isActorName && actorName && names.indexOf(actorName) !== -1) 
                    || (!sys[sy].isActorName && tokenName && names.indexOf(tokenName) !== -1)
                ) 
                && sys[sy].documentType === documentType 
                && (
                    !sys[sy].documentName 
                    || bypassNameTypes.indexOf(documentType) !== -1
                    || sys[sy].documentName.split(sep).map(n => n.trim()).indexOf(documentName) !== -1
                    )
                ) {
              return this._toClass(sys[sy]);
            }
        }
        return {}
    }

    static findResponses(tokenName, actorName, documentType, documentName, sayTrigger){
        const bypassNameTypes = ['initiative'];
        const sys = this.responses;
        const sep = game.settings.get('token-says', 'separator');
        const rsp = [];
        for (var sy in sys) {
             if (sys[sy].to.documentType === 'say') {
                if(sys[sy].to.documentName === sayTrigger?.id) {rsp.push(this._toClass(sys[sy]))}
            }
            else {
                const names = sys[sy].to.name.split(sep).map(n => n.trim());
                if (
                    (
                        (!sys[sy].to.name)
                        || (sys[sy].to.isActorName && actorName && names.indexOf(actorName) !== -1) 
                        || (!sys[sy].to.isActorName && tokenName && names.indexOf(tokenName) !== -1)
                    ) 
                    && sys[sy].to.documentType === documentType 
                    && (
                        !sys[sy].to.documentName 
                        || bypassNameTypes.indexOf(documentType) !== -1
                        || sys[sy].to.documentName.split(sep).map(n => n.trim()).indexOf(documentName) !== -1
                        )
                ) {
                    rsp.push(this._toClass(sys[sy]))
                }
            }
        }
        return rsp      
    }
    
    static async updateSays(sys) {
        return await game.settings.set('token-says', 'rules', sys);
    }

    static async newSay(fileType) {
        const sy = new say(fileType)
        const sys = this.says;
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
        const sys = this.says;
        const sy = mergeObject(data.documentType==='reacts' ? new reacts(data.fileType) : new say(data.fileType), sys[id], {insertKeys: false, enforceTypes: true});
        mergeObject(sy, data, {insertKeys: insertKeys, enforceTypes: true});
        sys[id] = sy;
        return await this.updateSays(sys);
    }

    static async updateSayStatus(id, status) {
        if(status  === undefined) {return} else {
            return await this.updateSay(id, {isActive: status}) 
        }
    }

    static async deleteSay(id) {
        const sys = this.says;
        const sy = sys[id];
        delete sys[id];
        await this.updateSays(sys);
        return sy;
    }

    async _deleteSays() {
        return await this.updateSays({});
    }

    static async importSays(json){
        const sys = this.says;
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