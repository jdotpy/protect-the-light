const Entities = require('./entities');
const Events = require('./events');
const uuid = require('uuid/v4');

function errorMessage(message) {
  return {
    event: 'error',
    message,
  };  
}

function Player(socket, game) {
  const player = {
    id: uuid(),
    game: game,
    character: null,
    role: null,
    name: null,
    ready: false,
    rotation: {},
    movement: {},
  };

  player.sendMessage = function(message) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    try {
      socket.send(message);
    }
    catch (error) {
      console.error('Errored while trying to send message to client');
      console.log(error);
      console.log(`[${player.name}] Player disconnected!`);
      player.game.removePlayer(player);
    }
  }

  player.stateDetails = function() {
    return {
      id: player.id,
      name: player.name,
      role: player.role,
      ready: player.ready,
    }
  }

  player.handleMessage = function(message) {
    switch (message.event) {
      case 'ping': {
        player.sendMessage({ event: 'pong' });
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
        player.movement = { angle, power: message.power || 0 };
        return true;
      }
      case 'player.orientation': {
        let angle = message.direction;
        if (typeof angle !== 'number') {
          player.sendMessage(errorMessage(`Invalid orientation.direction: ${message.direction}`));
          return false;
        }
        player.rotate = angle;
        player.character.orientation = angle;
        return true;
      }
      case 'init.chooseName': {
        player.name = message.name.slice(0, MAX_NAME_LENGTH);
        game.playerUpdated(player);
        return true;
      }
      case 'init.chooseRole': {
        const requestedRole = message.role;
        const roleClass = Entities.PLAYER_ROLES[requestedRole];
        if (!roleClass) {
          player.sendMessage(errorMessage(`Invalid role: ${requestedRole}`));
          return false;
        }
        player.role = requestedRole;
        game.playerUpdated(player);
        return true;
      }
      case 'init.ready': {
        if (!player.role || !player.name) {
          player.sendMessage(errorMessage(
            "You're not ready until you choose your name and role",
          ));
          return false;
        }
        player.ready = true;
        game.playerUpdated(player);
        return true;
      }
      default: {
        player.sendMessage(errorMessage('Unrecognized message event'));
        return false;
      }
    }
  }

  player.logic = function(map, loopTime, elapsed) {
    if (player.movement.power) {
      player.character.applyVelocity(
        map,
        player.movement.angle,
        player.movement.power * player.character.speed * elapsed,
      );
      map.stateUpdates.add(Events.entityMove(player.character));
    }
    if (player.rotate) {
      map.stateUpdates.add(Events.entityRotate(player.character));
      player.rotate = null;
    }

    return [];
  }

  player.init = function() {
    player.sendMessage({
      event: 'init.you',
      player: player.stateDetails(),
    });
  }

  player.init();
  return player;
}

module.exports = Player;
