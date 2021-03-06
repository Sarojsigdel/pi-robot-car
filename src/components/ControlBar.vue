<template>
  <div>
    <div class="col">
      <h5>Control Panel</h5>
    </div>
    <!-- Camera control -->
    <div class="col">
        <FourWayControl @move="move" type="camera" :action="action"/>
    </div>
    <!-- Drive control -->
    <div class="col mt-4">
        <FourWayControl @move="move" type="drive" :action="action"/>
    </div>
    <!-- Miscellaneous Controls -->
    <div class="col mt-4">
      <div class="row">
        <!-- Speed Control -->
        <h6 class="col p-0 mx-auto">Speed
          <div class="col mx-auto">
            <img class="control-img" src="../assets/plus-square-fill.svg" />
          </div>
          <div class="col mx-auto">
            <img class="control-img" src="../assets/dash-square-fill.svg" />
          </div>
        </h6>
        <!-- Honk the horn -->
        <h6 class="col p-0 mx-auto">Horn
          <div class="col mx-auto" @click="honk()">
            <img class="control-img" :class="{'invisible': hornInvisible}"
              src="../assets/volume-up-fill.svg" />
          </div>
        </h6>
        <!-- Flash lights -->
        <h6 class="col p-0 mx-auto">Flash
          <div class="col mx-auto" @click="flash('red')">
            <img class="control-img"  :class="{'invisible': redInvisible}"
              src="../assets/lightning-fill-red.svg" />
          </div>
          <div class="col mx-auto" @click="flash('green')">
            <img class="control-img" :class="{'invisible': greenInvisible}"
              src="../assets/lightning-fill-green.svg" />
          </div>
          <div class="col mx-auto" @click="flash('white')">
            <img class="control-img" :class="{'invisible': whiteInvisible}"
              src="../assets/lightning-fill-white.svg" />
          </div>
        </h6>
      </div>
    </div>
    <!-- Enable Obstacle Avoidance -->
    <div class="col mt-4">
      <Toggle @toggle="toggle" command="automatic"
        v-bind:selectedMode="selectedMode" label="Automatic"/>
    </div>
    <!-- Line Tracking -->
    <div class="col">
      <Toggle @toggle="toggle" command="line"
        v-bind:selectedMode="selectedMode" label="Line Tracking"/>
    </div>
  </div>
</template>

<script>
import FourWayControl from './FourWayControl.vue';
import Toggle from './Toggle.vue';
import {
  COMMANDS,
  COMMAND_TYPE,
  BEEPER_COMMAND,
  DRIVE_COMMAND
} from '../../common/common';

const KEY_EVENT_TYPE = {
  DOWN: 'down',
  UP: 'up'
};

const KEY_TO_RUN_COMMAND_MAP = {
  ArrowUp: COMMANDS.FORWARD,
  ArrowDown: COMMANDS.BACKWARD,
  ArrowLeft: COMMANDS.TURN_LEFT,
  ArrowRight: COMMANDS.TURN_RIGHT,
  ArrowUpLeft: COMMANDS.FORWARD_LEFT,
  ArrowUpRight: COMMANDS.FORWARD_RIGHT,
  ArrowDownLeft: COMMANDS.BACKWARD_LEFT,
  ArrowDownRight: COMMANDS.BACKWARD_RIGHT
};

const KEY_TO_COMMAND_MAP = {
  Enter: COMMANDS.HONK,
  a: COMMANDS.SPEED_UP,
  z: COMMANDS.SPEED_DOWN
};

const KEY_TO_CAM_COMMAND_MAP = {
  ArrowUp: COMMANDS.UP,
  ArrowDown: COMMANDS.DOWN,
  ArrowLeft: COMMANDS.LEFT,
  ArrowRight: COMMANDS.RIGHT,
  ArrowUpLeft: COMMANDS.UP_LEFT,
  ArrowUpRight: COMMANDS.UP_RIGHT,
  ArrowDownLeft: COMMANDS.DOWN_LEFT,
  ArrowDownRight: COMMANDS.DOWN_RIGHT
};

const addSocketEventListeners = (app) => {
  app.sockets.listener.subscribe('connect', app.onSocketConnected);
  app.sockets.listener.subscribe('disconnect', app.onSocketDisconnected);
};

const addWindowEventListeners = (app) => {
  window.addEventListener('keydown', app.onKeyDown);
  window.addEventListener('keyup', app.onKeyUp);
};

const clearAction = () => ({
  up: false,
  down: false,
  left: false,
  right: false
});

const setAction = (key, shiftKey) => ({
  up: key === 'ArrowUp',
  down: key === 'ArrowDown',
  left: key === 'ArrowLeft',
  right: key === 'ArrowRight',
  upLeft: key === 'ArrowUpLeft',
  upRight: key === 'ArrowUpRight',
  downLeft: key === 'ArrowDownLeft',
  downRight: key === 'ArrowDownRight',
  type: shiftKey ? COMMAND_TYPE.CAMERA : COMMAND_TYPE.DRIVE
});

export default {
  name: 'ControlBar',
  components: {
    FourWayControl,
    Toggle
  },
  mounted() {
    addWindowEventListeners(this);
    addSocketEventListeners(this);
  },
  data: () => ({
    action: {},
    redInvisible: false,
    greenInvisible: false,
    whiteInvisible: false,
    hornInvisible: false,
    selectedMode: 'none'
  }),
  methods: {
    onKeyDown(evt) {
      this.onKeyEvent(KEY_EVENT_TYPE.DOWN, evt.key, evt.shiftKey);
    },
    onKeyUp(evt) {
      this.onKeyEvent(KEY_EVENT_TYPE.UP, evt.key, evt.shiftKey);
    },
    onKeyEvent(eventType, eventKey, shiftKey) {
      if (!KEY_TO_RUN_COMMAND_MAP[eventKey] && !KEY_TO_CAM_COMMAND_MAP[eventKey]
        && (!KEY_TO_COMMAND_MAP[eventKey] || eventType === KEY_EVENT_TYPE.UP)) {
        // Key has no associated action
        return;
      }

      // Set action to update UI
      this.action = eventType === KEY_EVENT_TYPE.UP ? clearAction() : setAction(eventKey, shiftKey);

      // Set command to send to server
      let command = COMMANDS.STOP;

      if (shiftKey || !KEY_TO_RUN_COMMAND_MAP[eventKey] || eventType !== KEY_EVENT_TYPE.UP) {
        command = shiftKey ? KEY_TO_CAM_COMMAND_MAP[eventKey]
          : KEY_TO_RUN_COMMAND_MAP[eventKey] || KEY_TO_COMMAND_MAP[eventKey];
      }
      this.sendCommand(command);
    },
    sendCommand(command) {
      this.$socket.emit('command', {
        command,
      });
    },
    onSocketConnected() {
    },
    onSocketDisconnected() {
    },
    move(eventKey, eventType, componentType) {
      this.onKeyEvent(eventType, eventKey, componentType === 'camera');
    },
    toggle(command, status) {
      this.selectedMode = status ? command : 'none';
      this[command](status);
    },
    automatic(status) {
      this.sendCommand(status ? DRIVE_COMMAND.AUTOMATIC : DRIVE_COMMAND.STOP);
    },
    line(status) {
      this.sendCommand(status ? DRIVE_COMMAND.LINE_TRACKING : DRIVE_COMMAND.STOP);
    },
    flashIcon(icon) {
      let flashInterval;
      setTimeout(() => {
        this[icon] = false;
        clearInterval(flashInterval);
      }, 2000);
      flashInterval = setInterval(() => {
        this[icon] = !this[icon];
      }, 200);
    },
    flash(color) {
      this.sendCommand(`flash_${color}`);
      this.flashIcon(`${color}Invisible`);
    },
    honk() {
      this.sendCommand(BEEPER_COMMAND.HONK);
      this.flashIcon('hornInvisible');
    }
  }
};
</script>

<style>
.control-img {
  width: 2em;
  height: 2em;
  cursor: pointer;
  margin: 0.2em;
}
.active {
    background-color: red;
}

</style>>
