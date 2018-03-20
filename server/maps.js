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

  map.spawn = function(entity, x, y) {
    map.entities.push(entity);
    entity.x = x;
    entity.y = y;
    map.stateUpdates.add(Events.spawn(entity));
  }

  map.moveEntity = function(mover, target) {
    const collisions = [];
    let blocked = false;

    for (const entity of map.entities) {
      // Dont collide with yourself
      if (entity === mover) {
        continue
      }
      const collisionDistance = entity.collisionRadius() + mover.collisionRadius();
      const distanceFromTarget = entity.distanceTo(target);

      if (distanceFromTarget < collisionDistance) {
        // We're colliding, now determine if we are moving away or towards
        const distanceFromSource = entity.distanceTo(mover);
        if (distanceFromSource >= distanceFromTarget) {
          // We're moving towards the object
          blocked = true;
          collisions.push({ towards: true, entity });
        }
        else {
          // We're moving away from the object, allow movement
          collisions.push({ towards: false, entity });
        }
      }
    }
    // Now if we didn't get blocked by a collision go ahead with relocation
    if (!blocked) {
      mover.x = target.x;
      mover.y = target.y;
    }
    return collisions;
  }

  map.start = function() {
    // Spawn Fire Tower
    map.spawn(Entities.FireTower.new(), 0, 0);

    map.spawn(Entities.Torch.new({ light: 10 }), 0, 0);

    // Spawn players
    for (const player of map.players) {
      const character = Entities.PLAYER_ROLES[player.role].new({ playerID: player.id });
      player.character = character;
      map.spawn(character, -2, -2);
    }

    // Spawn enemies
    map.spawn(Entities.EnemySkeleton.new(), 0, 5);
  }

  map.logic = function(loopTime, elapsed) {
    // Logic for player entities
    for (const player of map.players) {
      player.logic(map, loopTime, elapsed);
    }
    // Logic for all non-player entities
    for (const entity of map.entities) {
      if (entity.playerID) {
        continue;
      }
      if (entity.logic) {
        entity.logic(map, loopTime, elapsed);
      }
    }
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
