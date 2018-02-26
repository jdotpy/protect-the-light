
// The game will communicate with the UI by placing crap in the uiState object
document.uiState = {
  game: {},
  init: {},
};

const app = new Vue({
  el: '#ui',
  data: document.uiState,
  methods: {
    onPlayerSetupSubmit: function() {
      document.client.initializePlayer(this.init.name, this.init.role);
    },
  }
})
