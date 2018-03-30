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

  collide: function() {

  },

  takeDamage: function(damage, aggro, source) {
    if (this.health) {
      this.health = Math.max(this.health - damage, 0);
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
  team: TEAM_GOOD,
  type: 'archer',
  hp: 50,
  speed: 3.1,
  abilityTypes: [Abilities.ShootBow],
});

const Knight = BaseEntity.extend({
  team: TEAM_GOOD,
  type: 'knight',
  hp: 100,
  speed: 2.9,
  abilityTypes: [Abilities.MeleeAttack],
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
        this.orientation = moveAngle;
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
});

const EnemySkeleton = EnemyAI.extend({
  type: 'skele',
  hp: 10,
  speed: 1,
  attackRange: 0.2,
  abilityTypes: [Abilities.MeleeAttack],
});

const FireTower = BaseEntity.extend({
  team: TEAM_NEUTRAL,
  type: 'fire-tower',
  light: 10,
  hp: 30,
  size: 3,
});

const Torch = BaseEntity.extend({
  team: TEAM_NEUTRAL,
  type: 'torch',
  hp: 10,
  light: 5,
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
    if (this.isDestroyed() || collision.target === this.origin.entity) {
      return false; 
    }

    // Remove arrow from play
    this.destroyed = true;
    collision.target.takeDamage(this.damage, this.aggro);
    map.stateUpdates.add(Events.entityDamaged(collision.target, {
      entity: collision.target.id,
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
