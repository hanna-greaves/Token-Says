let foundryInterface = {}
function buildInterface() { 
    foundryInterface.pathfinderSkills  = CONFIG.PF2E?.skills || CONFIG.PF2E?.skillList
    foundryInterface.audioHelper = foundry.audio?.AudioHelper || AudioHelper
    foundryInterface.chatMessageTypes = CONST.CHAT_MESSAGE_STYLES || CONST.CHAT_MESSAGE_TYPES
}
export { buildInterface, foundryInterface }
