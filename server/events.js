const EVENTS = {

  newPlayer: (player) => ({
    type: 'player.add',
    player: player.stateDetails(),
  }),

  removePlayer: (player) => ({
    type: 'player.remove',
    player: player.stateDetails(),
  }),

  playerUpdated: (player) => ({
    type: 'player.updated',
    player: player.stateDetails(),
  }),

  spawn: (entity) => ({
    type: 'entity.spawn',
    entity: entity.stateDetails(),
  }),

  startPlaying: (map) => ({
    type: 'game.start',
    map: map.name,
  }),

  playerAssignCharacter: (player, entity) => ({
    type: 'player.setCharacter',
    details: {
      player: player.name,
      entity: entity.id,
    },
  }),

};

module.exports = EVENTS;
