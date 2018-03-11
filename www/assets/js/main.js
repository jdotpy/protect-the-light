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

function Layer(index, options) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const layer = {
    index,
    canvas,
    ctx: canvas.getContext('2d'),
    height: options.height,
    width: options.width,
    draw: options.draw,
  };
  // Manage styles & visibility
  if (!options.hidden) {
    document.body.appendChild(canvas);
    canvas.style['z-index'] = index;
    canvas.style['position'] = 'absolute';
  }
  return layer;
}

const ENTITY_RENDERERS = {
  'archer': (renderer, ctx, entity) => {
    // We'll eventually want orientation:
    //  ctx.rotate(45 * Math.PI / 180);
    //  ctx.setTransform(1, 0, 0, 1, 0, 0);
    const location = renderer.translateCoords(entity.x, entity.y);
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = Math.floor(size / 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(location.x - radius, location.y - radius, size, size);
  },
  'fire-tower': (renderer, ctx, entity) => {
    const location = renderer.translateCoords(entity.x, entity.y);
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = Math.floor(size / 2);
    ctx.fillStyle = '#a37954';
    ctx.fillRect(location.x - radius, location.y - radius, size, size);
  },
}

function Renderer(viewport, client) {
  const SCALE_FACTOR =  50;
  const renderer = {
    SCALE_FACTOR,
    frame: 0,
    mapRadius: client.state.map.radius * SCALE_FACTOR,
    mapDiameter: (client.state.map.radius * 2) * SCALE_FACTOR,
  };

  renderer.layers = {
    background: Layer(1, {
      width: renderer.mapDiameter,
      height: renderer.mapDiameter,
      draw: function(state) {
        const mapCenter = renderer.translateCoords(0, 0);
        this.ctx.arc(
          mapCenter.x,
          mapCenter.y,
          renderer.SCALE_FACTOR * state.map.radius,
          0,
          Math.PI * 2
        );
        this.ctx.fillStyle = '#00dd00';
        this.ctx.fill();
      },
    }),
    entities: Layer(2, {
      width: renderer.mapDiameter,
      height: renderer.mapDiameter,
      draw: function(state) {
        for (const entity of values(state.entities)) {
          const er = ENTITY_RENDERERS[entity.type];
          er(renderer, this.ctx, entity);
        }
      },
    }),
  }
  
  renderer.start = function() {
    renderer.autoSize();

    renderer.lastFrameStart = new Date();
    renderer.layers.background.draw(client.state);
    renderer.draw();
    document.renderer = renderer;
  }

  renderer.autoSize = function() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    renderer.viewportWidth = windowWidth;
    renderer.viewportHeight = windowHeight;
    renderer.center = {x: windowWidth / 2, y: windowHeight / 2};
  }

  renderer.setCameraLocation = function() {
    const playerEntity = client.getCurrentPlayerEntity();
    let location;
    if (playerEntity) {
      location = { x: playerEntity.x, y: playerEntity.y };
    }
    else {
      location = { x: 0, y: 0 };
    }

    // Keep track of where on the map we are located over
    renderer.cameraLocation = renderer.translateCoords(location.x, location.y);

    // Now update the canvas locations to show the correct area
    const leftOffset = -1 * (renderer.cameraLocation.x - (renderer.viewportWidth / 2));
    const topOffset = -1 * (renderer.cameraLocation.y - (renderer.viewportHeight / 2));
    const cssTop = `${topOffset}px`;
    const cssLeft = `${leftOffset}px`;
    for (const layer of values(renderer.layers)) {
      layer.canvas.style.top = cssTop;
      layer.canvas.style.left = cssLeft;
    }
  }

  renderer.translateCoords = function(x, y) {
    let mapX = x * renderer.SCALE_FACTOR;
    let mapY = y * renderer.SCALE_FACTOR * -1; // Y axis is flipped in canvas

    mapX = mapX + renderer.mapRadius;
    mapY = mapY + renderer.mapRadius;
    return { x: Math.floor(mapX), y: Math.floor(mapY) };
  }

  renderer.draw = function() {
    const frameStart = new Date();
    if (renderer.lastFrameStart.getSeconds() !== frameStart.getSeconds()) {
      console.log(`${renderer.frame} FPS (last frame time: ${renderer.lastFrameTime} ms)`)
      renderer.frame = 0;
    }
    renderer.frame += 1;
    renderer.lastFrameStart = frameStart;
    
    // Update camera location in case we're centered on an entity that has moved
    renderer.autoSize();
    renderer.setCameraLocation();

    // Re-Draw entities every frame
    renderer.layers.entities.draw(client.state);
    
    // Now do this about 60fps
    renderer.lastFrameTime = new Date().valueOf() - frameStart.valueOf();
    window.requestAnimationFrame(renderer.draw);
  }
  return renderer;
}

document.client = GameClient('/ws-connect');
