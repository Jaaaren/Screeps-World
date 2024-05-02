// Import roles
var roleMiner = require('role.miner');
var roleCarrier = require('role.carrier');
var roleBuilder = require('role.builder');
var roleUpgrader = require('role.upgrader');
var roleRepairer = require('role.repairer');
var roleFortifier = require('role.fortifier');
var roleDefender = require('role.defender');
var roleSigner = require('role.signer');
var roleTransporter = require('role.transporter');
var roleTower = require('role.tower');

function getNextAvailableName(role) {
    const creeps = _.filter(Game.creeps, (creep) => creep.memory.role === role);
    let i = 1;
    while (true) {
        let name = `${role} ${i}`;
        if (!creeps.some(creep => creep.name === name)) {
            return name; // Return the first name that isn't found
        }
        i++;
    }
}

function openSpaces(source) {
    let terrain = source.room.lookForAtArea(LOOK_TERRAIN,
        source.pos.y - 1, source.pos.x - 1,
        source.pos.y + 1, source.pos.x + 1,
        true);
    return terrain.filter(t => t.terrain === 'plain').length;
}

module.exports.loop = function () {
    for (let spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];
        const room = spawn.room;
        let sources = room.find(FIND_SOURCES).filter(source => spawn.pos.getRangeTo(source) <= 50);

        // Get exits and examine adjacent rooms
        const exits = Game.map.describeExits(room.name);
        for (let exit in exits) {
            let adjacentRoomName = exits[exit];
            let adjacentRoom = Game.rooms[adjacentRoomName];

            // Check if we have visibility of the room
            if (adjacentRoom) {
                // Check for hostiles or spawns in the room
                let hostiles = adjacentRoom.find(FIND_HOSTILE_CREEPS).length > 0;
                let spawns = adjacentRoom.find(FIND_STRUCTURES, {
                    filter: { structureType: STRUCTURE_SPAWN }
                }).length > 0;

                if (!hostiles && !spawns) {
                    // Add sources from this room
                    let additionalSources = adjacentRoom.find(FIND_SOURCES);
                    sources = sources.concat(additionalSources);
                }
            }
        }

        // Manage sources and creeps for the current spawn's room
        sources.sort((a, b) => spawn.pos.getRangeTo(a) - spawn.pos.getRangeTo(b));
        let sourceInfo = sources.map(source => ({
            id: source.id,
            maxMiners: openSpaces(source),
            currentMiners: _.filter(Game.creeps, c => c.memory.role === 'miner' && c.memory.sourceId === source.id).length,
            position: source.pos
        }));

        sourceInfo.sort((a, b) => a.currentMiners - b.currentMiners);

        if ((_.filter(Game.creeps, c => c.memory.role === 'miner').length === 0 ||
            _.filter(Game.creeps, c => c.memory.role === 'carrier').length === 0) && 
            room.energyAvailable >= 250) {
            spawnInitialCreeps(spawn, sourceInfo);
            continue; // Move to the next spawn if emergency spawning is required
        }

        if (!manageCarriers(spawn, room, sourceInfo)) {
            if (!allocateMiners(spawn, room, sourceInfo)) {
                manageOtherRoles(spawn, room);
            }
        }
    }

    // Execute roles for each creep
    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
        executeRoles(creep);
    }

    // Manage all towers across all rooms you control
    _.forEach(Game.rooms, room => {
        const towers = room.find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
        towers.forEach(tower => {
            roleTower.run(tower);
        });
    });
};

function spawnInitialCreeps(spawn, sourceInfo) {
    // Check and spawn initial Miner
    if (_.filter(Game.creeps, c => c.memory.role === 'miner').length === 0) {
        if (spawn.spawnCreep([WORK, MOVE], getNextAvailableName('miner'), {memory: {role: 'miner', sourceId: sourceInfo[0].id}}) === OK) {
            console.log('Spawning initial Miner');
        }
    }

    // Check and spawn initial Carrier, irrespective of whether a Miner was just spawned
    if (_.filter(Game.creeps, c => c.memory.role === 'carrier').length === 0) {
        if (spawn.spawnCreep([MOVE, CARRY], getNextAvailableName('carrier'), {memory: {role: 'carrier'}}) === OK) {
            console.log('Spawning initial Carrier');
        }
    }
}

function manageCarriers(spawn, room, sourceInfo) {
    let totalMiners = _.filter(Game.creeps, (creep) => creep.memory.role === 'miner').length;
    let totalCarriers = _.filter(Game.creeps, (creep) => creep.memory.role === 'carrier').length;
    let maxCarriers = Math.min(totalMiners, sourceInfo.length); // Maximum carriers should not exceed sources or miners

    if (totalCarriers === 0) {
        let availableEnergy = Math.min(room.energyAvailable, 750); // Ensure we do not exceed 750 energy
        let numCarryParts = Math.floor(availableEnergy / 150) * 2; // Each CARRY and MOVE pair costs 100 energy
        let numMoveParts = Math.ceil(numCarryParts / 2);
        let body = [];
        for (let i = 0; i < numCarryParts && availableEnergy >= 50; i++) {
            body.push(CARRY);
            availableEnergy -= 50;
        }
        for (let i = 0; i < numMoveParts && availableEnergy >= 50; i++) {
            body.push(MOVE);
            availableEnergy -= 50;
        }

        if (body.length > 0) { // Ensure that we have a valid body before spawning
            if (spawn.spawnCreep(body, getNextAvailableName('carrier'), {memory: {role: 'carrier'}}) === OK) {
                console.log(`Spawning emergency Carrier with ${body.length} parts.`);
                return true; // Indicate a carrier was spawned to possibly break out of the calling loop
            }
        }
    } else if (totalCarriers >= maxCarriers) {
        let underpoweredCarriers = _.filter(Game.creeps, c => c.memory.role === 'carrier' && c.body.length < 15); // 15 parts x 50 energy = 750 energy
        if (underpoweredCarriers.length > 0 && room.energyAvailable >= 750) {
            let carrierToRecycle = underpoweredCarriers[0]; // Get the first underpowered carrier
            if (spawn.recycleCreep(carrierToRecycle) === OK) {
                console.log(`Recycling underpowered Carrier: ${carrierToRecycle.name}`);
                return true; // Indicate that an action was taken
            }
        }
    } else {
        let maxEnergyCapacity = Math.min(room.energyCapacityAvailable, 750);
        let numCarryParts = Math.floor((maxEnergyCapacity / 100) * 2);
        let numMoveParts = Math.ceil(numCarryParts / 2);
        while ((numCarryParts * 50 + numMoveParts * 50) > maxEnergyCapacity) {
            numCarryParts -= 1;
            numMoveParts = Math.ceil(numCarryParts / 2);
        }

        let body = Array(numCarryParts).fill(CARRY).concat(Array(numMoveParts).fill(MOVE));
        if (spawn.spawnCreep(body, getNextAvailableName('carrier'), {memory: {role: 'carrier'}}) === OK) {
            console.log(`Spawning Carrier with ${numCarryParts} CARRY and ${numMoveParts} MOVE parts.`);
        }
    }
    return false; // Indicate no carrier was spawned
}


function allocateMiners(spawn, room, sourceInfo) {
    if (!Memory.emergencyMinerSpawnTimestamps) {
        Memory.emergencyMinerSpawnTimestamps = {};
    }

    sourceInfo.forEach(source => {
        let miners = _.filter(Game.creeps, c => c.memory.role === 'miner' && c.memory.sourceId === source.id);
        source.totalWorkParts = _.sum(miners, creep => creep.body.filter(part => part.type === WORK).length);
        let lowTTLMiners = miners.filter(creep => creep.ticksToLive < 80);
        let timeSinceLastSpawn = Game.time - (Memory.emergencyMinerSpawnTimestamps[source.id] || 0);
        source.needsReplacement = lowTTLMiners.length === 1 && miners.length === 1 && timeSinceLastSpawn >= 80;
    });

    sourceInfo.sort((a, b) => a.totalWorkParts - b.totalWorkParts || a.currentMiners - b.currentMiners);

    for (let source of sourceInfo) {
        // Adjust max energy capacity to a maximum of 800 to meet new requirements
        let maxEnergyCapacity = Math.min(room.energyCapacityAvailable, 950);
        // Calculate the maximum number of WORK and CARRY pairs we can afford, ensuring there's energy left for at least one MOVE part
        let numPairs = Math.floor((maxEnergyCapacity - 50) / 150); // Each pair of WORK and CARRY costs 150 energy, plus 50 for MOVE
        numPairs = Math.max(1, Math.min(numPairs, 6)); // Ensure at least one pair, up to a maximum of 5

        if (source.totalWorkParts < 6 || source.needsReplacement) {
            let body = [];
            for (let i = 0; i < numPairs; i++) {
                body.push(WORK);
                body.push(CARRY);
            }
            body.push(MOVE); // Add one MOVE part

            let newName = getNextAvailableName('miner');
            if (spawn.spawnCreep(body, newName, {memory: {role: 'miner', sourceId: source.id}}) === OK) {
                console.log(`Spawning Miner with ${numPairs * 2 + 1} parts for Source ${source.id}`);
                Memory.emergencyMinerSpawnTimestamps[source.id] = Game.time;
                break; // Ensure only one miner is spawned per tick
            }
        }
    }
}   




function manageOtherRoles(spawn, room) {
    let totalBuilders = _.filter(Game.creeps, (creep) => creep.memory.role === 'builder').length;
    let totalUpgraders = _.filter(Game.creeps, (creep) => creep.memory.role === 'upgrader').length;
    let totalRepairers = _.filter(Game.creeps, (creep) => creep.memory.role === 'repairer').length;
    let totalFortifiers = _.filter(Game.creeps, (creep) => creep.memory.role === 'fortifier').length;
    let totalTransporters = _.filter(Game.creeps, (creep) => creep.memory.role === 'transporter').length;

    const constructionSites = room.find(FIND_CONSTRUCTION_SITES).length;

    if (totalBuilders < (constructionSites > 0 ? 1 : 0)) {
        spawnCreep(spawn, 'builder', [WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE], getNextAvailableName('builder'));
    } else if (totalUpgraders < 2) {
        spawnCreep(spawn, 'upgrader', [WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], getNextAvailableName('upgrader'));
    } else if (totalRepairers < 1) {
        spawnCreep(spawn, 'repairer', [WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE], getNextAvailableName('repairer'));
    } else if (totalFortifiers < 0) {
        spawnCreep(spawn, 'fortifier', [WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], getNextAvailableName('fortifier'));
    } else if (totalTransporters < 1) {
        spawnCreep(spawn, 'transporter', [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], getNextAvailableName('transporter'));
    }
}

function spawnCreep(spawn, role, body) {
    let newName = getNextAvailableName(role);
    console.log('Spawning new ' + role + ': ' + newName);
    spawn.spawnCreep(body, newName, {memory: {role: role}});
}

function executeRoles(creep) {
    switch (creep.memory.role) {
        case 'miner':
            roleMiner.run(creep);
            break;
        case 'carrier':
            roleCarrier.run(creep);
            break;
        case 'builder':
            roleBuilder.run(creep);
            break;
        case 'upgrader':
            roleUpgrader.run(creep);
            break;
        case 'repairer':
            roleRepairer.run(creep);
            break;
        case 'fortifier':
            roleFortifier.run(creep);
            break;
        case 'defender':
            roleDefender.run(creep);
            break;
        case 'signer':
            roleSigner.run(creep);
            break;
        case 'transporter':
            roleTransporter.run(creep);
            break;
    }
}
