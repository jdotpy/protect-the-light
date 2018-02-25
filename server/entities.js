const Events = require('./events');

const BaseEntity = {
  x: 0, // Every entity has a location defined by x,y coords but they are overriden 
  y: 0, //by the actual entity

  distanceBetween: function(target) {
    return Math.sqrt(
      Math.pow(this.x - target.x, 2)
      + 
      Math.pow(this.y - target.y, 2)
    );
  },
}

const Archer() {

}

const Archer() {

}

const NPC() {
  const npc = BaseEntity.extend({});
}
