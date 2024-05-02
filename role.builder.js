var roleBuilder = {
    /** @param {Creep} creep **/
    run: function(creep) {
        // Check if the creep is out of energy
        if(creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
        }
        // Update to ensure the builder switches to building mode only when it is fully charged
        else if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
        }

        if(creep.memory.building) {
            var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            if(target) {
                if(creep.build(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                } else {
                    // Check if the built structure is a rampart, and repair it if there's still energy left
                    if (target.structureType === STRUCTURE_RAMPART) {
                        creep.repair(target);
                    }
                }
            } else {
                // Move to a designated wait area or recycle the creep if no construction sites are available
                const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
                if(spawn && creep.pos.getRangeTo(spawn) > 1) {
                    creep.moveTo(spawn, {visualizePathStyle: {stroke: '#ffffff'}});
                } else if(spawn) {
                    spawn.recycleCreep(creep);
                }
            }
        } else {
            var storages = creep.room.find(FIND_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_CONTAINER || 
                                s.structureType === STRUCTURE_STORAGE) &&
                                s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });

            var storage = storages.reduce((high, next) => high.store.getUsedCapacity(RESOURCE_ENERGY) > next.store.getUsedCapacity(RESOURCE_ENERGY) ? high : next, storages[0]);

            if(storage && creep.withdraw(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffaa00'}});
            } else if (creep.room.energyAvailable === creep.room.energyCapacityAvailable) {
                // Only pick up dropped energy if spawn and extensions are fully charged
                var droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                    filter: (resource) => resource.resourceType == RESOURCE_ENERGY
                });

                if(droppedEnergy) {
                    if(creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(droppedEnergy, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                }
            }
        }
    }
};

module.exports = roleBuilder;