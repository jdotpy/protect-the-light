const BaseAbility = {
  cooldown: 1000,
  castTime: 0,
  aggroFactor: 1,
  damage: 1,
  
  __init__: function() {
    this.startTime = null;
    this.lastUsed = 0;
    this.isCasting = false;
  }

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

  effect: function(map) {
    // This should be overridden by each ability type
  }

  use: function(map) {
    const timestamp = new Date().valueOf();

    // If this is the first call to initiate an ability trigger the start-casting routine
    if (!this.isCasting) {
      this.startTime = timestamp;
      this.isCasting = true;
    }

    // Check if we're done casting
    if (this.isDoneCasting(timestamp)) {
      this.effect(map);
      this.isCasting = false;
      this.lastUsed = this.startTime + this.castTime;
      return true;
    }
    return false;
  },

  inCone: function(source, degrees, range, target) {
    
  }
};

const MeleeAttack = BaseAbility.extend({
  name: 'melee',
  degrees: 120,
  range: 2,
  effect: function(map) {
    for (const target of map.entities) {
      if (this.inCone(this.entity, target)) {
        target.dealDamage({
          dealtBy: this.entity,
          ability: this,
          damage: this.damage,
          aggro: this.damage * this.aggroFactor,
        });
      }
    }
  },
});

const ShootBow = BaseAbility.extend({ name: 'shoot-bow' });
