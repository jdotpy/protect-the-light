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
  const state = {
    players: {},
    entities: {},
  };
  document.gameState = state; // for debugging purposes, add to document

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

  client.startPlaying = function(e) {
    client.map = e.map;
    client.renderer = Renderer("viewport", client);
    client.renderer.start();
  }

  client.handleEvent = function(action) {
    if (uiUpdateEvents[action.event]) {
      client.uiStale = true; 
    }
    console.log(`handling event [${action.event}]`, action);
    switch (action.event) {
      case 'entity.spawn': {
        state.entities[action.entity.id] = action.entity;
      }
      case 'game.start': {
        client.startPlaying(action);
        break;
      }
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

const ENTITY_RENDERERS = {
  'archer': (renderer, ctx, entity) => {
    ctx.
  },
  'fire-tower': (renderer, ctx, entity) => {
    ctx.fillStyle = '#a37954';
    ctx.fillRect(entity.x, entity.y, renderer.width, renderer.height);
  },


}

function Renderer(viewport, client) {
  const renderer = {
    canvas: document.getElementById(viewport),
  };
  
  renderer.start = function() {
    renderer.autoSize();
    renderer.ctx = this.canvas.getContext('2d');
    renderer.draw();
  }

  renderer.autoSize = function() {
    renderer.canvas.width = 1000;
    renderer.canvas.height = 1000;
    renderer.width = 1000;
    renderer.height = 1000;
  }

  renderer.translateCoords(x, y) {

    return { x, y };
  }

  renderer.draw = function() {
    const ctx = renderer.ctx;

    // Draw helpful background of black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    // Draw map 
    ctx.arc(500, 500, 500, 0, Math.PI * 2);
    ctx.fillStyle = '#00dd00';
    ctx.fill();

    // Draw entities
    for (const entity of renderer.client.state.entities) {
      const er = ENTITIY_RENDERERS[entity.type];
      er(renderer, ctx, entity);
    }

    // TODO: Draw animations
    
    // Now do this about 60fps
    window.requestAnimationFrame(renderer.draw);
  }
  return renderer;
}

document.client = GameClient('/ws-connect');
