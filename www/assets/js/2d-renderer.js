
function toRGBA(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
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
    let radius = Math.floor(size / 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#68574a';
    ctx.strokeRect(location.x - radius, location.y - radius, radius * 2, radius * 2);
    radius = Math.floor(size * 0.25);
    ctx.strokeRect(location.x - radius, location.y - radius, radius * 2, radius * 2);
    radius = Math.floor(size * 0.125);
    ctx.strokeRect(location.x - radius, location.y - radius, radius * 2, radius * 2);
    ctx.stroke();
  },
  'torch': (renderer, ctx, entity) => {
    const location = renderer.translateCoords(entity.x, entity.y);
    const size = entity.size * renderer.SCALE_FACTOR;
    const radius = Math.floor(size / 2);
    const flame = getCachedRadialImage(radius, {
      stops: [
        { offset: 0, color: [244, 206, 6], alpha: 1},
        { offset: .4, color: [169, 87, 0], alpha: 1},
        { offset: 1, color: [169, 87, 0], alpha: 0},
      ],
    });
    ctx.drawImage(flame, location.x - radius, location.y - radius);
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
      draw: function(state) {
        this.clear();
        
        this.ctx.save()
        const lamps = values(state.entities).filter((e) => e.type === 'torch');
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
