var roleTransporter = {
    /** @param {Creep} creep **/
    run: function(creep) {
        // Memory initialization to store the id of the closest container to the controller
        if (!creep.memory.controllerContainerId) {
            const controllerContainer = creep.room.controller.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });
            if (controllerContainer) {
                creep.memory.controllerContainerId = controllerContainer.id;
            }
        }

        // Determine the current energy in spawns and extensions
        let spawnsAndExtensions = creep.room.find(FIND_STRUCTURES, {
            filter: (s) => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION)
        });
        let currentEnergy = _.sum(spawnsAndExtensions, s => s.store[RESOURCE_ENERGY]);
        let maxEnergy = _.sum(spawnsAndExtensions, s => s.store.getCapacity(RESOURCE_ENERGY));
        let energyPercentage = currentEnergy / maxEnergy;

        // If the creep isn't carrying full capacity of energy, it needs to pick some up
        if (creep.store.getFreeCapacity() > 0 && creep.memory.collecting !== false) {
            creep.memory.collecting = true;
            let sources = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) &&
                            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                            structure.id !== creep.memory.controllerContainerId;
                }
            });

            sources.sort((a, b) => b.store.getUsedCapacity(RESOURCE_ENERGY) - a.store.getUsedCapacity(RESOURCE_ENERGY));
            
            if (sources.length > 0) {
                if (creep.withdraw(sources[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
        } else {
            creep.memory.collecting = false;
            let target;

            // Prioritize spawns and extensions if their energy level is below 60%
            if (energyPercentage < 0.6) {
                target = creep.pos.findClosestByPath(spawnsAndExtensions, {
                    filter: (s) => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
            } else {
                const towers = creep.room.find(FIND_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });

                if (towers.length > 0) {
                    towers.sort((a, b) => a.store.getUsedCapacity(RESOURCE_ENERGY) / a.store.getCapacity(RESOURCE_ENERGY) -
                                          b.store.getUsedCapacity(RESOURCE_ENERGY) / b.store.getCapacity(RESOURCE_ENERGY));
                    target = towers[0];
                }

                const controllerContainer = Game.getObjectById(creep.memory.controllerContainerId);
                if (controllerContainer && controllerContainer.store.getUsedCapacity(RESOURCE_ENERGY) <
                    controllerContainer.store.getCapacity(RESOURCE_ENERGY) * 0.5 && (!target || target.store.getUsedCapacity(RESOURCE_ENERGY) /
                    target.store.getCapacity(RESOURCE_ENERGY) > 0.5)) {
                    target = controllerContainer;
                }
            }

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                } else if (creep.store.getUsedCapacity() > creep.store.getCapacity() / 2) {
                    // If after transferring, capacity is still more than half, keep working or find a new target
                    return;
                } else {
                    // Otherwise, go back to collecting
                    creep.memory.collecting = true;
                }
            }
        }
    }
};

module.exports = roleTransporter;