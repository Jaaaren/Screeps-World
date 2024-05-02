var roleMiner = {
    /** @param {Creep} creep **/
    run: function(creep) {
        
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) / 2) {
            var carriers = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
                filter: (c) => c.memory.role === 'carrier' && c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (carriers.length > 0) {
                creep.transfer(carriers[0], RESOURCE_ENERGY);
                return; // Early return to prevent moving if transferring energy
            }
        }
        // Check if at mining spot or need to recalculate path
        if (!creep.memory.miningSpot || (creep.fatigue == 0 && !creep.pos.inRangeTo(new RoomPosition(creep.memory.miningSpot.x, creep.memory.miningSpot.y, creep.room.name), 0))) {
            var source = Game.getObjectById(creep.memory.sourceId) || creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                creep.memory.sourceId = source.id;
                // Calculate path considering creeps as obstacles
                let path = PathFinder.search(creep.pos, {pos: source.pos, range: 1}, {
                    // Avoid creeps in pathfinding
                    plainCost: 2,
                    swampCost: 10,
                    roomCallback: function(roomName) {
                        let room = Game.rooms[roomName];
                        if (!room) return;
                        let costs = new PathFinder.CostMatrix;

                        room.find(FIND_CREEPS).forEach(function(creep) {
                            costs.set(creep.pos.x, creep.pos.y, 0xff);
                        });

                        return costs;
                    },
                });

                if (path.path.length > 0) {
                    let miningSpot = path.path[path.path.length - 1];
                    creep.memory.miningSpot = {x: miningSpot.x, y: miningSpot.y};
                    creep.moveTo(miningSpot, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
        } else {
            // Move to the mining spot if not already there
            let miningSpot = new RoomPosition(creep.memory.miningSpot.x, creep.memory.miningSpot.y, creep.room.name);
            if (!creep.pos.isEqualTo(miningSpot)) {
                creep.moveTo(miningSpot, {visualizePathStyle: {stroke: '#ffaa00'}, ignoreCreeps: false});
            } else {
                // Start mining
                var source = Game.getObjectById(creep.memory.sourceId);
                creep.harvest(source);
            }
        }
    }
};

module.exports = roleMiner;
