/**
 * Optional WebRTC data channel. Signaling rides inside the room document.
 * If the peer connection fails, the mailbox sync is unchanged.
 */

const STUN = [{ urls: "stun:stun.l.google.com:19302" }];

export function pickPeer(selfId, presence, now) {
  let best = "";
  let bestAt = 0;
  const when = Number(now) || 0;
  Object.keys(presence || {}).forEach((id) => {
    if (!id || id === selfId) return;
    const at = Number(presence[id] && presence[id].at) || 0;
    if (!at || when - at > 20000) return;
    if (at >= bestAt) {
      best = id;
      bestAt = at;
    }
  });
  return best;
}

export function createFastPath(opts) {
  const RTC = opts.RTCPeerConnection || globalThis.RTCPeerConnection;
  if (typeof RTC !== "function") return { ingest() {}, stop() {}, active: false, peer: "" };
  const selfId = opts.selfId;
  let pc = null;
  let channel = null;
  let peer = "";
  let stopped = false;
  const seenIce = {};

  function stop() {
    stopped = true;
    try { if (channel) channel.close(); } catch (e) {}
    try { if (pc) pc.close(); } catch (e) {}
    channel = null;
    pc = null;
    peer = "";
  }

  function sendDelta(delta) {
    if (!channel || channel.readyState !== "open" || !delta) return false;
    try {
      channel.send(JSON.stringify({
        playerId: delta.playerId,
        hole: delta.hole,
        field: delta.field,
        value: delta.value,
        at: delta.at,
        by: delta.by || selfId
      }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function bindChannel(ch) {
    channel = ch;
    channel.onmessage = (ev) => {
      let msg = null;
      try { msg = JSON.parse(String(ev.data || "")); } catch (e) { msg = null; }
      if (!msg || msg.by === selfId) return;
      if (typeof opts.onDelta === "function") {
        try { opts.onDelta(msg); } catch (e) {}
      }
    };
  }

  function ensurePc(remoteId) {
    if (pc && peer === remoteId) return pc;
    stop();
    stopped = false;
    peer = remoteId;
    try {
      pc = new RTC({ iceServers: STUN });
    } catch (e) {
      pc = null;
      return null;
    }
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || stopped) return;
      const data = JSON.stringify(ev.candidate);
      if (seenIce[data]) return;
      seenIce[data] = 1;
      opts.sendSignal("ice", data, remoteId);
    };
    pc.ondatachannel = (ev) => bindChannel(ev.channel);
    return pc;
  }

  async function offer(remoteId) {
    const conn = ensurePc(remoteId);
    if (!conn) return;
    try {
      bindChannel(conn.createDataChannel("fairway"));
      const desc = await conn.createOffer();
      await conn.setLocalDescription(desc);
      opts.sendSignal("offer", JSON.stringify(conn.localDescription), remoteId);
    } catch (e) {}
  }

  async function accept(remoteId, data, kind) {
    const conn = ensurePc(remoteId);
    if (!conn) return;
    try {
      const desc = JSON.parse(data);
      if (kind === "offer") {
        await conn.setRemoteDescription(desc);
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);
        opts.sendSignal("answer", JSON.stringify(conn.localDescription), remoteId);
      } else if (kind === "answer") {
        await conn.setRemoteDescription(desc);
      } else if (kind === "ice") {
        await conn.addIceCandidate(desc);
      }
    } catch (e) {}
  }

  return {
    active: true,
    get peer() { return peer; },
    sendDelta: sendDelta,
    stop: stop,
    ingest(doc) {
      if (stopped || !doc) return;
      const remoteId = pickPeer(selfId, doc.presence, opts.now ? opts.now() : Date.now());
      if (!remoteId) return;
      const signals = Array.isArray(doc.signals) ? doc.signals : [];
      const mine = signals.filter((s) => s && s.from === remoteId && (s.to === selfId || s.to === "*"));
      const offerSig = mine.filter((s) => s.kind === "offer").slice(-1)[0];
      const answerSig = mine.filter((s) => s.kind === "answer").slice(-1)[0];
      if (selfId < remoteId) {
        if (!pc) offer(remoteId);
        if (answerSig) accept(remoteId, answerSig.data, "answer");
      } else if (offerSig) {
        accept(remoteId, offerSig.data, "offer");
      }
      mine.filter((s) => s.kind === "ice").slice(-8).forEach((s) => accept(remoteId, s.data, "ice"));
    }
  };
}
