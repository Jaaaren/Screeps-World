var roleTower = {
    run: function(tower) {
        // First, handle any hostile creeps
        var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile) {
            tower.attack(closestHostile);
            return; // Stop further execution to prioritize defense
        }

        // If no hostiles, check for structures that need repairing
        // Prioritize ramparts and walls below a certain hit point threshold first
        var criticalRepairs = tower.room.find(FIND_STRUCTURES, {
            filter: (structure) => (structure.structureType === STRUCTURE_RAMPART || structure.structureType === STRUCTURE_WALL) &&
                                    structure.hits < 5000000
        }).sort((a, b) => a.hits - b.hits);

        if (criticalRepairs.length > 0) {
            tower.repair(criticalRepairs[0]);
            return;
        }

        // Then handle other repairs
        var repairs = tower.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.hits < structure.hitsMax &&
                                    structure.structureType !== STRUCTURE_WALL &&
                                    structure.structureType !== STRUCTURE_RAMPART &&
                                    structure.hits < 1000
        }).sort((a, b) => a.hits - b.hits);

        if (repairs.length > 0) {
            tower.repair(repairs[0]);
            return;
        }

        // Lastly, if no repairs needed, heal any injured friendly creeps
        var injuredCreep = tower.room.find(FIND_MY_CREEPS, {
            filter: (creep) => creep.hits < creep.hitsMax
        })[0];

        if (injuredCreep) {
            tower.heal(injuredCreep);
            return;
        }
    }
};

module.exports = roleTower;