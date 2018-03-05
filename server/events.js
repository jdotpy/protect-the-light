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

  startPlaying: (map) => ({
    event: 'game.start',
    map: map.stateDetails(),
  }),

  playerAssignCharacter: (player, entity) => ({
    event: 'player.setCharacter',
    details: {
      player: player.name,
      entity: entity.id,
    },
  }),

};

module.exports = EVENTS;
