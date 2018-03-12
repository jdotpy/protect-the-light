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

function toRGBA(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function drawRadialGradient(ctx, x, y, radius, options) {
  const colors = options.colors || [
    [255, 255, 255],
    [255, 255, 255],
  ];
  const intensity = options.intensity || [1, 0];
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, toRGBA(colors[0], intensity[0]));
  gradient.addColorStop(1, toRGBA(colors[1], intensity[1]));

  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, (x + radius), (y + radius));
}

function cacher(f) {
  const cache = {};
  return function() {
    const cacheKey = JSON.stringify(arguments);
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }
    const value = f.apply(null, arguments);
    cache[cacheKey] = value;
    return value;
  }
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
    clear: function() {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  // Manage styles & visibility
  if (options.hidden) {
    canvas.style.display = 'none';
  }
  canvas.style['z-index'] = index;
  canvas.style['position'] = 'absolute';
  document.body.appendChild(canvas);
  return layer;
}

const getCachedRadialImage = cacher(function(radius, options) {
  const layer = Layer(101, {
    width: radius * 2,
    height: radius * 2,
    hidden: true,
  });
  drawRadialGradient(layer.ctx, radius, radius, radius, options || {});
  return layer.canvas;
})

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

  renderer.getImageAsset = function(id) {
    const ele = document.getElementById(id);
    return ele;
  }

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
        const pattern = this.ctx.createPattern(
          renderer.getImageAsset('img_texture_grass'),
          'repeat'
        );
        this.ctx.fillStyle = pattern;
        //this.ctx.fillStyle = '#00dd00';
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
    lighting: Layer(3, {
      width: renderer.mapDiameter,
      height: renderer.mapDiameter,
      badDraw: function(state) {
        /*
         * This draw is a bad idea as it effectively skirts the illuminated library's
         * caching. This causes extreme memory leaks and will crash the browser within
         * 30 seconds.
         *
         * I want to refactor this to pull out just the parts I need as I don't actually
         * need 90% of the lirbary. Leaving it here as a reference as I re-implement.
         */
        this.clear();

        const lamps = values(state.entities).map((e) => {
          const pos = renderer.translateCoords(e.x, e.y);
          return new illuminated.Lamp({
            position: new illuminated.Vec2(pos.x, pos.y),
            distance: 200,
          });
        })
        this.ctx.globalCompositeOperation = "lighter";
        for (const lamp of lamps) {
          const lighting = new illuminated.Lighting({ light: lamp, objects: [] });
          lighting.compute(this.canvas.width, this.canvas.height);
          lighting.render(this.ctx);
        }
        this.ctx.globalCompositeOperation = "source-over";
        const darkmask = new illuminated.DarkMask({ lights: lamps });
        darkmask.compute(this.canvas.width, this.canvas.height);
        darkmask.render(this.ctx);
      },
      draw: function(state) {
        this.clear();
        
        this.ctx.save()
        const lamps = values(state.entities);
        for (const lamp of lamps) {
          const pos = renderer.translateCoords(lamp.x, lamp.y);
          drawRadialGradient(this.ctx, pos.x, pos.y, 200, {
            colors: [[255, 238, 114], [0, 0, 0]],
            intensity: [.2, 0],
          });
        }
        this.ctx.restore()
        // Manage a cached sub-layer for masking
        if (!this.maskLayer) {
          this.maskLayer = Layer(0, { width: this.width, height: this.height, hidden: true });
        }
        this.maskLayer.clear();
        this.maskLayer.ctx.globalCompositeOperation = "source-over";
        this.maskLayer.ctx.beginPath();
        this.maskLayer.ctx.fillStyle = '#000';
        this.maskLayer.ctx.fillRect(0, 0, this.width, this.height);
        this.maskLayer.ctx.beginPath();

        this.maskLayer.ctx.globalCompositeOperation = "destination-out";
        const lampMask = getCachedRadialImage(200, {});
        for (const lamp of lamps) {
          const pos = renderer.translateCoords(lamp.x, lamp.y);
          this.maskLayer.ctx.drawImage(lampMask, pos.x - 200, pos.y - 200);
        }
        this.ctx.drawImage(this.maskLayer.canvas, 0, 0)
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
    renderer.layers.entities.clear();
    renderer.layers.entities.draw(client.state);

    // Re-Draw lighting
    renderer.layers.lighting.draw(client.state);
    
    // Now do this about 60fps
    renderer.lastFrameTime = new Date().valueOf() - frameStart.valueOf();
    window.requestAnimationFrame(renderer.draw);
  }
  return renderer;
}

document.client = GameClient('/ws-connect');
