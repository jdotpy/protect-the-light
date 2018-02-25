const EVENTS = {

  newPlayer: (player) => ({
    event: 'player.add',
    type: 'player',
    details: player.stateDetails(),
  }),

  newCharacter: (character) => ({
    event: 'entity.add',
    type: 'entity',
    details: player.stateDetails(),
  }),

};

module.exports = EVENTS;
