console.log('main js loaded');

function websocketUrl(path) {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${loc.host}${path}`
}

function GameClient(path) {
  const client = {};

  client.onServerMessage = function(e) {
    const message = JSON.parse(e.data);
    console.log('Got message from server:', message)
    switch (message.event) {
      case 'state': {

      }
    }
  }

  client.onServerConnect = function() {
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

  // Logic
  client.initializePlayer = function(name, role) {
    client.sendMessage({ event: 'init.chooseName', name });
    client.sendMessage({ event: 'init.chooseRole', role });
  }

  // Init
  client.socket = new WebSocket(websocketUrl(path));
  client.socket.onmessage = client.onServerMessage;
  client.socket.onopen = client.onServerConnect;
  client.socket.onerror = client.onServerError;

  return client;
}

document.client = GameClient('/ws-connect');
