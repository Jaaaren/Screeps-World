var roleUpgrader = {
    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.upgrading = false;
            creep.say('🔄 gather');
        }
        if(!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
            creep.memory.upgrading = true;
            creep.say('⚡ upgrade');
        }

        if(creep.memory.upgrading) {
            const controller = creep.room.controller;
            // Attempt to upgrade the controller if already at an optimal spot
            if(creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                // Get terrain and find open spots near the controller if not in range
                var terrain = new Room.Terrain(creep.room.name);
                var openSpots = [];
                for(let dx = -3; dx <= 3; dx++) {
                    for(let dy = -3; dy <= 3; dy++) {
                        const x = controller.pos.x + dx;
                        const y = controller.pos.y + dy;
                        if(terrain.get(x, y) !== TERRAIN_MASK_WALL &&
                           creep.room.lookForAt(LOOK_CREEPS, x, y).length == 0 &&
                           creep.room.lookForAt(LOOK_STRUCTURES, x, y).filter(s => OBSTACLE_OBJECT_TYPES.includes(s.structureType)).length == 0) {
                            openSpots.push(new RoomPosition(x, y, creep.room.name));
                        }
                    }
                }
                const optimalSpot = creep.pos.findClosestByPath(openSpots);
                if(optimalSpot) {
                    creep.moveTo(optimalSpot, {visualizePathStyle: {stroke: '#ffaa00'}});
                } else {
                    // Move directly to the controller if no open spot is found
                    creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        } else {
            // Adjusted logic: Prioritize energy withdrawal from storage or containers
            var energyStorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) && 
                               s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });

            if (energyStorage) {
                if (creep.withdraw(energyStorage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(energyStorage, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            } else {
                // If no energy in storage, then look for dropped energy
                var droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                    filter: (resource) => resource.resourceType === RESOURCE_ENERGY
                });

                if (droppedEnergy) {
                    if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(droppedEnergy, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                }
            }
        }
    }
};

module.exports = roleUpgrader;
