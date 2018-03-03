console.log('main js loaded');

function toSet(array) {
  return array.reduce(
    (acc, value) => {
      acc[value] = true;
      return acc;
    },
    {}
  );
}

function values(obj) {
  const items = [];
  for (const key of Object.keys(obj)) {
    items.push(obj[key]);
  }
  return items;
}

function keyBy(key, array) {
  return array.reduce(
    (acc, value) => {
      acc[value[key]] = value;
      return acc;
    },
    {}
  );
}

function websocketUrl(path) {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${loc.host}${path}`
}

function GameClient(path) {
  const client = {};
  const state = {};
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
      state.status = message.status;
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
    state.connected = true;
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

  client.updateUI = function() {
    console.log('updating state with:', document.uiState.game);
    // Setting this attribute will trigger a new UI render
    document.uiState.game = {
      connected: state.connected,
      status: state.status,
      players: values(state.players || {}),
      playerID: state.playerID,
    };
  }

  // Logic
  client.initializePlayer = function(name, role) {
    client.sendMessage({ event: 'init.chooseName', name });
    client.sendMessage({ event: 'init.chooseRole', role });
  }
  
  client.markPlayerReady = function() {
    client.sendMessage({ event: 'init.ready' });
  }

  client.handleEvent = function(action) {
    if (uiUpdateEvents[action.event]) {
      client.uiStale = true; 
    }
    console.log(`handling event [${action.event}]`, action);
    switch (action.event) {
      case 'init.you': {
        state.playerID = action.player.id;
        if (!state.players) {
          state.players = {};
        }
        state.players[action.player.id] = action.player;
        break;
      }
      case 'init.gameState': {
        state.players = keyBy('id', action.players);
        console.log('got state players:', values(state.players));
        state.status = action.status;
        break;
      }
      case 'player.add':
      case 'player.update': {
        const player = action.player;
        state.players[player.id] = player;
        break;
      }
      case 'player.remove': {
        const player = action.player;
        delete state.players[player.id];
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
