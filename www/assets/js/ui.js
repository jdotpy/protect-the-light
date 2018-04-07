
Vue.component('gauge', {
  props: ['maxValue', 'value', 'color'],
  computed: {
    percentWidth: function() {
      const percent = (this.value / this.maxValue) * 100;
      return `${percent}%`;
    },
  },
  template: `
    <div class="gauge" style="width: 100%; border: solid 1px grey;">
      <div
        class="gaugeValue"
        :style="{ color: '#fefefe', width: percentWidth, backgroundColor: color }"
      >
        {{ value }} / {{ maxValue }}
     </div>
    </div>
  `,
})

const app = new Vue({
  el: '#ui',
  data: {
    initForm: {},
    connected: false,
    gameStatus: null,
    gameID: null,
    playerID: null,
    players: {},
    playerCharacter: {},
  },
  created: function() {
    document.client.eventBus.registerMany({
      'sys.connected': () => this.connected = true,
      'sys.disconnected': () => this.connected = false,
      'game.start': (e) => this.gameStatus = e.status,
      'init.gameState': (e) => {
        this.gameStatus = e.status;
        this.players = e.players.slice();
      },
      'init.you': (e) => {
        this.playerID = e.player.id;
      },
      'player.update': this.updatePlayer,
      'player.add': this.updatePlayer,
      'player.remove': (e) => {
        const player = this.players.find((p) => p.id === e.player.id);
        this.players.remove(player);
      },
      'sys.youSpawned': (e) => {
        this.entityID = e.entity.id;
        this.playerCharacter = e.entity;
      },
      'entity.damaged': (e) => this.updateCharacterCheck(e, ['health']),
    });
  },
  computed: {
    me: function() {
      return this.players.find((p) => p.id === this.playerID);
    },
  },
  methods: {
    updateCharacterCheck: function(e, attrs) {
      if (e.id === this.playerCharacter.id) {
        for (const attr of attrs) {
          this.playerCharacter[attr] = e[attr];
        }
      }
    },
    updatePlayer: function(e) {
      const current = this.players.find((p) => p.id === e.player.id);
      if (!current) {
        players.push(e.player);
      }
      else {
        Object.assign(current, e.player);
      }
    },
    onPlayerSetupSubmit: function() {
      document.client.initializePlayer(this.initForm.name, this.initForm.role);
    },
    onPlayerReady: function() {
      document.client.markPlayerReady();
    },
    isPlayerSetup: function() {
      return this.me && this.me.name && this.me.role;
    },
  }
})
