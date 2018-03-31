const Events = require('./events');
const utils = require('./utils');

const BaseAbility = {
  cooldown: 1000,
  castTime: 0,
  aggroFactor: 1,
  damage: 1,

  meleeAngle: 120,
  
  __init__: function() {
    this.startTime = null;
    this.lastUsed = 0;
    this.isCasting = false;
  },

  cancel: function() {
    if (this.isCasting) {
      this.startTime = null;
      this.isCasting = false;
    }
  },
  
  onCooldown: function() {
    return this.lastUsed + this.cooldown > new Date().valueOf();
  },

  canUse: function() {
    if (this.isCasting || this.onCooldown()) {
      return false;
    }
    return true;
  },

  isUsing: function() {
    return this.isCasting;
  },
  
  isDone: function(timestamp) {
    if (!this.startTime) {
      return false;
    }
    if (!this.castTime) {
      return true;
    }
    return (timestamp - this.startTime) > this.castTime;
  },

  use: function(map) {
    const timestamp = new Date().valueOf();

    // If this is the first call to initiate an ability trigger the start-casting routine
    if (!this.isCasting) {
      this.startTime = timestamp;
      this.isCasting = true;
    }

    // Check if we're done casting
    if (this.isDone(timestamp)) {
      this.apply(map);
      this.isCasting = false;
      this.lastUsed = this.startTime + this.castTime;
      return true;
    }
    return false;
  },

  inMeleeCone: function(source, target, direction, range) {
    const sourceDirection = source.orientation
    const distance = source.distanceTo(target);
    const angleToTarget = source.angleTowards(target);
    const coneStartAngle = direction - (this.meleeAngle / 2);
    const coneEndAngle = direction + (this.meleeAngle / 2);
    const inConeAngle = utils.angleBetween(angleToTarget, coneStartAngle, coneEndAngle)

    const inRange = (distance - target.collisionRadius()) <= range;
    return inRange && inConeAngle;
  },

  applyDamage: function(map, target) {
    const aggro = this.damage * this.aggroFactor;
    target.takeDamage(this.damage, aggro, this);
    map.stateUpdates.add(Events.entityDamaged(target, {
      entity: target.id,
      ability: this.name,
    }));
  },

  getAllTargets: function(map) {
    return map.targetableEntities(this.entity);
  },

  apply: function(map) {
    map.stateUpdates.add(Events.entityAbility(this.entity, this));
    for (const target of this.getAllTargets(map)) {
      if (this.isValidTarget(map, target)) {
        this.applyDamage(map, target);
      }
    }
  },

  isValidTarget: function(map, target) {
    // This should be overridden by each ability type
  }
};

const MeleeAttack = BaseAbility.extend({
  name: 'melee',
  range: 2,
  damage: 3,

  isValidTarget: function(map, target) {
    return this.inMeleeCone(
      this.entity,
      target,
      this.entity.orientation,
      this.range,
    );
  },
});

const ShootBow = BaseAbility.extend({
  name: 'shoot-bow',
  damage: 2,

  __init__: function __init__() {
    this.Arrow = require('./entities').Arrow;
  },

  apply: function(map) {
    const Entities = require('./entities');
    const location = this.entity.getVectorFromMe(2);
    map.spawn(this.Arrow.new({
      damage: this.damage,
      aggro: this.damage * this.aggroFactor,
      team: this.entity.team,
      orientation: this.entity.orientation,
      origin: this,
    }), location.x, location.y);
  },

});

module.exports = {
  ShootBow,
  MeleeAttack,
};
