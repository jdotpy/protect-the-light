
// The game will communicate with the UI by placing crap in the uiState object
document.uiState = {
  game: {},
  init: {},
};

Vue.config.performance = true;

const app = new Vue({
  el: '#ui',
  data: document.uiState,
  methods: {
    onPlayerSetupSubmit: function() {
      document.client.initializePlayer(this.init.name, this.init.role);
    },
    onPlayerReady: function() {
      document.client.markPlayerReady();
    },
    currentPlayer: function() {
      if (!this.game || !this.game.playerID || !this.game.players) {
        return {};
      }
      return this.game.players.find((p) => p.id === this.game.playerID);
    },
    isPlayerSetup: function() {
      const p = this.currentPlayer();
      return p && p.name && p.role;
    },
  }
})
