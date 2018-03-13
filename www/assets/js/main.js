function GameClient(path) {
  const client = {};
  client.state = {
    players: {},
    entities: {},
  };
  document.gameState = client.state; // for debugging purposes, add to document

  const uiUpdateEvents = toSet([
    'init.you',
    'init.gameState',
    'player.update',
    'player.remove',
    'player.add',
  ]);

  client.onServerMessage = function(e) {
    const message = JSON.parse(e.data);
    if (message.event === 'state') {
      for (const action of message.updates) {
        client.handleEvent(action);
      }
    }
    else {
      client.handleEvent(message);
    }
    if (client.uiStale) {
      client.updateUI();
      client.uiStale = false;
    }
  }

  client.onServerConnect = function() {
    client.state.connected = true;
    console.log('Got connected!')
    document.uiState.game.connected = true;
  }

  client.onServerError = function(error) {
    console.log('got an error:', error);
  }

  client.sendMessage = function(message) {
    console.log('sending message:', message);
    client.socket.send(JSON.stringify(message));
  }

  client.getCurrentPlayer = function() {
    return client.state.players[client.state.playerID];
  }

  client.getCurrentPlayerEntity = function() {
    const entityID = client.getCurrentPlayer().entityID;
    return client.state.entities[entityID];
  }

  client.updateUI = function() {
    // Setting this attribute will trigger a new UI render
    document.uiState.game = {
      connected: client.state.connected,
      status: client.state.status,
      players: values(client.state.players || {}).map((v) => Object.assign({}, v)),
      playerID: client.state.playerID,
    };
  }

  // Logic
  client.initializePlayer = function(name, role) {
    client.sendMessage({ event: 'init.chooseName', name });
    client.sendMessage({ event: 'init.chooseRole', role });
  }

  client.controlEvent = function(event) {
    return () => client.sendMessage(event);
  }

  client.bindControls = function() {
    // compass movement
    Mousetrap.bind('w', client.controlEvent({ event: 'player.move', power: 1, direction: 'up' }), 'keydown');
    Mousetrap.bind('w', client.controlEvent({ event: 'player.move', power: 0 }), 'keyup');  
    Mousetrap.bind('s', client.controlEvent({ event: 'player.move', power: 1, direction: 'down' }), 'keydown');
    Mousetrap.bind('s', client.controlEvent({ event: 'player.move', power: 0 }), 'keyup');  
    Mousetrap.bind('a', client.controlEvent({ event: 'player.move', power: 1, direction: 'left' }), 'keydown');
    Mousetrap.bind('a', client.controlEvent({ event: 'player.move', power: 0 }), 'keyup');  
    Mousetrap.bind('d', client.controlEvent({ event: 'player.move', power: 1, direction: 'right' }), 'keydown');
    Mousetrap.bind('d', client.controlEvent({ event: 'player.move', power: 0 }), 'keyup');  

    // Rotation
    Mousetrap.bind('left', client.controlEvent({ event: 'player.rotate', direction: 'left', power: 1 }), 'keydown');
    Mousetrap.bind('left', client.controlEvent({ event: 'player.rotate', power: 0 }), 'keyup');
    Mousetrap.bind('right', client.controlEvent({ event: 'player.rotate', direction: 'right', power: 1 }), 'keydown');
    Mousetrap.bind('right', client.controlEvent({ event: 'player.rotate', power: 0 }), 'keyup');

    //// Abilities
    //Mousetrap.bind('.', client.controlEvent({ event: 'player.move', direction: '' });
    //Mousetrap.bind('.', client.controlEvent({ event: 'player.move', direction: '' });
    //Mousetrap.bind(',', client.controlEvent({ event: 'player.move', direction: '' });
    //Mousetrap.bind(',', client.controlEvent({ event: 'player.move', direction: '' });
    //Mousetrap.bind('m', client.controlEvent({ event: 'player.move', direction: '' });
    //Mousetrap.bind('m', client.controlEvent({ event: 'player.move', direction: '' });
  }
  
  client.markPlayerReady = function() {
    client.sendMessage({ event: 'init.ready' });
  }

  client.startPlaying = function(e) {
    client.renderer = Renderer("viewport", client);
    client.renderer.start();
    client.bindControls();
  }

  client.handleEvent = function(action) {
    if (uiUpdateEvents[action.event]) {
      console.log('marking UI as stale');
      client.uiStale = true; 
    }
    console.log(`handling event [${action.event}]`, action);
    switch (action.event) {
      case 'entity.move': {
        const entity = client.state.entities[action.id];
        entity.x = action.location.x;
        entity.y = action.location.y;
        break;
      }
      case 'entity.rotate': {
        const entity = client.state.entities[action.id];
        entity.orientation = action.orientation;
        break;
      }
      case 'entity.spawn': {
        client.state.entities[action.entity.id] = action.entity;
        if  (action.entity.playerID) {
          client.state.players[action.entity.playerID].entityID = action.entity.id;
        }
        break;
      }
      case 'game.start': {
        client.state.map = action.map;
        client.state.status = action.status;
        client.startPlaying(action);
        break;
      }
      case 'init.you': {
        client.state.playerID = action.player.id;
        if (!client.state.players) {
          client.state.players = {};
        }
        client.state.players[action.player.id] = action.player;
        break;
      }
      case 'init.gameState': {
        client.state.players = keyBy('id', action.players);
        client.state.status = action.status;
        break;
      }
      case 'player.add':
      case 'player.update': {
        const player = action.player;
        client.state.players[player.id] = player;
        break;
      }
      case 'player.remove': {
        const player = action.player;
        delete client.state.players[player.id];
        break;
      }
    }
  }


  // Init
  client.socket = new WebSocket(websocketUrl(path));
  client.socket.onmessage = client.onServerMessage;
  client.socket.onopen = client.onServerConnect;
  client.socket.onerror = client.onServerError;

  return client;
}

document.client = GameClient('/ws-connect');
