const Entities = require('./entities');
const Events = require('./events');
const utils = require('./utils');
const uuid = require('uuid/v4');

function errorMessage(message) {
  return {
    event: 'error',
    message,
  };  
}

const Player = {
  character: null,
  role: null,
  name: null,
  ready: false,

  __init__: function() {
    this.id =  uuid();
    this.commands = utils.Queue();
    this.sendMessage(Events.playerConnect(this));
    this.movement = {};
  },

  sendMessage: function(message) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    try {
      this.socket.send(message);
    }
    catch (error) {
      console.error('Errored while trying to send message to client');
      console.log(error);
      console.log(`[${this.name}] Player disconnected!`);
      this.game.removePlayer(this);
    }
  },

  stateDetails: function() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      ready: this.ready,
    }
  },
  handleMessage: function(message) {
    switch (message.event) {
      case 'ping': {
        this.sendMessage({ event: 'pong' });
        return true;
      }
      case 'player.move': {
        let angle;
        if (message.direction === 'up') {
          angle = 90;
        }
        else if (message.direction === 'down') { 
          angle = 270;
        }
        else if (message.direction === 'right') { 
          angle = 0;
        }
        else if (message.direction === 'left') { 
          angle = 180;
        }
        else {
          angle = message.direction || 0;
          angle = angle % 360;
        }
        this.movement = { angle, power: message.power || 0 };
        return true;
      }
      case 'player.orientation': {
        let angle = message.direction;
        if (typeof angle !== 'number') {
          this.sendMessage(errorMessage(`Invalid orientation.direction: ${message.direction}`));
          return false;
        }
        this.newOrientation = angle;
        return true;
      }
      case 'player.useAbility': {
        let abilityCommand = message.ability;
        // Determine which ability is to be used by index or name
        let ability = null;
        if (typeof abilityCommand === 'number') {
          const type = this.character.abilityTypes[abilityCommand];
          if (type) {
            ability = this.character.abilities[type.name];
          }
        }
        else {
          ability = this.character.abilities[abilityCommand];
        }
        if (!ability) {
          this.sendMessage(errorMessage(`Invalid ability: ${abilityCommand}`));
          return false;
        }

        if (!ability.canUse()) {
          this.sendMessage(errorMessage('Cant use that ability yet'));
          return false;
        }

        this.character.interrupt();
        const completed = ability.use(this.game.map);
        if (!completed) {
          this.character.usingAbility = ability;
        }
        return true;
      }
      case 'init.chooseName': {
        if (!message.name) {
          this.sendMessage(errorMessage('Invalid name'));
          return false;
        }

        this.name = message.name.slice(0, MAX_NAME_LENGTH);
        this.game.playerUpdated(this);
        return true;
      }
      case 'init.chooseRole': {
        const requestedRole = message.role;
        const roleClass = Entities.PLAYER_ROLES[requestedRole];
        if (!roleClass) {
          this.sendMessage(errorMessage(`Invalid role: ${requestedRole}`));
          return false;
        }
        this.role = requestedRole;
        this.game.playerUpdated(this);
        return true;
      }
      case 'init.ready': {
        if (!this.role || !this.name) {
          this.sendMessage(errorMessage(
            "You're not ready until you choose your name and role",
          ));
          return false;
        }
        this.ready = true;
        this.game.playerUpdated(this);
        return true;
      }
      default: {
        this.sendMessage(errorMessage('Unrecognized message event'));
        return false;
      }
    }
  },
  logic: function(map, loopTime, elapsed) {
    for (const command of this.commands.drain()) {
      this.handleMessage(command);
    }

    if (this.character) {
      if (this.movement.power) {
        this.character.interrupt();
        this.character.applyVelocity(
          map,
          this.movement.angle,
          this.movement.power * this.character.speed * elapsed,
        );
        map.stateUpdates.add(Events.entityMove(this.character));
      }
      if (this.newOrientation) {
        this.character.setOrientation(map, this.newOrientation);
        this.newOrientation = null;
      }
    }
  },
}

module.exports = Player;
