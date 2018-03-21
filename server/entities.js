const Events = require('./events');
const Abilities = require('./abilities');
const uuid = require('uuid/v4');

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}
function radiansToDegrees(radians) {
  return radians / (Math.PI / 180);
}

const BaseEntity = {
  id: null,
  type: null,
  x: null, // Every entity has a location defined by x,y coords but they are overriden 
  y: null, // by the actual entity
  size: 1,
  orientation: 0,
  abilitiesTypes: [],

  __init__: function() {
    this.id = uuid();
    this.health = this.hp;

    this.abilities = {};
    for (const abilityType of this.abilityTypes) {
      const ability = abilityType.new({ entity: this });
      this.abilities[ability.name] = ability;
    }
  },

  isDestroyed: function() {
    return this.health <= 0;
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
    const degrees = radiansToDegrees(radians);
    return degrees;
  },

  applyVelocity: function(map, angle, speed) {
    const radians = degreesToRadians(angle);
    const vy = Math.sin(radians) * speed;
    const vx = Math.cos(radians) * speed;

    const target = { x: this.x + vx, y: this.y + vy };
    const collisions = map.moveEntity(this, target);
    return collisions;
  },

  applyRotation: function(degrees) {
    this.orientation = (this.orientation + degrees) % 360;
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
  }
};

const Archer = BaseEntity.extend({
  type: 'archer',
  hp: 50,
  speed: 3,
  abilities: [Abilities.ShootBow],
});

const EnemyAI = BaseEntity.extend({
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
    const torches = map.entities.filter((e) => e.type === 'torch');
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
    // Ensure we have a current target
    if (!this.target || this.target.entity.isDestroyed()) {
      this.findTarget(map);
      // No directive if all targets are dead
      if (!this.target) {
        return;
      }
    }
    // If we're in range attack or wait
    if (this.inAttackRange(this.target.entity)) {
      // attack
      console.log('waiting');
    }
    
    // Else attempt to move into range
    const moveAngle = this.angleTowards(this.target.entity);
    const collisions = this.applyVelocity(map, moveAngle, this.speed * elapsed);
    map.stateUpdates.add(Events.entityMove(this));

    // If we collide we should target the thing we ran into
    if (collisions.length > 0) {
      const blocker = collisions[0].entity;
      const newTarget = { entity: blocker, aggroValue: this.target.aggroValue };
      this.aggro[blocker.id] = newTarget;
      this.target = newTarget;
    }
  },
});

const EnemySkeleton = EnemyAI.extend({
  type: 'skele',
  hp: 10,
  speed: 1,
  attackRange: 0.2,
  abilityTypes: [Abilities.MeleeAttack],
});

const FireTower = BaseEntity.extend({
  type: 'fire-tower',
  hp: 100,
  size: 2,
});

const Torch = BaseEntity.extend({
  type: 'torch',
  hp: 10,
  light: 5,
})

const PLAYER_ROLES = {
  archer: Archer,
}

module.exports = {
  PLAYER_ROLES,
  Archer,
  EnemySkeleton,
  FireTower,
  Torch,
}
