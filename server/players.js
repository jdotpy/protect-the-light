function Player(socket, game) {
  const player = {
    game: game,
    character: null,
    name: null,
    ready: false,
  };

  player.sendMessage = function(message) {
    try {
      socket.send(message);
    }
    catch (error) {
      console.log(`[${player.name}] Player disconnected!`);
      player.game.removePlayer(player);
    }
  }

  player.stateDetails = function() {
    return {
      name: player.name,
    }
  }

  player.handleMessage = function(message) {
    // This method handles all websocket messages from the user
    console.log('player received message', message, );
    switch (message.type) {
      case 'init.chooseName': {
        player.name = message.name.slice(0, MAX_NAME_LENGTH);
        return true;
      }
      case 'init.chooseRole': {
        const requestedRole = message.role;
        const role = Entities.PLAYER_ROLES[role]
        if (!role) {
          player.sendMessage(errorMessage(`Invalid role: ${role}`));
          return false;
        }
        player.role = role;
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
        return true;
      }
    }
  }

  player.logic = function() {
    return [];
  }

  return player;
}

module.exports = Player;
