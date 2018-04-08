function getDegreeOfAngle(dx, dy) {
  const radians = Math.atan2(dy, dx);
  return radians / (Math.PI / 180);
}

function GameClient(path) {
  const client = {};
  client.state = {
    players: {},
    entities: {},
  };
  client.eventBus =  EventBus();
  client.latency = 0;
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
  }

  client.onServerConnect = function() {
    client.state.connected = true;
    client.eventBus.emit('sys.connected');
    console.log('Got connected!')
    client.pingInterval = setInterval(client.sendPing, 3000);
  }

  client.onServerDisconnect = function() {
    client.state.connected = false;
    client.eventBus.emit('sys.connected');
    client.state.status = 'disconnected';
    clearInterval(client.pingInterval, 3000);
  }

  client.onServerError = function(error) {
    client.eventBus.emit('sys.error', error);
    console.log(client.socket, error)
  }

  client.sendMessage = function(message) {
    console.log('sending message:', message);
    client.socket.send(JSON.stringify(message));
  }

  client.sendPing = function() {
    client._lastPingStart = new Date();
    client.sendMessage({ event: 'ping' })
  }

  client.handlePingResponse = function() {
    client.latency = new Date().valueOf() - client._lastPingStart.valueOf();
  }

  client.getCurrentPlayer = function() {
    return client.state.players[client.state.playerID];
  }

  client.getCurrentPlayerEntity = function() {
    const entityID = client.getCurrentPlayer().entityID;
    return client.state.entities[entityID];
  }

  // Logic
  client.initializePlayer = function(name, role) {
    client.sendMessage({ event: 'init.chooseName', name });
    client.sendMessage({ event: 'init.chooseRole', role });
  }

  client.bindControls = function() {
    const movementControls = { up: 0,};

    function sendMovementUpdate() {
      let dy = 0;
      let dx = 0;
      let power = 0;

      // Y Axis
      if (movementControls.up && movementControls.down) {
        dy = 0;
      }
      else if (movementControls.up) {
        dy = 1;
      }
      else if (movementControls.down) {
        dy = -1;
      }

      // X Axis 
      if (movementControls.left && movementControls.right) {
        dx = 0;
      }
      else if (movementControls.right) {
        dx = 1;
      }
      else if (movementControls.left) {
        dx = -1;
      }

      if (dx || dy) {
        power = 1;
      }
      const angle = getDegreeOfAngle(dx, dy);

      client.playerMovement = { angle, power };
      client.sendMessage({
        event: 'player.move',
        direction: angle,
        power: power
      });
    }

    function updateMovement(direction, value) {
      return () => {
        movementControls[direction] = value;
        sendMovementUpdate();
      }
    };

    function updateOrientation(mousePos) {
      const playerEntity = client.getCurrentPlayerEntity();
      const playerPos = client.renderer.translateCoords(playerEntity.x, playerEntity.y);

      // Subtract the screen offset to get the player position relative to screen;
      const dx = mousePos.x - (playerPos.x + client.renderer.offset.x);
      const dy = mousePos.y - (playerPos.y + client.renderer.offset.y);
      const angle = getDegreeOfAngle(dx, dy * -1); // Reverse y-axis

      // Update locally for fast-update
      playerEntity.orientation = angle;
      client.sendMessage({
        event: 'player.orientation',
        direction: angle,
      });
    }

    function onMouseEvent(e) {
      if (e.buttons === 1) { // Primary button
        const position = { x: e.pageX, y: e.pageY };
        updateOrientation(position);
      }
    }

    // compass movement
    Mousetrap.bind('w', updateMovement('up', true), 'keydown');
    Mousetrap.bind('w', updateMovement('up', false), 'keyup');
    Mousetrap.bind('s', updateMovement('down', true), 'keydown');
    Mousetrap.bind('s', updateMovement('down', false), 'keyup');
    Mousetrap.bind('a', updateMovement('left', true), 'keydown');
    Mousetrap.bind('a', updateMovement('left', false), 'keyup');
    Mousetrap.bind('d', updateMovement('right', true), 'keydown');
    Mousetrap.bind('d', updateMovement('right', false), 'keyup');

    // Orientation using the mouse
    document.onmousedown = onMouseEvent;
    document.onmousemove = onMouseEvent;

    //// Abilities
    Mousetrap.bind('tab', (e) => {
      e.preventDefault();
      client.sendMessage({ event: 'player.useAbility', ability: 0 });
    });
    Mousetrap.bind('space', () => client.sendMessage({ event: 'player.useAbility', ability: 1 }));
    Mousetrap.bind('q', () => client.sendMessage({ event: 'player.useAbility', ability: 2 }));
    Mousetrap.bind('e', () => client.sendMessage({ event: 'player.useAbility', ability: 3 }));
    Mousetrap.bind('r', () => client.sendMessage({ event: 'player.useAbility', ability: 4 }));
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
      case 'entity.damaged': {
        const entity = client.state.entities[action.id];
        entity.health = action.health;
        break;
      }
      case 'entity.destroyed': {
        delete client.state.entities[action.id];
        break;
      }
      case 'entity.spawn': {
        client.state.entities[action.entity.id] = action.entity;
        if (action.entity.playerID) {
          const player = client.state.players[action.entity.playerID];
          player.entityID = action.entity.id;
          action.entity.player = player;
          if (action.entity.playerID == client.state.playerID) {
            client.eventBus.emit('sys.youSpawned', action);
          }
        }
        break;
      }
      case 'pong': {
        client.handlePingResponse();
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
    client.eventBus.emit(action.event, action);
  }


  // Init
  client.socket = new WebSocket(websocketUrl(path));
  client.socket.onmessage = client.onServerMessage;
  client.socket.onopen = client.onServerConnect;
  client.socket.onerror = client.onServerError;
  client.socket.onclose = client.onServerDisconnect;

  return client;
}

document.client = GameClient('/ws-connect');
