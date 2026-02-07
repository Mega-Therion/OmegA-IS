const { EventEmitter } = require('events');

class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
  }

  publish(topic, payload) {
    this.emitter.emit(topic, payload);
  }

  subscribe(topic, handler) {
    this.emitter.on(topic, handler);
    return () => this.emitter.off(topic, handler);
  }
}

module.exports = {
  EventBus,
};
