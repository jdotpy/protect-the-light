const Entities = require('./entities');
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
    // This method handles all websocket messages from the user
    console.log('player received message', message);
    switch (message.event) {
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

  player.logic = function() {
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
