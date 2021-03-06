const uuid = require('uuid/v4');
const config = require('./config');
const utils = require('./utils');
const Events = require('./events');
const Player = require('./players');
const Maps = require('./maps');

MAX_NAME_LENGTH = 50;

function Game() {
  const game = {
    id: uuid(),
    startTime: utils.preciseTime(),
    players: [],
    stateUpdates: utils.Queue(),
    loopCount: 0,
    loopTime: 0,
    status: null,
  };

  game.addPlayer = function(player) {
    game.players.push(player);
    game.stateUpdates.add(Events.newPlayer(player));
    if (game.map) {
      game.map.addPlayer(player);
    }
    player.sendMessage(Events.playerConnectState(game));
  }

  game.removePlayer = function(player) {
    game.players.remove(player);
    game.stateUpdates.add(Events.removePlayer(player));
    if (game.map) {
      game.map.removePlayer(player);
    }
  }

  game.playerUpdated = function(player) {
    game.stateUpdates.add(Events.playerUpdated(player));
  }

  game.getPlayerState = function() {
    return game.players.map(p => p.stateDetails());
  }

  game.launch = function() {
    // This starts the gameloop but doesn't necessary start the game itself
    game.status = 'init';
    game.map = Maps.Basic(game.players);
    game.loop();
  }

  game.startPlaying = function() {
    game.status = 'playing';
    game.stateUpdates.add(Events.startPlaying(game));
    game.map.start()
  }

  game.hasBegun = function() {
    return game.status !== 'init';
  }

  game.logic = function(loopTime, elapsed) {
    /* Before the game starts during name and role-picking */
    if (game.status === 'init') {
      for (const player of game.players) {
        player.logic(null, loopTime, elapsed);
      }
      const hasUnreadyPlayers = game.players.some((player) => !player.ready);
      if (hasUnreadyPlayers || game.players.length < 1) {
        return false;
      }
      game.startPlaying();
    }

    /* During the actual action */
    else if (game.status === 'playing') {
      const mapUpdates = game.map.logic(loopTime, elapsed);
      game.stateUpdates.addAll(mapUpdates);
      if (game.map.isDone()) {
        game.status = 'done';
        game.stateUpdates.add(Events.gameComplete(game.map.results()));
      }
    }

    /* After losing */
    else if (game.status === 'done') {
      // TODO: Do I send a last stats message?
    }
  }

  game.loop = function() {
    // Manage game and loop timer
    game.loopCount = game.loopCount + 1;
    const loopTime = utils.preciseTime();
    const elapsed = loopTime - game.lastLoopTime;
    if (Math.round(loopTime) > Math.round(game.lastLoopTime)) {
      const avgTime = game.loopTime / game.loopCount;
      console.log(`Loop rate: ${game.loopCount} loops/second. Loop time: ${avgTime}`);
      game.loopTime = 0;
      game.loopCount = 0;
    }
    game.lastLoopTime = loopTime;

    // Do status-specific logic
    game.logic(loopTime, elapsed);
    game.sendStateUpdate();

    const loopDuration = utils.preciseTime() - loopTime;
    game.loopTime += loopDuration;
    // Schedule next loop
    setTimeout(game.loop, config.engine.loopInterval);
  }

  game.sendStateUpdate = function(updates) {
    /*
     * Update all players with changes that have happened
     * then reset the action queue so that actions accrue
     * for each loop.
     */
    const message = {
      event: 'state',
      status: game.status,
      updates: game.stateUpdates.drain(),
    };
    const messageStr = JSON.stringify(message);
    for (const player of game.players) {
      player.sendMessage(messageStr);
    }
    
  }
  return game;
}

function GameEngine() {
  engine = {};
  engine.games = {};
  engine.players = {};

  engine.createGame = function() {
    const newGame = Game();
    engine.games[newGame.id] = newGame;
    engine.gameID = newGame.id;
    newGame.launch();
  }
  
  engine.onConnection = function(ctx) {
    const game = engine.games[engine.gameID];
    if (game.hasBegun()) {
      ctx.websocket.close();
      return false;
    }

    const player = Player.new({ socket: ctx.websocket, game });
    game.addPlayer(player);
    
    // Make it easy to access the player on future messages
    ctx.player = player;
  }

  engine.onMessage = function(ctx, message) {
    ctx.player.commands.add(message);
  }
  
  return engine;
}

module.exports = GameEngine();
