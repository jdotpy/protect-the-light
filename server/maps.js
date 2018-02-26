const utils = require('./utils');
const Entities = require('./entities');

function BasicMap(players) {
  const map = {
    name: 'basic',
    levelNum: 0,
    players: players.slice(),
    playersByName: utils.keyBy(players, 'name'),
    stateUpdates: utils.Queue(),
  };

  map.addPlayer = function(player) {
    map.players.push(player);
    map.playersByName = utils.keyBy(map.players, 'name');
  }
  map.removePlayer = function() {
    map.players.remove(player);
    map.playersByName = utils.keyBy(map.players, 'name');
  }

  map.spawn = function(entity) {
    entity.x = 100;
    entity.y = 100;
    map.stateUpdates.push(Events.spawn(entity));
  }

  map.start = function() {
    // Spawn players
    for (const player of map.players) {
      const character = Entities.PLAYER_ROLES[player.role]();
      player.character = character;
      map.stateUpdates.add(Events.playerAssignCharacter(player, character));
      map.spawn(character);
    }
  }

  map.logic = function() {
    const stateUpdates = [];

    return stateUpdates;
  }

  map.isDone = function() {
    return false;
  }

  map.results = function() {
    return {
      win: true,
    };
  }

  return map;
}

module.exports = {
  Basic: BasicMap,
};
