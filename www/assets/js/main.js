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
      client.state.status = message.status;
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

  client.updateUI = function() {
    // Setting this attribute will trigger a new UI render
    document.uiState.game = {
      connected: client.state.connected,
      status: client.state.status,
      players: values(client.state.players || {}),
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
        break;
      }
      case 'game.start': {
        client.state.map = action.map;
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

const ENTITY_RENDERERS = {
  'archer': (renderer, ctx, entity) => {
    // We'll eventually want orientation:
    //  ctx.rotate(45 * Math.PI / 180);
    //  ctx.setTransform(1, 0, 0, 1, 0, 0);
    const location = renderer.translateCoords(entity.x, entity.y);
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = size / 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(location.x - radius, location.y - radius, size, size);
  },
  'fire-tower': (renderer, ctx, entity) => {
    const location = renderer.translateCoords(entity.x, entity.y);
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = size / 2;
    ctx.fillStyle = '#a37954';
    ctx.fillRect(location.x - radius, location.y - radius, size, size);
  },
}

function Renderer(viewport, client) {
  const renderer = {
    SCALE_FACTOR: 50,
    canvas: document.getElementById(viewport),
  };
  
  renderer.start = function() {
    renderer.autoSize();
    renderer.ctx = this.canvas.getContext('2d');
    renderer.draw();
    document.renderer = renderer;
  }

  renderer.autoSize = function() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.canvas.width = width;
    renderer.canvas.height = height;
    renderer.width = width;
    renderer.height = height;
    renderer.center = {x: width / 2, y: height / 2};
  }

  renderer.setCameraLocation = function() {
    // This might track the player's coords
    const location = { x: 0, y: 0 };
    renderer.cameraLocation = {
      x: location.x * renderer.SCALE_FACTOR,
      y: location.y * renderer.SCALE_FACTOR * -1, // Y axis is flipped in canvas
    };
  }

  renderer.translateCoords = function(x, y) {
    let mapX = x * renderer.SCALE_FACTOR;
    let mapY = y * renderer.SCALE_FACTOR * -1; // Y axis is flipped in canvas

    mapX = mapX + renderer.center.x - renderer.cameraLocation.x;
    mapY = mapY + renderer.center.y - renderer.cameraLocation.y;
    return { x: mapX, y: mapY };
  }

  renderer.draw = function() {
    const drawStart = new Date();
    
    const ctx = renderer.ctx;
    // Update camera location
    renderer.setCameraLocation();

    // Draw helpful background of black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    // Draw map 
    const mapCenter = renderer.translateCoords(0, 0);
    ctx.arc(
      mapCenter.x,
      mapCenter.y,
      renderer.SCALE_FACTOR * client.state.map.radius,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = '#00dd00';
    ctx.fill();

    // Draw entities
    for (const entity of values(client.state.entities)) {
      const er = ENTITY_RENDERERS[entity.type];
      er(renderer, ctx, entity);
    }

    // TODO: Draw animations
    
    // Now do this about 60fps
    window.requestAnimationFrame(renderer.draw);
  }
  return renderer;
}

document.client = GameClient('/ws-connect');
