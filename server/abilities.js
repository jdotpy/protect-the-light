const Events = require('./events');
const utils = require('./utils');

const BaseAbility = {
  cooldown: 1,
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
    return this.lastUsed + this.cooldown > utils.preciseTime();
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
    const timestamp = utils.preciseTime();

    // If this is the first call to initiate an ability trigger the start-casting routine
    if (!this.isCasting) {
      this.startTime = timestamp;
      this.isCasting = true;
    }

    // Check if we're done casting
    if (this.isDone(timestamp)) {
      this.apply(map);
      map.stateUpdates.add(Events.entityAbility(this.entity, this));
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
    this.arrow = require('./entities').Arrow;
  },

  apply: function(map) {
    console.log('Creating arrow')
    const location = this.entity.getVectorFromMe(2);
    map.spawn(this.arrow.new({
      damage: this.damage,
      aggro: this.damage * this.aggroFactor,
      team: this.entity.team,
      orientation: this.entity.orientation,
      origin: this,
    }), location.x, location.y);
  },
});

const PenetratingShot = ShootBow.extend({
  name: 'penetrating-shot',
  damage: 4,
  castTime: 1,
  cooldown: 10,

  __init__: function __init__() {
    this.arrow = require('./entities').PenetratingArrow;
  },
});

const ToggleCarryTorch = BaseAbility.extend({
  name: 'toggle-carry-torch',
  range: 1.5,
  apply: function(map) {
    // Cover the set-down-torch case
    if (this.entity.carryingTorch) {
      map.stateUpdates.add(Events.entityDropTorch(this.entity, this.entity.carryingTorch));
      this.entity.carryingTorch.carriedBy = null;
      this.entity.carryingTorch = null;
      return;
    }

    // We don't have one, now determine if there's one in range
    const torches = map.entities.filter((e) => e.type === 'torch');
    const closest = { distance: Infinity, torch: null };
    for (const torch of torches) {
      const distance = this.entity.distanceTo(torch);
      if (distance < this.range && distance < closest.distance) {
        closest.torch = torch;
        closest.distance = distance;
      }
    }
    // Now if we found one in range, pick up the closest torch
    if (closest.torch) {
      this.entity.carryingTorch = closest.torch;
      this.entity.carryingTorch.carriedBy = this.entity;
      map.stateUpdates.add(Events.entityPickupTorch(this.entity, closest.torch));
    }
  },
});

module.exports = {
  ShootBow,
  MeleeAttack,
  ToggleCarryTorch,
  PenetratingShot,
};
