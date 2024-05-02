var roleFortifier = {
    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.repairing && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.repairing = false;
            delete creep.memory.target; // Remove target from memory when out of energy
            creep.say('🔄 gather');
        } else if (!creep.memory.repairing && creep.store.getFreeCapacity() === 0) {
            creep.memory.repairing = true;
            creep.say('🛠 fortify');
        }

        if(creep.memory.repairing) {
            let currentTarget = Game.getObjectById(creep.memory.currentTargetId);
            if (!currentTarget || currentTarget.hits === currentTarget.hitsMax) {
                creep.memory.currentTargetId = null;
                currentTarget = null;
            }

            if (!currentTarget) {
                let structures = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) && structure.hits < structure.hitsMax
                });
                let sortedStructures = _.sortBy(structures, (s) => s.hits / s.hitsMax);
                
                if (sortedStructures.length > 0) {
                    currentTarget = sortedStructures[0];
                    creep.memory.currentTargetId = currentTarget.id;
                }
            }

            if (currentTarget) {
                if (creep.repair(currentTarget) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(currentTarget, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Find the structure with the least ticks to decay
                let decayingStructure = creep.room.find(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) && s.ticksToDecay && s.ticksToDecay < 1000
                }).reduce((min, s) => (!min || s.ticksToDecay < min.ticksToDecay) ? s : min, null);

                if(decayingStructure) {
                    creep.moveTo(decayingStructure, {visualizePathStyle: {stroke: '#ffaa00'}});
                    creep.say("🛠 decay")
                }
            }
        } else {
            // First, try to withdraw energy from storage or containers
            var energyStorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) && 
                               s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });

            if (energyStorage && creep.withdraw(energyStorage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(energyStorage, {visualizePathStyle: {stroke: '#ffaa00'}});
            } else {
                // If no storage or container has energy, then look for dropped energy
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

module.exports = roleFortifier;