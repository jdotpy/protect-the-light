const uuid = require('uuid/v4');
const utils = require('./utils');
const Events = require('./events');


function Game() {
  const game = {
    id: uuid(),
    startTime: new Date(),
    players: [],
    npcs: [],
    objects: [],
    stateUpdates: [],
  };

  game.addPlayer = function(player) {
    game.players.push(player);
    game.stateUpdates.push(Events.newPlayer(player));
  }

  game.start = function() {
    game.loop();
  }

  game.getEntities = function*() {
    for (const player of game.players) {
      yield player;
    }
    for (const npc of game.npcs) {
      yield npc;
    }
    for (const obj of game.objects) {
      yield obj;
    }
  }

  game.loop = function() {
    const timestamp = new Date().valueOf();
    const elapsed = 
    const elapsed = 
    console.log('game loop', timestamp);

    /*
     * Do game-level logic 
     * then reset the action queue so that actions accrue
     * for each loop
     */

    // Do game loop logic for existing entities (players, npcs, projectiles, etc)
    for (const entity of game.getEntities()) {
      entityUpdates = entity.logic();
      game.stateUpdates = game.stateUpdates.concat(entityUpdates);
    }

    /*
     * Update all players with changes that have happened
     * then reset the action queue so that actions accrue
     * for each loop
     */
    game.sendStateUpdate(game.stateUpdates);
    game.stateUpdates = [];

    // Schedule next loop
    //setImmediate(game.loop);
    setTimeout(game.loop, 1000);
  }

  game.sendStateUpdate = function(updates) {
    const message = {
      playing: true,
      updates,
    };
    console.log(message);
    const messageStr = JSON.stringify(message);
    for (const player of game.players) {
      player.sendMessage(messageStr);
    }
    
  }
  return game;
}

function Player(socket, game) {
  const player = {
    id: uuid(),
    game: game,
  };

  player.sendMessage = function(message) {
    socket.send(message);
  }

  player.stateDetails = function() {
    return {
      id: player.id,
    }
  }

  return player;
}


function GameEngine() {
  engine = {};
  engine.games = {};
  engine.players = {};

  engine.createGame = function() {
    const newGame = Game();
    engine.games[newGame.id] = newGame;
    engine.gameID = newGame.id;
    newGame.start();
  }
  
  engine.onConnection = function(ctx) {
    const game = engine.games[engine.gameID];
    const player = Player(ctx.websocket, game);
    
    // Insert them into the game
    game.addPlayer(player);

    // Make it easy to access the player on future messages
    ctx.player = player;
  }

  engine.onMessage = function(ctx, message) {
    ctx.player.game.command(player, message);
  }
  
  return engine;
}

module.exports = GameEngine();
