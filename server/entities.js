const Events = require('./events');
const Abilities = require('./abilities');
const utils = require('./utils');
const uuid = require('uuid/v4');

const TEAM_BAD = 'bad';
const TEAM_GOOD = 'good';
const TEAM_NEUTRAL = 'nuetral';

const BaseEntity = {
  id: null,
  type: null,
  x: null, // Every entity has a location defined by x,y coords but they are overriden 
  y: null, // by the actual entity
  size: 1,
  orientation: 0,
  collision: true,
  abilityTypes: [],
  carryDistance: 1,

  __init__: function() {
    this.id = uuid();
    if (this.hp) {
      this.health = this.hp;
    }

    this.abilities = {};
    for (const abilityType of this.abilityTypes) {
      const ability = abilityType.new({ entity: this });
      this.abilities[ability.name] = ability;
    }
  },

  onMove: function(map) {

  },

  onRotate: function(map) {

  },

  onDestroyed: function() {

  },

  collide: function() {

  },

  takeDamage: function(damage, aggro, source) {
    if (this.health) {
      this.health = Math.max(this.health - damage, 0);
    }
    if (this.health <= 0) {
      this.onDestroyed();
    }
  },

  isDestroyed: function() {
    return this.health <= 0;
  },

  isPlayer: function() {
    return Boolean(this.playerID);
  },

  distanceTo: function(target) {
    return Math.sqrt(
      Math.pow(this.x - target.x, 2)
      + 
      Math.pow(this.y - target.y, 2)
    );
  },

  angleTowards: function(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const radians = Math.atan2(dy, dx);
    const degrees = utils.radiansToDegrees(radians);
    return utils.normalizeAngle(degrees);
  },

  getVectorFromMe: function(distance) {
    return utils.getVector(this.x, this.y, this.orientation, distance)
  },

  applyVelocity: function(map, angle, distance) {
    const target = utils.getVector(this.x, this.y, angle, distance)
    const collisions = map.moveEntity(this, target);
    return collisions;
  },

  setOrientation: function(map, angle) {
    this.orientation = angle;
    this.onRotate(map);
    map.stateUpdates.add(Events.entityRotate(this));
  },

  stateDetails: function() {
    const details = {
      id: this.id,
      type: this.type,
      size: this.size,
      orientation: this.orientation,
      health: this.health,
      light: this.light,
      hp: this.hp,
      x: this.x,
      y: this.y,
    };

    if (this.playerID) {
      details.playerID = this.playerID;
    }
    return details;
  },

  collisionRadius: function() {
    return this.size / 2;
  },

  inAttackRange: function(target) {
    const distance = this.distanceTo(target);
    const range = this.attackRange + target.collisionRadius() + this.collisionRadius();
    return distance <= range;
  },

  isBlockingObject: function() {
    return this.collision;
  },
};

const PlayerEntity = BaseEntity.extend({
  logic: function(map, loopTime, elapsed) {
  },
  updateCarriedObjects: function(map) {
    if (this.carryingTorch) {
      const newObjectLocation = this.getVectorFromMe(this.carryDistance);
      this.carryingTorch.x = newObjectLocation.x;
      this.carryingTorch.y = newObjectLocation.y;
      map.stateUpdates.add(Events.entityMove(this.carryingTorch));
    }
  },
  onMove: function(map) {
    this.updateCarriedObjects(map);
  },
  onRotate: function(map) {
    this.updateCarriedObjects(map);
  },
})

const Archer = PlayerEntity.extend({
  team: TEAM_GOOD,
  type: 'archer',
  hp: 20,
  speed: 3.1,
  abilityTypes: [Abilities.ToggleCarryTorch, Abilities.ShootBow],
});

const Knight = PlayerEntity.extend({
  team: TEAM_GOOD,
  type: 'knight',
  hp: 50,
  speed: 2.9,
  abilityTypes: [Abilities.ToggleCarryTorch, Abilities.MeleeAttack],
});

const EnemyAI = BaseEntity.extend({
  team: TEAM_BAD,

  __init__: function __init__() {
    this.super(__init__)();
    this.aggro = {};
    this.target = null;
  },

  findTarget: function(map) {
    let highestAggro = 0;
    let bestTarget = null;
    for (const entityId of Object.keys(this.aggro)) {
      const target = this.aggro[entityId];
      // Remove if already destroyed
      if (target.entity.isDestroyed()) {
        delete this.aggro[entityId];
      }
      // Determine if its better than our current target
      if (target.aggroValue > highestAggro) {
        highestAggro = target.aggroValue;
        bestTarget = target;
      }
    }
    // If we already have a valid target aggro'd then use it
    if (bestTarget) {
      this.target = bestTarget;
      return this.target;
    }
    // Otherwise look for new torches to destroy
    const torches = map.entities.filter((e) => e.team === TEAM_NEUTRAL);
    for (const torch of torches) {
      this.aggro[torch.id] = { aggroValue: 1, entity: torch };
    }
    // If there were any torches, use the first one as our new target, otherwise we got nuthin
    if (torches.length > 0) {
      this.target = { aggroValue: this.aggro[torches[0].id].aggroValue, entity: torches[0] };
    }
    else {
      this.target = null;
    }
    return this.target;
  },

  logic: function(map, loopTime, elapsed) {
    // If we're using an ability, dont stop it
    if (this.usingAbility) {
      const complete = this.usingAbility.use();

      // If we aren't done using this ability, dont do anything till its done
      if (!complete) {
        return;
      }
    }

    // Ensure we have a current target
    if (!this.target || this.target.entity.isDestroyed()) {
      // Reset current target
      if (this.target) {
        delete this.aggro[this.target.entity.id];
        this.target = null;
      }
      
      // Find a new one
      this.findTarget(map);
      // No directive if all targets are dead
      if (!this.target) {
        return;
      }
    }

    // If we're in range, attack
    if (this.inAttackRange(this.target.entity)) {
      // attack
      for (const abilityType of this.abilityTypes) {
        const ability = this.abilities[abilityType.name];
        if (ability.canUse()) {
          const completed = ability.use(map);
          if (!completed) {
            this.usingAbility = ability;
          }
          break;
        }
      }
    }
    else {
      // Else attempt to move into range
      const moveAngle = this.angleTowards(this.target.entity);
      if (moveAngle !== this.orientation) {
        this.setOrientation(map, moveAngle);
        map.stateUpdates.add(Events.entityRotate(this));
      }
      const collisions = this.applyVelocity(map, moveAngle, this.speed * elapsed);
      map.stateUpdates.add(Events.entityMove(this));

    }
  },

  collide: function(map, collision) {
    // If we collide we should target the thing we ran into
    if (collision.source === this) {
      const blocker = collision.target;
      const newTarget = { entity: blocker, aggroValue: this.target.aggroValue };
      this.aggro[blocker.id] = newTarget;
      this.target = newTarget;
    }
  },

  takeAggro: function(entity, aggroValue) {
    let currentAggro = this.aggro[entity.id];
    if (!currentAggro) {
      currentAggro = { aggroValue: 0, entity };
      this.aggro[entity.id] = currentAggro;
    }
    currentAggro.aggroValue += aggroValue;
    if (!this.target || currentAggro.aggroValue > this.target.aggroValue) {
      this.target = currentAggro;
    }
  },

  takeDamage: function takeDamage(damage, aggro, source) {
    this.super(takeDamage)(damage, aggro, source);
    this.takeAggro(source.entity, aggro);
  },
});

const EnemySkeleton = EnemyAI.extend({
  type: 'skele',
  hp: 10,
  speed: 2,
  attackRange: 0.2,
  abilityTypes: [Abilities.MeleeAttack],
});

const FireTower = BaseEntity.extend({
  team: TEAM_NEUTRAL,
  type: 'fire-tower',
  light: 12,
  hp: 50,
  size: 3,
  torchSpawnInterval: 30,

  __init__: function __init__() {
    this.super(__init__)();
    this.radius = this.size / 2;
    this.torches = {
      topLeft: null,
      topRight: null,
      bottomLeft: null,
      bottomRight: null,
    };
    this.lastTorchSpawn = utils.preciseTime();
  },

  getTorchSpawnCoords: function(location) {
    switch (location) {
      case 'topLeft': 
        return { x: this.x - this.radius, y: this.y + this.radius };
      case 'topRight': 
        return { x: this.x + this.radius, y: this.y + this.radius };
      case 'bottomRight': 
        return { x: this.x + this.radius, y: this.y - this.radius };
      case 'bottomLeft': 
        return { x: this.x - this.radius, y: this.y - this.radius };
    }
  },

  shouldSpawnTorch: function() {
    return this.lastTorchSpawn + this.torchSpawnInterval < utils.preciseTime();
  },

  canSpawnTorch: function() {
    for (const torchLocation of Object.keys(this.torches)) {
      const torch = this.torches[torchLocation];
      // If we haven't spawned a torch here before
      if (!torch) {
        return true;
      }
      // If the torch was destroyed or moved, clear for next time, resetting cooldown
      const spawn = this.getTorchSpawnCoords(torchLocation);
      if (torch.isDestroyed() || spawn.x !== torch.x || spawn.y !== torch.y) {
        this.torches[torchLocation] = null;
        this.lastTorchSpawn = utils.preciseTime();
      }
    }
    return false;
  },

  spawnTorch: function(map) {
    const emptyLocation = Object.keys(this.torches)
      .find((location) => !this.torches[location]);
    if (!emptyLocation) {
      return false;
    }

    const newTorch = Torch.new();
    const spawnLocation = this.getTorchSpawnCoords(emptyLocation);
    map.spawn(newTorch, spawnLocation.x, spawnLocation.y);
    this.torches[emptyLocation] = newTorch;
    this.lastTorchSpawn = utils.preciseTime();
    return newTorch;
  },

  logic: function(map, loopTime, elapsed) {
    if (!this.isDestroyed() && this.shouldSpawnTorch() && this.canSpawnTorch()) {
      this.spawnTorch(map);
    }
  },
});

const Torch = BaseEntity.extend({
  team: TEAM_NEUTRAL,
  type: 'torch',
  hp: 10,
  light: 5,

  onDestroyed: function() {
    if (this.carriedBy) {
      this.carriedBy.carryingTorch = null;
      this.carriedBy = null;
    }
  }
})

const Arrow = BaseEntity.extend({
  size: 0.2,
  type: 'arrow',
  speed: 8,
  destroyed: false,

  isDestroyed: function() {
    return this.destroyed;
  },

  collide: function(map, collision) {
    if (this.isDestroyed() || collision.hasMember(this.originEntity)) {
      return false; 
    }
    const otherEntity = collision.otherMember(this);

    // Remove arrow from play
    this.destroyed = true;
    otherEntity.takeDamage(this.damage, this.aggro, this.origin);
    map.stateUpdates.add(Events.entityDamaged(otherEntity, {
      entity: otherEntity.id,
      ability: this.name,
    }));
  },

  logic: function(map, loopTime, elapsed) {
    // Else attempt to move into range
    this.applyVelocity(map, this.orientation, this.speed * elapsed);
    map.stateUpdates.add(Events.entityMove(this));
  },
})

const PLAYER_ROLES = {
  archer: Archer,
  knight: Knight,
}

module.exports = {
  PLAYER_ROLES,
  Archer,
  EnemySkeleton,
  FireTower,
  Torch,
  Arrow,
}
