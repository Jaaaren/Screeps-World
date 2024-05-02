var roleHarvester = {
    run: function(creep) {
        // Check if the harvester should go back to harvesting.
        if (creep.store.getFreeCapacity() > 0 && !creep.memory.upgrading && !creep.memory.building) {
            const source = Game.getObjectById(creep.memory.sourceId);
            if (source && creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return; // Early return to prevent actions below if harvesting is needed
        }

        // Try to deposit in spawn, extension, or tower
        let structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => (s.structureType == STRUCTURE_SPAWN ||
                            s.structureType == STRUCTURE_EXTENSION ||
                            s.structureType == STRUCTURE_TOWER) &&
                           s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (structure) {
            creep.memory.upgrading = false;
            creep.memory.building = false;
            creep.say('⚡ deposit');
            if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(structure, {visualizePathStyle: {stroke: '#ffffff'}});
                return; // Early return after depositing
            }
        } else {
            // Next, try to deposit in storage or container
            let storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (s.structureType == STRUCTURE_STORAGE || 
                                s.structureType == STRUCTURE_CONTAINER) &&
                               s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (storage) {
                if (creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}});
                    return; // Early return after depositing
                }
            }
        }

        // Building logic
        let target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (target) {
            creep.memory.upgrading = false; 
            creep.memory.building = true; 
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
            } else if (creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.building = false; // Reset building flag if energy is used up
            }
            return; // Return to avoid overlapping with upgrade logic
        }

        // Upgrading logic
        if (!creep.memory.building && creep.store[RESOURCE_ENERGY] > 0) {
            creep.memory.upgrading = true; 
            creep.say('⚡ upgrade');
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            } 
        } else if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.upgrading = false; // Reset upgrading flag if energy is used up
        }
    }
};

module.exports = roleHarvester;
