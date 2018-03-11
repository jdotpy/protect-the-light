const EVENTS = {

  playerConnectState: (game) => ({
    event: 'init.gameState',
    players: game.getPlayerState(),
    status: game.status,
  }),

  newPlayer: (player) => ({
    event: 'player.add',
    player: player.stateDetails(),
  }),

  removePlayer: (player) => ({
    event: 'player.remove',
    player: player.stateDetails(),
  }),

  playerUpdated: (player) => ({
    event: 'player.update',
    player: player.stateDetails(),
  }),

  spawn: (entity) => ({
    event: 'entity.spawn',
    entity: entity.stateDetails(),
  }),

  startPlaying: (game) => ({
    event: 'game.start',
    status: game.status,
    map: game.map.stateDetails(),
  }),

  playerAssignCharacter: (player, entity) => ({
    event: 'player.setCharacter',
    details: {
      player: player.name,
      entity: entity.id,
    },
  }),

  entityMove: (entity) => ({
    event: 'entity.move',
    id: entity.id,
    location: {
      x: entity.x,
      y: entity.y,
    },
  }),

  entityRotate: (entity) => ({
    event: 'entity.rotate',
    id: entity.id,
    orientation: entity.orientation,
  }),

};

module.exports = EVENTS;
