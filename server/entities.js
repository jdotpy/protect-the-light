const Events = require('./events');

const BaseEntity = {
  x: null, // Every entity has a location defined by x,y coords but they are overriden 
  y: null, // by the actual entity

  distanceBetween: function(target) {
    return Math.sqrt(
      Math.pow(this.x - target.x, 2)
      + 
      Math.pow(this.y - target.y, 2)
    );
  },

  stateDetails: function() {
    return {
      x: this.x,
      y: this.y,
    };
  }
}

function Archer() {
  const character = BaseEntity.extend({ });
  return character;
}

function BasicEnemy() {
  const enemy = BaseEntity.extend({ });
  return enemy;
}

const PLAYER_ROLES = {
  archer: Archer,
}

module.exports = {
  PLAYER_ROLES,
  Archer,
  BasicEnemy,
}
