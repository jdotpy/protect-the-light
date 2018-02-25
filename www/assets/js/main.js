console.log('main js loaded');

function websocketUrl(path) {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${loc.host}${path}`
}

function GameClient(path) {
  const client = {};

  client.onServerMessage = function(event) {
    console.log('Got message from server:')
    console.log(JSON.parse(event.data))
  }

  client.onServerConnect = function() {
    console.log('connected websocket to server', client.socket);
    client.sendMessage({ message: 'I want to play!' })
  }

  client.sendMessage = function(message) {
    console.log('sending message:', message);
    client.socket.send(JSON.stringify(message));
  }

  // Init
  console.log('initializing websocket connection');
  client.socket = new WebSocket(websocketUrl(path));
  client.socket.onmessage = client.onServerMessage;
  client.socket.onopen = client.onServerConnect;
  console.log('initialized:', client.socket);
  
  return {};
}

document.client = GameClient('/ws-connect');

