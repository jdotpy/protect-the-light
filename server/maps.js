const utils = require('./utils');
const Events = require('./events');
const Entities = require('./entities');

const Collision = {
  otherMember(self) {
    // Return the entity that you're colliding with
    if (this.target === self) {
      return this.source;
    }
    return this.target;
  },

  hasMember(entity) {
    if (this.target === entity || this.source === entity) {
      return true;
    }
    return false;
  },
};

const Spawner = {
  spawnCount: 1,
  spawnInterval: 20,

  __init__: function() {
    this.lastSpawn = utils.preciseTime();
    this.currentSpawnInterval = this.getSpawnInterval();
  },

  getSpawnInterval: function() {
    if (this.spawnIntervalRange) {
      const [start, end] = this.spawnCountRange;
      return utils.getRandomNumber(start, end);
    }
    return this.spawnInterval;
  },

  getSpawnCount: function() {
    if (this.spawnCountRange) {
      const [start, end] = this.spawnCountRange;
      return utils.getRandomInt(start, end);
    }
    return this.spawnCount;
  },

  logic: function(map, loopTime) {
    if (loopTime > this.lastSpawn + this.currentSpawnInterval) {
      this.spawn(map);
      this.lastSpawn = loopTime;
      this.currentSpawnInterval = this.getSpawnInterval();
    }
  },

  spawn: function(map) {
    const spawnDistance = map.radius - 1;
    const spawnCount = this.getSpawnCount();
    for (let i=0;i<spawnCount;i++) {
      const angle = utils.getRandomNumber(0, 360);
      const position = utils.getVector(0, 0, angle, spawnDistance);
      map.spawn(Entities.EnemySkeleton.new(), position.x, position.y);
    }
  }
};

function BasicMap(players) {
  const map = {
    name: 'basic',
    levelNum: 0,
    radius: 30,
    players: players.slice(),
    spawner: Spawner.new({ spawnInterval: 20, spawnCountRange: [1, 2] }),
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

  map.handleCollision = function(mover, blocker, target) {
    // We're colliding, now determine if we are moving away or towards
    const distanceFromSource = blocker.distanceTo(mover);
    const distanceFromTarget = blocker.distanceTo(target);
    const movingTowards = distanceFromSource >= distanceFromTarget;

    // Determine if it was a blocking collision
    let blocking = true;
    if (!movingTowards) {
      // Anything moving away from an object won't block
      blocking = false;
    }
    else if (blocker.team === mover.team) {
      // Dont block them if they're on your team
      blocking = false;
    }
    else if (blocker.team === mover.team) {
      // Dont block them if they're on your team
      blocking = false;
    }

    const collision = Collision.new({
      towards: movingTowards,
      source: mover,
      target: blocker,
      blocking,
    });
    mover.collide(this, collision);
    blocker.collide(this, collision);
    return collision;
  },

  map.moveEntity = function(mover, target) {
    const collisions = [];
    let blocked = false;

    for (const entity of map.entities.filter((e) => e.collision)) {
      // Dont register collide events with yourself
      if (entity === mover || entity.carriedBy) {
        continue
      }
      const collisionDistance = entity.collisionRadius() + mover.collisionRadius();
      if (entity.distanceTo(target) < collisionDistance) {
        const collision = this.handleCollision(mover, entity, target);
        collisions.push(collision);
        if (collision.blocking) {
          blocked = true;
        }
      }
    }
    // Now if we didn't get blocked by a collision go ahead with relocation
    if (!blocked) {
      mover.x = target.x;
      mover.y = target.y;
      mover.onMove(this);
    }
    return collisions;
  }

  map.targetableEntities = function(targeter) {
    return map.entities.filter((e) => e.team !== targeter.team)
  }

  map.start = function() {
    // Spawn first torch
    map.tower = Entities.FireTower.new();
    map.spawn(map.tower, 0, 0);

    // Spawn players
    for (const player of map.players) {
      const character = Entities.PLAYER_ROLES[player.role].new({ playerID: player.id });
      player.character = character;
      map.spawn(character, -2, -2);
    }

  }

  map.logic = function(loopTime, elapsed) {
    // Logic for player entities
    for (const player of map.players) {
      player.logic(map, loopTime, elapsed);
    }

    const toRemove = [];
    for (const entity of map.entities) {
      if (entity.isDestroyed()) {
        map.stateUpdates.add(Events.entityDestroyed(entity));
        toRemove.push(entity);
        continue
      }
      // Run logic
      if (entity.logic) {
        entity.logic(map, loopTime, elapsed);
      }
    }
    // Remove marked entities
    for (const entityToRemove of toRemove) {
      map.entities.remove(entityToRemove);
    }

    // Handle any enemy spawning logic
    map.spawner.logic(map, loopTime, elapsed);

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
