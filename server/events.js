const EVENTS = {

  newPlayer: (player) => ({
    event: 'player.add',
    type: 'player',
    details: player.stateDetails(),
  }),

  removePlayer: (player) => ({
    event: 'player.remove',
    type: 'player',
    details: player.stateDetails(),
  }),

  spawn: (entity) => ({
    event: 'entity.spawn',
    type: 'entity',
    details: entity.stateDetails(),
  }),

  playerAssignCharacter: (player, entity) => ({
    event: 'player.setCharacter',
    type: 'entity',
    details: {
      player: player.name,
      entity: entity.id,
    },
  }),

};

module.exports = EVENTS;
