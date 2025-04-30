

// P2PConnection: WebRTC DataChannel with manual signaling
export class P2PConnection {
  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    this.dataChannel = null;
    this._onMessage = () => {};

    // ICE candidate gathering
    this.pc.onicecandidate = event => {
      if (!event.candidate && this._iceCompleteResolve) {
        this._iceCompleteResolve();
      }
    };

    // For callee: when data channel is received
    this.pc.ondatachannel = event => {
      this.dataChannel = event.channel;
      this._setupDataChannel();
    };
  }

  // Caller: create a DataChannel and an offer
  async createOffer() {
    this.dataChannel = this.pc.createDataChannel('dnd');
    this._setupDataChannel();
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this._waitForIceGathering();
    return JSON.stringify(this.pc.localDescription);
  }

  // Callee: receive offer string, set remote, generate answer
  async receiveOffer(offerString) {
    const offer = JSON.parse(offerString);
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this._waitForIceGathering();
    return JSON.stringify(this.pc.localDescription);
  }

  // Caller: set remote answer
  async receiveAnswer(answerString) {
    const answer = JSON.parse(answerString);
    await this.pc.setRemoteDescription(answer);
  }

  // Internal: set up data channel callbacks
  _setupDataChannel() {
    this.dataChannel.onopen = () => console.log('P2P DataChannel open');
    this.dataChannel.onmessage = event => this._handleMessage(event);
    this.dataChannel.onclose = () => console.log('P2P DataChannel closed');
  }

  // Internal: promise that resolves when ICE gathering is complete
  _waitForIceGathering() {
    if (this.pc.iceGatheringState === 'complete') {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this._iceCompleteResolve = resolve;
    });
  }

  // Send JSON-serializable data to peer
  send(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    } else {
      console.warn('DataChannel not open, cannot send data');
    }
  }

  // Register message handler: callback receives parsed data
  onMessage(callback) {
    this._onMessage = callback;
  }

  // Internal: handle incoming message event
  _handleMessage(event) {
    try {
      const parsed = JSON.parse(event.data);
      this._onMessage(parsed);
    } catch (e) {
      console.error('Invalid P2P message', e);
    }
  }
}