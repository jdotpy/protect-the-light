
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

Vue.component('timer', {
  props: ['radius', 'time', 'startTime'],
  mounted: function() {
    this.ctx = this.$el.getContext('2d');
    this.redraw();
  },
  destroyed: function() {
    this.stop = true;
  },
  computed: {
    diameter: function() {
      return this.radius * 2;
    },
  },
  watch : {
    startTime: function() { this.redraw() },
  },
  methods: {
    redraw: function() {
      if (this.stop) {
        return false;
      }
      this.ctx.clearRect(0, 0, this.diameter, this.diameter);
      const percentLeft = this.percentLeft();
      if (percentLeft === 0) {
        return false;
      }
      this.drawMask(this.percentLeft());
      requestAnimationFrame(this.redraw);
    },
    timeLeft: function() {
      if (!this.startTime) {
        return 0;
      }
      const timeSince = new Date().valueOf() - this.startTime;
      if (this.time < timeSince) {
        return 0;
      }
      return this.time - timeSince;
    },
    percentLeft: function() {
      const timeLeft = this.timeLeft();
      if (timeLeft === 0) {
        return 0;
      }
      return ((1.0 * timeLeft) / this.time) * 100;
    },
    drawMask: function(percent) {
      const maxAngle = Math.PI * 2;
      const angle = (percent / 100) * maxAngle;
      const startAngle = maxAngle - (Math.PI / 2);
      this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
      this.ctx.beginPath();
      this.ctx.arc(this.radius, this.radius, this.radius, startAngle, startAngle + angle);
      this.ctx.lineTo(this.radius, this.radius);
      this.ctx.closePath();
      this.ctx.fill();
    },
  },
  template: `
    <canvas class="timer" :width="diameter" :height="diameter" style="position: absolute;"></canvas>
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
    abilityUses: {},
  },
  created: function() {
    this.game = document.client;
    this.game.eventBus.registerMany({
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
      'entity.ability': (e) => {
        if (e.id === this.playerCharacter.id) {
          this.abilityUses = Object.assign({}, this.abilityUses, {
            [e.ability]: new Date().valueOf() - this.game.latency,
          })
          console.log('updating uses:', this.abilityUses);
        }
      },
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
