const Events = require('./events');
const uuid = require('uuid/v4');

const BaseEntity = Object.extend({
  id: null,
  type: null,
  x: null, // Every entity has a location defined by x,y coords but they are overriden 
  y: null, // by the actual entity
  size: 1,
  orientation: 0,

  __init__: function() {
    this.id = uuid();
    this.health = this.hp;
  },

  distanceBetween: function(target) {
    return Math.sqrt(
      Math.pow(this.x - target.x, 2)
      + 
      Math.pow(this.y - target.y, 2)
    );
  },

  applyVelocity: function(map, angle, speed) {
    const radians = angle * (Math.PI / 180);
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
  }
});

const Archer = BaseEntity.extend({
  type: 'archer',
  hp: 50,
  speed: 3,
});

const EnemyAI = BaseEntity.extend({
  __init__: function __init__() {
    this.super(__init__)();
  },
  logic: function(map, loopTime, elapsed) {
    
  },
});

const EnemySkeleton = EnemyAI.extend({
  type: 'skele',
  hp: 10,
  speed: 2.5,
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
