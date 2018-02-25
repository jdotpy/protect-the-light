const uuid = require('uuid/v4');
const utils = require('./utils');
const Events = require('./events');
const Entities = require('./entities');
const Player = require('./players');
const Maps = require('./maps');

MAX_NAME_LENGTH = 50;

function errorMessage(message) {
  return {
    type: 'error',
    message,
  };
}

function Game() {
  const game = {
    id: uuid(),
    startTime: new Date(),
    players: [],
    npcs: [],
    objects: [],
    stateUpdates: [],
    loopCount: 0,
    status: null,
  };

  game.addPlayer = function(player) {
    game.players.push(player);
    game.registerEvent(Events.newPlayer(player));
  }

  game.removePlayer = function(player) {
    game.players.remove(player);
    game.registerEvent(Events.removePlayer(player));
  }

  game.registerEvent = function(event) {
    game.stateUpdates.push(event);
  }

  game.launch = function() {
    // This starts the gameloop but doesn't necessary start the game itself
    game.status = 'init';
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

  game.startPlaying = function() {
    game.status = 'playing';
    //: initialize map
    game.map = Maps.Basic(game);
    //: spawn players
    for (const player of game.players) {
      const character = player.role();
      player.character = character;
      game.registerEvent(Events.playerAssignCharacter(player, character));
      game.spawn(character);
    }

    //: start mob spawning?
  }

  game.logic = function() {
    /* Before the game starts during name and role-picking */
    if (game.status === 'init') {
      const unreadyPlayers = game.players.some((player) => !player.ready);
      if (unreadyPlayers.length > 0) {
        return false;
      }
      game.startPlaying();
    }
    
    /* During the actual action */
    else if (game.status === 'playing') {
      for (const entity of game.getEntities()) {
        const entityUpdates = entity.logic();
        game.stateUpdates = game.stateUpdates.concat(entityUpdates);
      }
      const mapUpdates = game.map.logic();
      game.stateUpdates = game.stateUpdates.concat(mapUpdates);
      if (game.map.isDone()) {
        game.status = 'done';
        game.registerEvent(Events.gameComplete(game.map.results()));
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
    game.lastLoopTime = loopTime;
    if (Math.round(loopTime) > Math.round(game.lastLoopTime)) {
      console.log(`Loop rate: ${game.loopCount}loops/second`);
      game.loopCount = 0;
    }
    console.log('game loop', loopTime, 'elapsed:', elapsed);

    // Do status-specific logic
    game.logic();

    /*
     * Update all players with changes that have happened
     * then reset the action queue so that actions accrue
     * for each loop.
     */
    const updatesToSend = game.stateUpdates;
    game.stateUpdates = [];
    game.sendStateUpdate(updatesToSend);

    // Schedule next loop
    //setImmediate(game.loop);
    setTimeout(game.loop, 1000);
  }

  game.sendStateUpdate = function(updates) {
    const message = {
      type: 'state',
      status: game.status,
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

function NPC(game) {

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
    const player = Player(ctx.websocket, game);
    game.addPlayer(player);
    
    // Make it easy to access the player on future messages
    ctx.player = player;
  }

  engine.onMessage = function(ctx, message) {
    ctx.player.handleMessage(message);
  }
  
  return engine;
}

module.exports = GameEngine();
