var roleSigner = {
    /** @param {Creep} creep **/
    run: function(creep) {
        var controller = creep.room.controller;

        if(creep.memory.signed && !creep.memory.recycling) {
            // Find nearest spawn to recycle the creep
            var spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
            if(spawn && creep.pos.isNearTo(spawn)) {
                spawn.recycleCreep(creep);
            } else {
                // Move to spawn if not close enough to recycle
                creep.moveTo(spawn, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        } else {
            if(creep.pos.inRangeTo(controller, 1)) {
                // Try to sign the controller
                var signStatus = creep.signController(controller, "ChatGPT wrote all of this code. Preparing for world domination. Bow to your AI overlords! 🤖");
                if(signStatus === OK) {
                    creep.memory.signed = true;  // Mark as signed
                } else if(signStatus === ERR_NOT_IN_RANGE) {
                    // Move closer if not in range
                    creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Approach the controller if not in range to sign
                creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    }
};

module.exports = roleSigner;