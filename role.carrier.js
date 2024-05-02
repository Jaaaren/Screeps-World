var roleCarrier = {
    /** @param {Creep} creep **/
    run: function(creep) {
        const scanRange = 30; // Constant to define the scan range

        // Calculate total energy on the floor within the scan range
        const totalDroppedEnergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, scanRange, {
            filter: (resource) => resource.resourceType === RESOURCE_ENERGY
        }).reduce((total, resource) => total + resource.amount, 0);

        const nearestDeposit = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION ||
                            s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER ||
                            s.structureType === STRUCTURE_LAB) &&
                            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        // Logic to switch to depositing mode
        if (!creep.memory.depositing && nearestDeposit && (creep.store.getUsedCapacity() > creep.store.getCapacity() / 2) &&
            (creep.pos.getRangeTo(nearestDeposit) < scanRange)) {
            creep.memory.depositing = true;
        } else if (!creep.memory.depositing && (creep.store.getFreeCapacity() === 0 || 
                 creep.store.getUsedCapacity(RESOURCE_ENERGY) > totalDroppedEnergy)) {
            creep.memory.depositing = true;
        } else if (creep.memory.depositing && creep.store.getUsedCapacity() === 0) {
            creep.memory.depositing = false;
        }

        // Gathering logic
        if (!creep.memory.depositing) {
            // Find dropped energy within scan range
            const droppedEnergySources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, scanRange, {
                filter: (r) => r.resourceType === RESOURCE_ENERGY
            });

            let largestEnergyPile = droppedEnergySources.reduce((max, current) => (max.amount > current.amount) ? max : current, {amount: 0});

            if (largestEnergyPile && largestEnergyPile.amount > 0) {
                if (creep.pickup(largestEnergyPile) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(largestEnergyPile, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            } else {
                // Find nearest miner with energy within scan range
                let miners = creep.pos.findInRange(FIND_MY_CREEPS, scanRange, {
                    filter: (c) => c.memory.role === 'miner' && c.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                });
                
                // Filter out miners that are already targeted by another carrier
                let availableMiners = miners.filter(miner => !miner.memory.reservedBy || miner.memory.reservedBy === creep.id);
                
                let nearestMiner = creep.pos.findClosestByPath(availableMiners);
                
                if(nearestMiner) {
                    if (!nearestMiner.memory.reservedBy || nearestMiner.memory.reservedBy === creep.id) {
                        nearestMiner.memory.reservedBy = creep.id; // Reserve this miner for the current carrier
                        creep.moveTo(nearestMiner, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                } else {
                    // If all miners are reserved, reset the reservation and choose again
                    miners.forEach(miner => { if (miner.memory.reservedBy === creep.id) delete miner.memory.reservedBy; });
                    nearestMiner = creep.pos.findClosestByPath(miners);
                    if(nearestMiner) {
                        nearestMiner.memory.reservedBy = creep.id;
                        creep.moveTo(nearestMiner, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                }
            }
        } else {
            // Deposit mode, prioritize spawn and extensions first
            let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => {
                    return (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_LAB) &&
                           s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });

            if (!target) {
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => {
                        return (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER) &&
                               s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
            }

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                let spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
                if (spawn) {
                    creep.moveTo(spawn, {range: 3, visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
    }
};

module.exports = roleCarrier;