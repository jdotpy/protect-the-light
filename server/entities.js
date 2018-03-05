const Events = require('./events');
const uuid = require('uuid/v4');

const BaseEntity = {
  id: null,
  type: null,
  x: null, // Every entity has a location defined by x,y coords but they are overriden 
  y: null, // by the actual entity
  size: 0,

  __init__: function() {
    this.id = uuid();
  },

  distanceBetween: function(target) {
    return Math.sqrt(
      Math.pow(this.x - target.x, 2)
      + 
      Math.pow(this.y - target.y, 2)
    );
  },

  stateDetails: function() {
    const details = {
      id: this.id,
      type: this.type,
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
    return this.size;
  }
}

function Archer(playerID) {
  const character = BaseEntity.extend({
    playerID,
    type: 'archer',
    hp: 50,
  });
  return character;
}

function BasicEnemy() {
  const enemy = BaseEntity.extend({ type: 'basic-enemy', hp: 10 });
  return enemy;
}

function FireTower() {
  const tower = BaseEntity.extend({ type: 'fire-tower', hp: 100 });
  return tower;
}

const PLAYER_ROLES = {
  archer: Archer,
}

module.exports = {
  PLAYER_ROLES,
  Archer,
  BasicEnemy,
  FireTower,
}
