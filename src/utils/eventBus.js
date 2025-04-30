

const events = {};

export const EventBus = {
  on(event, handler) {
    if (!events[event]) events[event] = [];
    events[event].push(handler);
  },
  emit(event, data) {
    (events[event] || []).forEach(handler => handler(data));
  },
};