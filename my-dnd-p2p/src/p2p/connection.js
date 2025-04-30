

// Simple stub for P2P connection using WebRTC DataChannel (manual signaling)
export class P2PConnection {
  constructor() {
    this.dataChannel = null;
    this._onMessage = () => {};
  }

  async init() {
    // TODO: implement WebRTC offer/answer exchange here
    console.log('P2PConnection init stub');
  }

  send(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    } else {
      console.warn('DataChannel not open, cannot send:', data);
    }
  }

  onMessage(callback) {
    this._onMessage = callback;
  }

  // Internal: should be called when a message arrives
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this._onMessage(data);
    } catch (e) {
      console.error('Invalid message', e);
    }
  }
}