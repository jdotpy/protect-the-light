
function toRGBA(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function setBounds(value, min, max) {
  value = Math.min(value, max);
  value = Math.max(value, min);
  return value;
}

function drawRadialGradient(ctx, x, y, radius, options) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  if (options.stops) {
    for (const stop of options.stops) {
      gradient.addColorStop(
        stop.offset,
        toRGBA(stop.color, stop.alpha),
      );
    }
  }
  else {
    const colors = options.colors || [
      [255, 255, 255],
      [255, 255, 255],
    ];
    const intensity = options.intensity || [1, 0];
    gradient.addColorStop(0, toRGBA(colors[0], intensity[0]));
    gradient.addColorStop(1, toRGBA(colors[1], intensity[1]));
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
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

const RENDERERS = {
  'archer': (renderer, ctx, entity, location) => {
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = Math.floor(size / 2);
    const image = renderer.getImageAsset('img_entity_archer');
    ctx.drawImage(image, -75, -100, 200, 200);
  },
  'knight': (renderer, ctx, entity, location) => {
    // We'll eventually want orientation:
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = Math.floor(size / 2);
    const image = renderer.getImageAsset('img_entity_knight');
    ctx.drawImage(image, -75, -100, 200, 200);
  },
  'fire-tower': (renderer, ctx, entity, location) => {
    const size = entity.size * renderer.SCALE_FACTOR;
    let radius = Math.floor(size / 2);
    const flameRadius = Math.floor(radius * 0.75);
    const image = renderer.getImageAsset('img_object_stone_circle');
    ctx.drawImage(image, -1 * radius, -1 * radius, size, size);
    const flame = getCachedRadialImage(flameRadius, {
      stops: [
        { offset: 0, color: [244, 206, 6], alpha: 1},
        { offset: .4, color: [169, 87, 0], alpha: 1},
        { offset: 1, color: [169, 87, 0], alpha: 0},
      ],
    });
    ctx.drawImage(flame, -1 * flameRadius, -1 * flameRadius);
  },
  'arrow': (renderer, ctx, entity, location) => {
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = Math.floor(size / 2);
    const image = renderer.getImageAsset('img_object_arrow');
    ctx.drawImage(image, -75, -5, 75, 11);
  },
  'torch': (renderer, ctx, entity, location) => {
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = Math.floor(size / 2);
    const flame = getCachedRadialImage(radius, {
      stops: [
        { offset: 0, color: [244, 206, 6], alpha: 1},
        { offset: .4, color: [169, 87, 0], alpha: 1},
        { offset: 1, color: [169, 87, 0], alpha: 0},
      ],
    });
    ctx.drawImage(flame, -1 * radius, -1 * radius);
  },
  'skele': (renderer, ctx, entity, location) => {
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = Math.floor(size / 2);
    const image = renderer.getImageAsset('img_entity_skele');
    ctx.drawImage(image, -75, -100, 200, 200);
  },
  'unitFrame': (renderer, ctx, entity, location) => {
    const barHeight = 10;
    const size = entity.size * renderer.SCALE_FACTOR;

    // We want the bottom left corner of the entity
    const startX = location.x - (size / 2);
    const startY = location.y + (size / 2);

    // Give a base rectangle on which to draw so low-health
    // entities aren't just transparent
    ctx.fillStyle = '#777';
    ctx.fillRect(startX, startY, size, barHeight);

    // Draw the rect representing the current health state as a
    // percentage of the width
    const healthPct = entity.health / entity.hp;
    const fillSize = Math.round(healthPct * size);

    let healthColor;
    if (healthPct <= .15) {
      healthColor = '#b70000';
    }
    else if (healthPct <= .40) {
      healthColor = '#d8d800';
    }
    else {
      healthColor = '#00b70c';
    }
    ctx.fillStyle = healthColor;
    ctx.fillRect(startX, startY, fillSize, barHeight);

    // If the unit is a player, draw the name
    if (entity.playerID) {
      const name = entity.player.name;
      ctx.fillStyle = '#000000';
      ctx.font = barHeight.toString() + 'px Arial';
      ctx.fillText(name,startX,startY + barHeight);
      // Draw name
    }
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
        this.clear();
        for (const entity of values(state.entities)) {
          const er = RENDERERS[entity.type];
          const location = renderer.translateCoords(entity.x, entity.y);
          this.ctx.translate(location.x, location.y);
          if (entity.orientation) {
            this.ctx.rotate((360 - entity.orientation) * Math.PI / 180);
          }
          er(renderer, this.ctx, entity, location);
          this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      },
    }),
    lighting: Layer(3, {
      width: renderer.mapDiameter,
      height: renderer.mapDiameter,
      draw: function(state) {
        this.clear();
        
        this.ctx.save()
        const lamps = values(state.entities).filter((e) => Boolean(e.light));
        for (const lamp of lamps) {
          const pos = renderer.translateCoords(lamp.x, lamp.y);
          const radius = lamp.light * renderer.SCALE_FACTOR;
          drawRadialGradient(this.ctx, pos.x, pos.y, radius, {
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
        for (const lamp of lamps) {
          const pos = renderer.translateCoords(lamp.x, lamp.y);
          const radius = lamp.light * renderer.SCALE_FACTOR;
          const lampMask = getCachedRadialImage(radius, {});
          this.maskLayer.ctx.drawImage(lampMask, pos.x - radius, pos.y - radius);
        }
        this.ctx.drawImage(this.maskLayer.canvas, 0, 0)
      },
    }),
    unitFrames: Layer(3, {
      width: renderer.mapDiameter,
      height: renderer.mapDiameter,
      draw: function(state) {
        this.clear();

        const ufRenderer = RENDERERS.unitFrame;
        for (const entity of values(state.entities)) {
          if (!entity.health) {
            continue
          }
          const location = renderer.translateCoords(entity.x, entity.y);
          ufRenderer(renderer, this.ctx, entity, location);
        }
        
        // Draw status text (framerate and latency info)
        const textSize = 15;
        const position = {
          x: renderer.cameraLocation.x - (renderer.viewportWidth / 2),
          y: renderer.cameraLocation.y - (renderer.viewportHeight / 2) + 15,
        };
        const message = `${client.latency}ms ${renderer.framerate}fps`;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `${textSize}px Arial`;
        this.ctx.fillText(message,position.x,position.y);
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
    const trackedLocation = renderer.translateCoords(location.x, location.y);
    renderer.cameraLocation = {
      x: setBounds(trackedLocation.x, renderer.center.x, renderer.mapDiameter - renderer.center.x),
      y: setBounds(trackedLocation.y, renderer.center.y, renderer.mapDiameter - renderer.center.y),
    };
    renderer.offset = {
      x: -1 * (renderer.cameraLocation.x - (renderer.viewportWidth / 2)),
      y: -1 * (renderer.cameraLocation.y - (renderer.viewportHeight / 2)),
    };

    // Now update the canvas locations to show the correct area
    const cssTop = `${renderer.offset.y}px`;
    const cssLeft = `${renderer.offset.x}px`;
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
      renderer.framerate = renderer.frame;
      renderer.frame = 0;
    }
    renderer.frame += 1;
    renderer.lastFrameStart = frameStart;
    
    // Update camera location in case we're centered on an entity that has moved
    renderer.autoSize();
    renderer.setCameraLocation();

    // Re-Draw entities every frame
    renderer.layers.entities.draw(client.state);

    // Re-Draw lighting
    renderer.layers.lighting.draw(client.state);

    // Re-Draw unit frames (health and nameplates)
    renderer.layers.unitFrames.draw(client.state);
    
    // Now do this about 60fps
    renderer.lastFrameTime = new Date().valueOf() - frameStart.valueOf();
    window.requestAnimationFrame(renderer.draw);
  }
  return renderer;
}
