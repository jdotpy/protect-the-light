const utils = require('./utils');
const Events = require('./events');
const Entities = require('./entities');

function BasicMap(players) {
  const map = {
    name: 'basic',
    levelNum: 0,
    radius: 20,
    players: players.slice(),
    playersByName: utils.keyBy(players, 'name'),
    stateUpdates: utils.Queue(),
    entities: [],
  };

  map.stateDetails = function() {
    return {
      name: this.name,
      radius: this.radius,
    };
  };

  map.addPlayer = function(player) {
    map.players.push(player);
    map.playersByName = utils.keyBy(map.players, 'name');
  }
  map.removePlayer = function(player) {
    map.players.remove(player);
    map.playersByName = utils.keyBy(map.players, 'name');
  }

  map.spawn = function(entity) {
    map.entities.push(entity);
    entity.x = 0;
    entity.y = 0;
    map.stateUpdates.add(Events.spawn(entity));
  }

  map.start = function() {
    // Spawn Fire Tower
    map.spawn(Entities.FireTower());

    // Spawn players
    for (const player of map.players) {
      const character = Entities.PLAYER_ROLES[player.role](player.id);
      player.character = character;
      map.spawn(character);
    }
  }

  map.logic = function(loopTime, elapsed) {
    return map.stateUpdates.drain();
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
