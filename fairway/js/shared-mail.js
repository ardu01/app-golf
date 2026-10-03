/**
 * Store-and-forward mailbox for a shared round.
 * The document both phones share is HTTPS, keyed only by the room code:
 *   POST/GET https://mantledb.sh/v2/{code}/card
 * No account and no API key. Do not claim the namespace: that returns a
 * secret write key, and this file must not store one.
 * MQTT (wss://test.mosquitto.org:8081/mqtt, subprotocol "mqtt")
 * may only wake an HTTPS GET. A retained payload is not the score.
 * Safari often fails that socket. A failed wake must not block the HTTPS put.
 * Optional: HTTP GET/PUT {base}/{code} when FAIRWAY_ROOM_HTTP is set.
 * None of these URLs is a secret.
 */

import { sanitizeRoom } from "./shared-round.js";

export const FAIRWAY_ROOM_BROKER = "wss://test.mosquitto.org:8081/mqtt";
export const FAIRWAY_ROOM_STORE = "https://mantledb.sh/v2";
export const FAIRWAY_ROOM_HTTP = "";
export const FAIRWAY_ROOM_TOPIC = "fairway/v1/room/";

const enc = new TextEncoder();
const dec = new TextDecoder();

function utf8Field(text) {
  const bytes = enc.encode(String(text));
  return [bytes.length >> 8, bytes.length & 0xff].concat(Array.from(bytes));
}

function remainingLength(n) {
  const out = [];
  let left = n;
  do {
    let digit = left % 128;
    left = Math.floor(left / 128);
    if (left > 0) digit |= 0x80;
    out.push(digit);
  } while (left > 0);
  return out;
}

function packet(head, body) {
  return new Uint8Array([head].concat(remainingLength(body.length), body));
}

export function encodeConnect(clientId) {
  const body = utf8Field("MQTT").concat([4, 0x02, 0x00, 30], utf8Field(clientId));
  return packet(0x10, body);
}

export function encodeSubscribe(topic, packetId) {
  const id = packetId || 1;
  const body = [id >> 8, id & 0xff].concat(utf8Field(topic), [0]);
  return packet(0x82, body);
}

export function encodePublish(topic, text, retain) {
  const head = retain === false ? 0x30 : 0x31;
  const body = utf8Field(topic).concat(Array.from(enc.encode(String(text))));
  return packet(head, body);
}

export function encodePing() {
  return new Uint8Array([0xc0, 0x00]);
}

export function splitPackets(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const packets = [];
  let i = 0;
  while (i < bytes.length) {
    if (i + 2 > bytes.length) return { packets: packets, rest: bytes.slice(i) };
    let mul = 1;
    let len = 0;
    let p = i + 1;
    let done = false;
    for (let k = 0; k < 4; k++) {
      if (p >= bytes.length) return { packets: packets, rest: bytes.slice(i) };
      const digit = bytes[p++];
      len += (digit & 0x7f) * mul;
      mul *= 128;
      if ((digit & 0x80) === 0) { done = true; break; }
    }
    if (!done || p + len > bytes.length) return { packets: packets, rest: bytes.slice(i) };
    packets.push(bytes.slice(i, p + len));
    i = p + len;
  }
  return { packets: packets, rest: new Uint8Array(0) };
}

export function packetType(pkt) {
  return pkt && pkt.length ? pkt[0] >> 4 : 0;
}

export function parsePublish(pkt) {
  if (!pkt || packetType(pkt) !== 3) return null;
  let i = 1;
  for (let k = 0; k < 4; k++) {
    const digit = pkt[i++];
    if ((digit & 0x80) === 0) break;
  }
  if (i + 2 > pkt.length) return null;
  const tlen = (pkt[i] << 8) | pkt[i + 1];
  i += 2;
  if (i + tlen > pkt.length) return null;
  const topic = dec.decode(pkt.slice(i, i + tlen));
  i += tlen;
  return { topic: topic, payload: dec.decode(pkt.slice(i)), retain: (pkt[0] & 0x01) === 1 };
}

function sendBytes(socket, bytes) {
  const raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const copy = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  socket.send(copy);
}

function concatBytes(chunks) {
  const parts = chunks.filter(Boolean);
  let n = 0;
  parts.forEach((p) => { n += p.length; });
  const out = new Uint8Array(n);
  let o = 0;
  parts.forEach((p) => { out.set(p, o); o += p.length; });
  return out;
}

export function roomTopic(code) {
  return FAIRWAY_ROOM_TOPIC + code;
}

export function createMqttMailbox(opts) {
  const WS = opts.WebSocket || globalThis.WebSocket;
  const url = opts.url || FAIRWAY_ROOM_BROKER;
  const clientId = opts.clientId || ("fw" + Math.random().toString(16).slice(2, 10));
  let ws = null;
  let opening = null;
  let rest = new Uint8Array(0);
  let connackWait = [];
  let subWait = [];
  let retainedWait = [];
  const live = [];
  const latest = new Map();
  const subscribed = new Set();
  let pingTimer = null;
  let closed = false;

  function failAll(err) {
    const error = err || new Error("mailbox");
    connackWait.splice(0).forEach((w) => w.reject(error));
    subWait.splice(0).forEach((w) => w.reject(error));
    retainedWait.splice(0).forEach((w) => w.reject(error));
  }

  function handlePacket(pkt) {
    const type = packetType(pkt);
    if (type === 2) {
      const code = pkt.length > 3 ? pkt[3] : 0;
      const waiters = connackWait.splice(0);
      if (code !== 0) waiters.forEach((w) => w.reject(new Error("connack " + code)));
      else waiters.forEach((w) => w.resolve());
      return;
    }
    if (type === 9) {
      subWait.splice(0).forEach((w) => w.resolve());
      return;
    }
    if (type === 3) {
      const pub = parsePublish(pkt);
      if (!pub) return;
      let doc = null;
      try {
        if (pub.payload && pub.payload.length < 200000) doc = JSON.parse(pub.payload);
      } catch (e) { doc = null; }
      const room = doc ? sanitizeRoom(doc) : null;
      if (pub.topic) latest.set(pub.topic, room);
      retainedWait.slice().forEach((w) => {
        if (w.topic !== pub.topic) return;
        const i = retainedWait.indexOf(w);
        if (i >= 0) retainedWait.splice(i, 1);
        w.resolve(room);
      });
      live.forEach((fn) => {
        try { fn(pub.topic, room); } catch (e) {}
      });
    }
  }

  function onData(data) {
    let chunk = null;
    if (data instanceof Uint8Array) chunk = data;
    else if (data instanceof ArrayBuffer) chunk = new Uint8Array(data);
    else return;
    const split = splitPackets(concatBytes([rest, chunk]));
    rest = split.rest;
    split.packets.forEach(handlePacket);
  }

  function takeMessage(data) {
    if (data && typeof data.arrayBuffer === "function" && !(data instanceof Uint8Array) && !(data instanceof ArrayBuffer)) {
      data.arrayBuffer().then((buf) => onData(buf)).catch(() => {});
      return;
    }
    onData(data);
  }

  function connect() {
    if (closed) return Promise.reject(new Error("closed"));
    if (ws && ws.readyState === 1) return Promise.resolve();
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      let socket;
      try { socket = new WS(url, ["mqtt"]); }
      catch (e) { opening = null; reject(e); return; }
      ws = socket;
      socket.binaryType = "arraybuffer";
      const fail = (err) => {
        opening = null;
        failAll(err instanceof Error ? err : new Error("socket"));
        reject(err instanceof Error ? err : new Error("socket"));
      };
      socket.onopen = () => {
        const wait = new Promise((res, rej) => connackWait.push({ resolve: res, reject: rej }));
        sendBytes(socket, encodeConnect(clientId));
        wait.then(() => {
          opening = null;
          if (pingTimer) clearInterval(pingTimer);
          pingTimer = setInterval(() => {
            try { if (ws && ws.readyState === 1) sendBytes(ws, encodePing()); } catch (e) {}
          }, 20000);
          resolve();
        }).catch(fail);
      };
      socket.onmessage = (ev) => takeMessage(ev.data);
      socket.onerror = () => fail(new Error("socket"));
      socket.onclose = () => {
        ws = null;
        opening = null;
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
        subscribed.clear();
        latest.clear();
        failAll(new Error("closed"));
      };
    });
    return opening;
  }

  async function subscribe(topic) {
    await connect();
    if (subscribed.has(topic)) return latest.has(topic) ? latest.get(topic) : null;
    const wait = new Promise((resolve, reject) => {
      subWait.push({ resolve: resolve, reject: reject });
    });
    const retained = new Promise((resolve, reject) => {
      retainedWait.push({ topic: topic, resolve: resolve, reject: reject });
    });
    sendBytes(ws, encodeSubscribe(topic, 1));
    await wait;
    subscribed.add(topic);
    if (latest.has(topic)) return latest.get(topic);
    let timer = null;
    const empty = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), opts.retainWaitMs == null ? 1500 : opts.retainWaitMs);
    });
    const doc = await Promise.race([retained, empty]);
    if (timer) clearTimeout(timer);
    const i = retainedWait.findIndex((w) => w.topic === topic);
    if (i >= 0) retainedWait.splice(i, 1);
    if (!latest.has(topic)) latest.set(topic, doc || null);
    return latest.get(topic);
  }

  return {
    transport: "mqtt",
    async get(code) {
      return subscribe(roomTopic(code));
    },
    async put(code, doc) {
      await connect();
      const topic = roomTopic(code);
      const clean = sanitizeRoom(doc) || doc;
      latest.set(topic, clean);
      sendBytes(ws, encodePublish(topic, JSON.stringify(doc), true));
    },
    subscribe(fn) {
      live.push(fn);
      return function () {
        const i = live.indexOf(fn);
        if (i >= 0) live.splice(i, 1);
      };
    },
    close() {
      closed = true;
      live.splice(0);
      if (pingTimer) clearInterval(pingTimer);
      try { if (ws) ws.close(); } catch (e) {}
      ws = null;
    }
  };
}

export function storeRoomUrl(base, code) {
  return String(base || FAIRWAY_ROOM_STORE).replace(/\/$/, "") + "/" + encodeURIComponent(code) + "/card";
}

function fetchWithTimeout(fetchFn, url, opts, ms) {
  const Ctrl = globalThis.AbortController;
  const ctrl = typeof Ctrl === "function" ? new Ctrl() : null;
  const timer = setTimeout(() => { try { if (ctrl) ctrl.abort(); } catch (e) {} }, ms || 8000);
  const next = Object.assign({}, opts || {});
  if (ctrl && !next.signal) next.signal = ctrl.signal;
  return Promise.resolve()
    .then(() => fetchFn(url, next))
    .finally(() => clearTimeout(timer));
}

/**
 * Public room document. One entry per code, no key.
 * GET 404 means the room does not exist yet.
 * cache: "no-store" so Safari does not reuse a stale card.
 */
export function createStoreMailbox(opts) {
  const root = String((opts && opts.base) || FAIRWAY_ROOM_STORE).replace(/\/$/, "");
  const fetchFn = (opts && opts.fetchImpl) || globalThis.fetch;
  async function write(code, doc) {
    return fetchWithTimeout(fetchFn, storeRoomUrl(root, code), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(doc)
    }, opts && opts.timeoutMs);
  }
  return {
    transport: "http",
    async get(code) {
      const res = await fetchWithTimeout(fetchFn, storeRoomUrl(root, code), {
        method: "GET",
        cache: "no-store"
      }, opts && opts.timeoutMs);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("http " + res.status);
      const doc = await res.json();
      if (!doc || typeof doc !== "object" || !doc.code) return null;
      return sanitizeRoom(doc);
    },
    async put(code, doc) {
      let res = await write(code, doc);
      if (res.status === 413 && doc && Array.isArray(doc.signals) && doc.signals.length) {
        const slim = Object.assign({}, doc, { signals: [] });
        res = await write(code, slim);
      }
      if (!res.ok && res.status !== 201 && res.status !== 204) throw new Error("http " + res.status);
    },
    subscribe() { return function () {}; },
    close() {}
  };
}

export function createHttpMailbox(opts) {
  const root = String(opts.base || "").replace(/\/$/, "");
  const fetchFn = opts.fetchImpl || globalThis.fetch;
  return {
    transport: "http",
    async get(code) {
      const res = await fetchFn(root + "/" + encodeURIComponent(code), { method: "GET" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("http " + res.status);
      const doc = await res.json();
      return sanitizeRoom(doc);
    },
    async put(code, doc) {
      const res = await fetchFn(root + "/" + encodeURIComponent(code), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc)
      });
      if (!res.ok && res.status !== 201 && res.status !== 204) throw new Error("http " + res.status);
    },
    subscribe() { return function () {}; },
    close() {}
  };
}

export function createRoomMailbox(opts) {
  const o = opts || {};
  const explicit = o.httpBase != null ? o.httpBase : FAIRWAY_ROOM_HTTP;
  if (explicit) return createHttpMailbox(Object.assign({}, o, { base: explicit }));
  const store = o.storeBase != null ? o.storeBase : FAIRWAY_ROOM_STORE;
  if (!store) return createMqttMailbox(o);
  const httpBox = createStoreMailbox(Object.assign({}, o, { base: store }));
  const mirror = o.mirrorMqtt === false ? null : createMqttMailbox(o);
  function poke(code) {
    if (!mirror || !mirror.put) return;
    const job = mirror.put(code, { wake: 1 });
    if (job && job.catch) job.catch(() => {});
  }
  return {
    transport: "http",
    async get(code) {
      poke(code);
      return httpBox.get(code);
    },
    async put(code, doc) {
      await httpBox.put(code, doc);
      poke(code);
    },
    subscribe(fn) {
      if (!mirror || !mirror.subscribe) return function () {};
      return mirror.subscribe(function () { fn(); });
    },
    close() {
      httpBox.close();
      if (mirror) mirror.close();
    }
  };
}
