var roleDefender = {
    /** @param {Creep} creep **/
    run: function(creep) {
        // Find closest hostile creep
        var target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(target) {
            if(creep.attack(target) == ERR_NOT_IN_RANGE) {
                // Move towards the target if not in range
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
            }
        } else {
            // Optional: Move back to a rally point or stay near spawn/important structures
            const rallyPoint = creep.room.find(FIND_MY_SPAWNS)[0];
            if(rallyPoint && !creep.pos.isNearTo(rallyPoint)) {
                creep.moveTo(rallyPoint, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    }
};

module.exports = roleDefender;
