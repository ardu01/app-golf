import assert from "assert";
import { readFileSync } from "fs";
import {
  ackPending,
  adoptSyncResult,
  applyFieldsToPlayers,
  clampSharedHcp,
  createMemoryMailbox,
  diffPlayers,
  loadShared,
  makeCode,
  makeDeviceId,
  mayDetachShared,
  mergeFields,
  normalizeCode,
  noteLocalDeltas,
  queueDeltas,
  sanitizeValue,
  sharedPlayingHcp,
  sharedStatus,
  mergeRoomPlayers,
  stampExisting,
  syncShared,
  CODE_ALPHABET
} from "../fairway/js/shared-round.js";
import { createMqttMailbox, createRoomMailbox, encodePublish, parsePublish } from "../fairway/js/shared-mail.js";
import { pickPeer } from "../fairway/js/shared-rtc.js";
import { APP_VERSION, BACKUP_SCHEMA, SHARED_KEY } from "../fairway/js/keys.js";

function player(id, scores, extra) {
  return Object.assign({
    id: id,
    name: id,
    scores: Object.assign({}, scores || {}),
    putts: {},
    fir: {},
    gir: {},
    ball: "",
    withdrawn: false
  }, extra || {});
}

function session(deviceId, code, role) {
  const shared = loadShared(null, deviceId);
  shared.code = code || "";
  shared.role = role || "";
  shared.createdBy = role === "host" ? deviceId : "dHOST0001";
  shared.joinedForeign = role === "join";
  return shared;
}

assert.strictEqual(BACKUP_SCHEMA, 3);
assert.strictEqual(APP_VERSION, "5.1.1");
assert.strictEqual(SHARED_KEY, "fairway.sharedRound.v1");
assert.strictEqual(normalizeCode("k7nq4p"), "K7NQ4P");
assert.strictEqual(normalizeCode("K7NQ4O"), "");
assert.strictEqual(normalizeCode("K7N"), "");
assert.strictEqual(sanitizeValue("scores", 99), undefined);
assert.strictEqual(sanitizeValue("scores", 4), 4);
assert.strictEqual(sanitizeValue("ball", "<b>Pro V1</b>"), "bPro V1/b");

const queued = queueDeltas(
  [{ playerId: "p1", hole: 3, field: "scores", value: 4, at: 100, by: "d1" }],
  [{ playerId: "p1", hole: 3, field: "scores", value: 5, at: 120, by: "d1" }]
);
assert.strictEqual(queued.length, 1);
assert.strictEqual(queued[0].value, 5);

const merged = mergeFields(
  { "p1|3|scores": { v: 5, at: 100, by: "a" } },
  { "p1|3|scores": { v: 6, at: 100, by: "b" }, "p1|4|scores": { v: 4, at: 90, by: "b" } }
);
assert.strictEqual(merged["p1|3|scores"].v, 6);
assert.strictEqual(merged["p1|4|scores"].v, 4);

const kept = applyFieldsToPlayers(
  [player("p1", { 3: 5, 4: 6 })],
  { "p1|3|scores": { v: 4, at: 90, by: "b" } },
  { "p1|3|scores": 100, "p1|4|scores": 100 }
);
assert.strictEqual(kept.players[0].scores[3], 5);
assert.strictEqual(kept.players[0].scores[4], 6);
assert.strictEqual(kept.changed, false);

const newer = applyFieldsToPlayers(
  [player("p1", { 3: 5 })],
  { "p1|3|scores": { v: 6, at: 200, by: "b" }, "p1|1|scores": { v: 4, at: 50, by: "b" } },
  { "p1|3|scores": 100 }
);
assert.strictEqual(newer.players[0].scores[3], 6);
assert.strictEqual(newer.players[0].scores[1], 4);

const hostile = applyFieldsToPlayers(
  [player("p1", { 2: 4 }, { ball: "Titleist" })],
  { "p1|2|scores": { v: 99, at: 999, by: "b" }, "p1||ball": { v: "<script>", at: 999, by: "b" } },
  { "p1|2|scores": 10, "p1||ball": 10 }
);
assert.strictEqual(hostile.players[0].scores[2], 4);
assert.ok(!String(hostile.players[0].ball).includes("<"));

const wiped = diffPlayers(
  [player("p1", { 5: 4 })],
  [player("p1", {})],
  300,
  "d1"
);
assert.strictEqual(wiped.length, 0);

const noted = session("dLOCAL000", "K7NQ4P", "host");
noteLocalDeltas(noted, [player("p1", {})], [player("p1", { 7: 5 })], 400);
assert.strictEqual(noted.pending.length, 1);
assert.strictEqual(noted.stamps["p1|7|scores"], 400);

const still = ackPending(noted.pending, {});
assert.strictEqual(still.length, 1);
const acked = ackPending(noted.pending, { "p1|7|scores": { v: 5, at: 400, by: "dLOCAL000" } });
assert.strictEqual(acked.length, 0);

assert.strictEqual(sharedStatus(session("d1"), false).label, "sin compartir");
const pending = session("d1", "K7NQ4P", "join");
pending.pending = noted.pending.slice();
assert.strictEqual(sharedStatus(pending, false).label, "sin conexión");
assert.strictEqual(sharedStatus(pending, true).id, "pending");
assert.strictEqual(sharedStatus(pending, true).label, "cambios pendientes");

const box = createMemoryMailbox();
const host = session("dHOST0001", "K7NQ4P", "host");
host.createdBy = "dHOST0001";
const hostPlayers = [player("p1", { 1: 4, 2: 6 })];
host.stamps = stampExisting(hostPlayers, {}, 100).stamps;
host.pending = [
  { playerId: "p1", hole: 1, field: "scores", value: 4, at: 100, by: host.deviceId },
  { playerId: "p1", hole: 2, field: "scores", value: 6, at: 150, by: host.deviceId }
];
const meta = { courseId: "la-herreria", club: "La Herrería", tee: "Amarillas", holes: 18, players: hostPlayers };

const offline = await syncShared({
  shared: host,
  players: hostPlayers,
  mailbox: box,
  online: false,
  now: 160,
  meta: meta
});
assert.strictEqual(offline.players[0].scores[1], 4);
assert.strictEqual(offline.shared.pending.length, 2);
assert.strictEqual(box.rooms.size, 0);

const up = await syncShared({
  shared: host,
  players: hostPlayers,
  mailbox: box,
  online: true,
  now: 160,
  meta: meta,
  transport: "mqtt"
});
assert.strictEqual(up.shared.pending.length, 0);
assert.strictEqual(up.shared.status, "synced");
assert.strictEqual(up.players[0].scores[2], 6);

const guest = session("dGUEST000", "K7NQ4P", "join");
guest.createdBy = "dHOST0001";
const guestPlayers = [player("p1", { 3: 5 })];
guest.stamps = stampExisting(guestPlayers, {}, 180).stamps;
guest.pending = [{ playerId: "p1", hole: 3, field: "scores", value: 5, at: 180, by: guest.deviceId }];
const joined = await syncShared({
  shared: guest,
  players: guestPlayers,
  mailbox: box,
  online: true,
  now: 180,
  meta: meta,
  transport: "mqtt"
});
assert.strictEqual(joined.players[0].scores[1], 4);
assert.strictEqual(joined.players[0].scores[2], 6);
assert.strictEqual(joined.players[0].scores[3], 5);
assert.strictEqual(joined.shared.pending.length, 0);

const back = await syncShared({
  shared: up.shared,
  players: up.players,
  mailbox: box,
  online: true,
  now: 190,
  meta: meta
});
assert.strictEqual(back.players[0].scores[1], 4);
assert.strictEqual(back.players[0].scores[3], 5);
assert.strictEqual(back.players[0].scores[2], 6);

const raceBox = createMemoryMailbox();
const a = session(makeDeviceId(() => 0.1), "K7NQ4P", "host");
a.createdBy = a.deviceId;
const aPlayers = [player("p1", { 9: 3 })];
a.stamps = { "p1|9|scores": 300 };
a.pending = [{ playerId: "p1", hole: 9, field: "scores", value: 3, at: 300, by: a.deviceId }];
await syncShared({ shared: a, players: aPlayers, mailbox: raceBox, online: true, now: 300, meta: meta });
const b = session(makeDeviceId(() => 0.2), "K7NQ4P", "join");
b.createdBy = a.deviceId;
const bPlayers = [player("p1", { 9: 4 })];
b.stamps = { "p1|9|scores": 250 };
b.pending = [{ playerId: "p1", hole: 9, field: "scores", value: 4, at: 250, by: b.deviceId }];
const bSync = await syncShared({ shared: b, players: bPlayers, mailbox: raceBox, online: true, now: 260, meta: meta });
assert.strictEqual(bSync.players[0].scores[9], 3);

const stale = session("dGUEST000", "K7NQ4P", "join");
stale.createdBy = "dHOST0001";
const stalePlayers = [player("p1", { 8: 5 })];
stale.stamps = stampExisting(stalePlayers, {}, 500).stamps;
const olderRemote = createMemoryMailbox();
olderRemote.rooms.set("K7NQ4P", {
  v: 1,
  code: "K7NQ4P",
  createdBy: "dHOST0001",
  updatedAt: 100,
  updatedBy: "dHOST0001",
  meta: { courseId: "la-herreria", holes: 18, players: [{ id: "p1", name: "p1" }] },
  fields: { "p1|8|scores": { v: 4, at: 100, by: "dHOST0001" } },
  presence: {},
  signals: []
});
const keptLocal = await syncShared({
  shared: stale,
  players: stalePlayers,
  mailbox: olderRemote,
  online: true,
  now: 500,
  meta: meta
});
assert.strictEqual(keptLocal.players[0].scores[8], 5);

assert.strictEqual(pickPeer("d1", { d1: { at: 100 }, d2: { at: 90 }, d3: { at: 10 } }, 100), "d2");
assert.strictEqual(pickPeer("d1", { d2: { at: 10 } }, 30000), "");

const published = encodePublish("fairway/v1/room/K7NQ4P", "{\"ok\":1}", true);
const parsed = parsePublish(published);
assert.strictEqual(parsed.topic, "fairway/v1/room/K7NQ4P");
assert.strictEqual(parsed.retain, true);
assert.strictEqual(parsed.payload, "{\"ok\":1}");

class FakeWS {
  constructor() {
    this.readyState = 0;
    this.sent = [];
    queueMicrotask(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    });
  }
  send(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    this.sent.push(bytes);
    const type = bytes[0] >> 4;
    if (type === 1) this.onmessage({ data: new Uint8Array([0x20, 0x02, 0x00, 0x00]).buffer });
    if (type === 8) {
      this.onmessage({ data: new Uint8Array([0x90, 0x03, 0x00, 0x01, 0x00]).buffer });
      const room = {
        v: 1,
        code: "K7NQ4P",
        createdBy: "dOTHER000",
        updatedAt: 10,
        updatedBy: "dOTHER000",
        meta: { courseId: "la-herreria", holes: 18, players: [] },
        fields: { "p1|1|scores": { v: 4, at: 10, by: "dOTHER000" } },
        presence: {},
        signals: []
      };
      const packet = encodePublish("fairway/v1/room/K7NQ4P", JSON.stringify(room), true);
      this.onmessage({ data: packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength) });
    }
  }
  close() { this.readyState = 3; }
}

const mqtt = createMqttMailbox({ WebSocket: FakeWS, retainWaitMs: 30, url: "wss://example.test/mqtt", clientId: "fwtest" });
const remote = await mqtt.get("K7NQ4P");
assert.ok(remote);
assert.strictEqual(remote.fields["p1|1|scores"].v, 4);
mqtt.close();

const split = createMemoryMailbox();
const hostOnly = player("pHost", { 1: 4 }, { name: "Ana" });
const guestOnly = player("pGuest", { 2: 5 }, { name: "Luis" });
const splitMeta = { courseId: "la-herreria", club: "La Herrería", tee: "Amarillas", holes: 18 };
const hostSplit = session("dHOST0001", "K7NQ4P", "host");
hostSplit.createdBy = "dHOST0001";
hostSplit.stamps = { "pHost|1|scores": 100 };
hostSplit.pending = [{ playerId: "pHost", hole: 1, field: "scores", value: 4, at: 100, by: "dHOST0001" }];
await syncShared({
  shared: hostSplit,
  players: [hostOnly],
  mailbox: split,
  online: true,
  now: 100,
  meta: Object.assign({}, splitMeta, { players: [hostOnly] })
});
const guestSplit = session("dGUEST009", "K7NQ4P", "join");
guestSplit.createdBy = "dHOST0001";
guestSplit.stamps = { "pGuest|2|scores": 200 };
guestSplit.pending = [{ playerId: "pGuest", hole: 2, field: "scores", value: 5, at: 200, by: "dGUEST009" }];
const guestSplitSync = await syncShared({
  shared: guestSplit,
  players: [guestOnly],
  mailbox: split,
  online: true,
  now: 200,
  meta: Object.assign({}, splitMeta, { players: [guestOnly] })
});
const splitRoom = await split.get("K7NQ4P");
assert.strictEqual(splitRoom.fields["pHost|1|scores"].v, 4);
assert.strictEqual(splitRoom.fields["pGuest|2|scores"].v, 5);
assert.ok(splitRoom.meta.players.some((p) => p.id === "pHost"));
assert.ok(splitRoom.meta.players.some((p) => p.id === "pGuest"));
const guestCard = applyFieldsToPlayers(
  mergeRoomPlayers([guestOnly], splitRoom.meta.players),
  splitRoom.fields,
  guestSplitSync.shared.stamps
);
assert.strictEqual(guestCard.players.find((p) => p.id === "pHost").scores[1], 4);
assert.strictEqual(guestCard.players.find((p) => p.id === "pGuest").scores[2], 5);
await syncShared({
  shared: hostSplit,
  players: [hostOnly],
  mailbox: split,
  online: true,
  now: 210,
  meta: Object.assign({}, splitMeta, { players: [hostOnly] })
});
const splitAgain = await split.get("K7NQ4P");
assert.strictEqual(splitAgain.fields["pHost|1|scores"].v, 4);
assert.strictEqual(splitAgain.fields["pGuest|2|scores"].v, 5);
const hostCard = applyFieldsToPlayers(
  mergeRoomPlayers([hostOnly], splitAgain.meta.players),
  splitAgain.fields,
  {}
);
assert.strictEqual(hostCard.players.find((p) => p.id === "pHost").scores[1], 4);
assert.strictEqual(hostCard.players.find((p) => p.id === "pGuest").scores[2], 5);
const emptyJoin = applyFieldsToPlayers(mergeRoomPlayers([], splitAgain.meta.players), splitAgain.fields, {});
assert.strictEqual(emptyJoin.players.find((p) => p.id === "pHost").name, "Ana");
assert.strictEqual(emptyJoin.players.find((p) => p.id === "pHost").scores[1], 4);
assert.strictEqual(emptyJoin.players.find((p) => p.id === "pGuest").scores[2], 5);

const savedDocs = new Map();
const fetchImpl = async (url, opts) => {
  const method = (opts && opts.method) || "GET";
  if (method === "POST") {
    savedDocs.set(String(url), opts.body);
    return { ok: true, status: 200, json: async () => ({ success: true, path: "card" }) };
  }
  if (!savedDocs.has(String(url))) {
    return { ok: false, status: 404, json: async () => ({ error: "missing" }) };
  }
  return { ok: true, status: 200, json: async () => JSON.parse(savedDocs.get(String(url))) };
};
const store = createRoomMailbox({
  storeBase: "https://mantledb.sh/v2",
  fetchImpl: fetchImpl,
  mirrorMqtt: false
});
const storeHost = session("dHOST0001", "K7NQ4P", "host");
storeHost.createdBy = "dHOST0001";
const storePlayers = [player("p1", { 3: 4 }, { name: "Ana" })];
storeHost.stamps = { "p1|3|scores": 300 };
storeHost.pending = [{ playerId: "p1", hole: 3, field: "scores", value: 4, at: 300, by: "dHOST0001" }];
await syncShared({
  shared: storeHost,
  players: storePlayers,
  mailbox: store,
  online: true,
  now: 300,
  meta: Object.assign({}, splitMeta, { players: storePlayers }),
  transport: "http"
});
const storeUrl = "https://mantledb.sh/v2/K7NQ4P/card";
assert.ok(savedDocs.has(storeUrl));
const storeGuest = session("dGUEST009", "K7NQ4P", "join");
storeGuest.createdBy = "dHOST0001";
const storeGuestPlayers = [player("p9", { 4: 6 }, { name: "Luis" })];
storeGuest.stamps = { "p9|4|scores": 310 };
storeGuest.pending = [{ playerId: "p9", hole: 4, field: "scores", value: 6, at: 310, by: "dGUEST009" }];
const storeJoined = await syncShared({
  shared: storeGuest,
  players: storeGuestPlayers,
  mailbox: store,
  online: true,
  now: 310,
  meta: Object.assign({}, splitMeta, { players: storeGuestPlayers }),
  transport: "http"
});
const storeDoc = await store.get("K7NQ4P");
assert.strictEqual(storeDoc.fields["p1|3|scores"].v, 4);
assert.strictEqual(storeDoc.fields["p9|4|scores"].v, 6);
const storeCard = applyFieldsToPlayers(
  mergeRoomPlayers(storeGuestPlayers, storeDoc.meta.players),
  storeDoc.fields,
  storeJoined.shared.stamps
);
assert.strictEqual(storeCard.players.find((p) => p.id === "p1").scores[3], 4);
assert.strictEqual(storeCard.players.find((p) => p.id === "p9").scores[4], 6);
const backToHost = await syncShared({
  shared: storeHost,
  players: storePlayers,
  mailbox: store,
  online: true,
  now: 320,
  meta: Object.assign({}, splitMeta, { players: storePlayers })
});
const storeDoc2 = await store.get("K7NQ4P");
assert.strictEqual(storeDoc2.fields["p9|4|scores"].v, 6);
const hostSeesGuest = applyFieldsToPlayers(
  mergeRoomPlayers(backToHost.players, storeDoc2.meta.players),
  storeDoc2.fields,
  backToHost.shared.stamps
);
assert.strictEqual(hostSeesGuest.players.find((p) => p.id === "p1").scores[3], 4);
assert.strictEqual(hostSeesGuest.players.find((p) => p.id === "p9").scores[4], 6);
store.close();

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../fairway/css/fairway.css", import.meta.url), "utf8");
const boot = readFileSync(new URL("../fairway/js/shared-boot.js", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert.ok(boot.includes("Partida compartida"));
const roundSrc = readFileSync(new URL("../fairway/js/shared-round.js", import.meta.url), "utf8");
assert.ok(roundSrc.includes("sin conexión"));
assert.ok(roundSrc.includes("crypto.getRandomValues"));
assert.ok(!roundSrc.includes("Math.random"));
assert.ok(boot.includes("adoptSyncResult"));
assert.ok(boot.includes("mayDetachShared"));
assert.ok(boot.includes("sharedPlayingHcp"));
assert.ok(!boot.includes("function ingest"));
assert.ok(!boot.includes("fallbackMailbox"));
assert.ok(!boot.includes("Vía "));
assert.ok(!boot.includes("Drive"));
assert.ok(!boot.includes("MQTT"));
assert.ok(!boot.includes("IndexedDB"));
assert.ok(html.includes('id="sharedRoundHome"'));
assert.ok(readFileSync(new URL("../fairway/js/rounds.js", import.meta.url), "utf8").includes("fairwaySharedAfterPersist"));
assert.ok(html.includes("fairway/js/shared-boot.js"));
assert.ok(html.includes('aria-label="Versión">5.1.1</span>'));
assert.ok(html.includes('href="fairway/css/fairway.css"'));
assert.ok(css.includes("#screen-home .home-hero > #sharedRoundHome"));
assert.ok(/#screen-home \.home-hero > #sharedRoundHome \{\s*margin-top:\s*16px;/.test(css));
assert.ok(html.includes("version: 3"));
assert.ok(html.includes("function fairwayNavDecide"));
assert.ok(!html.includes("client_secret"));
assert.ok(!html.includes('id="holeBagBtn"'));
assert.ok(sw.includes('const SHELL = "fairway-v5-511"'));
assert.ok(sw.includes("fairway/js/shared-boot.js"));
const mailSrc = readFileSync(new URL("../fairway/js/shared-mail.js", import.meta.url), "utf8");
assert.ok(mailSrc.includes("wss://test.mosquitto.org:8081/mqtt"));
assert.ok(mailSrc.includes("https://mantledb.sh/v2"));
assert.ok(mailSrc.includes('cache: "no-store"'));
assert.ok(!mailSrc.includes("/claim"));
assert.ok(!mailSrc.includes("@"));
assert.ok(mailSrc.includes("{ wake: 1 }"));
assert.ok(!mailSrc.includes("mirror.put(code, doc)"));
assert.ok(readFileSync(new URL("../fairway/js/shared-boot.js", import.meta.url), "utf8").includes("ensureRemotePlayers"));

const rolled = makeCode();
assert.strictEqual(rolled.length, 6);
assert.ok(rolled.split("").every((ch) => CODE_ALPHABET.indexOf(ch) >= 0));
assert.strictEqual(makeCode(() => 0), CODE_ALPHABET[0].repeat(6));

const hostileStamp = applyFieldsToPlayers(
  [player("p1", { 3: 4 })],
  { "p1|3|scores": { v: 9, at: 1e15, by: "zzzzzzzz" } },
  { "p1|3|scores": 2 }
);
assert.strictEqual(hostileStamp.players[0].scores[3], 4);
const hostileMerge = mergeFields(
  { "p1|3|scores": { v: 4, at: 2, by: "phoneA" } },
  { "p1|3|scores": { v: 9, at: 1e15, by: "phoneB" } }
);
assert.strictEqual(hostileMerge["p1|3|scores"].v, 4);

const tieLeft = mergeFields(
  { "p1|3|scores": { v: 5, at: 100, by: "phoneA" } },
  { "p1|3|scores": { v: 6, at: 100, by: "phoneB" } }
);
const tieRight = mergeFields(
  { "p1|3|scores": { v: 6, at: 100, by: "phoneB" } },
  { "p1|3|scores": { v: 5, at: 100, by: "phoneA" } }
);
assert.strictEqual(tieLeft["p1|3|scores"].v, tieRight["p1|3|scores"].v);
assert.strictEqual(tieLeft["p1|3|scores"].v, 6);
const skewed = mergeFields(
  { "p1|3|scores": { v: 4, at: 5, by: "phoneA" } },
  { "p1|3|scores": { v: 8, at: Date.now() + 999999, by: "phoneB" } }
);
assert.strictEqual(skewed["p1|3|scores"].v, 4);

const unsequenced = applyFieldsToPlayers(
  [player("p1", { 3: 5 })],
  { "p1|3|scores": { v: 9, at: 50, by: "phoneB" } },
  {}
);
assert.strictEqual(unsequenced.players[0].scores[3], 5);

let seenHcp = null;
const playing = sharedPlayingHcp(1000, (p) => { seenHcp = p.hcp; return 40; });
assert.strictEqual(clampSharedHcp(1000), 54);
assert.strictEqual(clampSharedHcp(-40), -10);
assert.strictEqual(seenHcp, 54);
assert.strictEqual(playing.hcp, 54);
assert.strictEqual(playing.ph, 40);

const noStamp = session("dHOST0001", "K7NQ4P", "host");
noStamp.createdBy = "dHOST0001";
noStamp.stamps = { "p1|1|scores": 4 };
noStamp.pending = [{ playerId: "p1", hole: 1, field: "scores", value: 4, at: 4, by: "dHOST0001" }];
const noStampBox = createMemoryMailbox();
const noStampSync = await syncShared({
  shared: noStamp,
  players: [player("p1", { 1: 4, 2: 5 })],
  mailbox: noStampBox,
  online: true,
  now: Date.now(),
  meta: meta
});
assert.strictEqual(noStampSync.shared.stamps["p1|1|scores"], 4);
assert.ok(!noStampSync.shared.stamps["p1|2|scores"]);
assert.ok(!(await noStampBox.get("K7NQ4P")).fields["p1|2|scores"]);

const overlap = {
  nput: 0,
  room: null,
  async get() {
    if (this.nput === 1) throw new Error("readback");
    return this.room ? JSON.parse(JSON.stringify(this.room)) : null;
  },
  async put(code, doc) {
    this.nput++;
    const copy = JSON.parse(JSON.stringify(doc));
    if (this.nput === 1) {
      this.room = Object.assign({}, copy, { fields: {} });
      return;
    }
    this.room = copy;
  }
};
const overlapHost = session("dHOST0001", "K7NQ4P", "host");
overlapHost.createdBy = "dHOST0001";
overlapHost.stamps = { "p1|1|scores": 7 };
overlapHost.pending = [{ playerId: "p1", hole: 1, field: "scores", value: 4, at: 7, by: "dHOST0001", op: "dHOST0001-7" }];
const overlapSync = await syncShared({
  shared: overlapHost,
  players: [player("p1", { 1: 4 })],
  mailbox: overlap,
  online: true,
  now: 7,
  meta: meta
});
assert.strictEqual(overlapSync.shared.pending.length, 0);
assert.strictEqual(overlap.room.fields["p1|1|scores"].v, 4);

const leak = {
  async get() {
    return {
      v: 1,
      code: "K7NQ4P",
      createdBy: "dHOST0001",
      updatedAt: 1,
      updatedBy: "dOTHER999",
      meta: { holes: 18, players: [{ id: "p1", name: "p1" }] },
      fields: {},
      presence: {},
      signals: []
    };
  },
  async put() {}
};
const sealed = session("dHOST0001", "K7NQ4P", "host");
sealed.createdBy = "dHOST0001";
sealed.seal = true;
sealed.stamps = { "p1|4|scores": 8 };
sealed.pending = [{ playerId: "p1", hole: 4, field: "scores", value: 5, at: 8, by: "dHOST0001", op: "dHOST0001-8" }];
const sealedSync = await syncShared({
  shared: sealed,
  players: [player("p1", { 4: 5 })],
  mailbox: leak,
  online: true,
  now: 8,
  meta: meta
});
assert.strictEqual(sealedSync.shared.pending.length, 1);
assert.notStrictEqual(sealedSync.shared.status, "synced");
assert.strictEqual(mayDetachShared(sealedSync.shared), false);

const postFail = {
  async get() { return null; },
  async put() { throw new Error("http 500"); }
};
const failing = session("dHOST0001", "K7NQ4P", "host");
failing.createdBy = "dHOST0001";
failing.seal = true;
failing.leaving = true;
failing.pending = [{ playerId: "p1", hole: 6, field: "scores", value: 4, at: 6, by: "dHOST0001" }];
const failedPut = await syncShared({
  shared: failing,
  players: [player("p1", { 6: 4 })],
  mailbox: postFail,
  online: true,
  now: 6,
  meta: meta
});
assert.strictEqual(failedPut.shared.pending.length, 1);
assert.strictEqual(failedPut.http, false);
assert.strictEqual(failedPut.confirmed, false);
assert.strictEqual(mayDetachShared(failedPut.shared), false);

const driveBox = createMemoryMailbox();
driveBox.transport = "drive";
const driveHost = session("dHOST0001", "K7NQ4P", "host");
driveHost.createdBy = "dHOST0001";
driveHost.pending = [{ playerId: "p1", hole: 1, field: "scores", value: 4, at: 4, by: "dHOST0001" }];
const driveSync = await syncShared({
  shared: driveHost,
  players: [player("p1", { 1: 4 })],
  mailbox: driveBox,
  online: true,
  now: 4,
  meta: meta,
  transport: "drive"
});
assert.strictEqual(driveSync.http, false);
assert.strictEqual(driveSync.confirmed, false);
assert.notStrictEqual(driveSync.shared.status, "synced");
assert.strictEqual(driveSync.shared.pending.length, 1);
assert.strictEqual(driveBox.rooms.size, 0);

const mqttBox = createMemoryMailbox();
mqttBox.transport = "mqtt";
const mqttSync = await syncShared({
  shared: driveHost,
  players: [player("p1", { 1: 4 })],
  mailbox: mqttBox,
  online: true,
  now: 4,
  meta: meta
});
assert.strictEqual(mqttSync.http, false);
assert.strictEqual(mqttBox.rooms.size, 0);

const live = session("dHOST0001", "K7NQ4P", "host");
live.seq = 11;
live.stamps = { "p1|1|scores": 10, "p1|2|scores": 11 };
live.marks = {
  "p1|1|scores": { by: "dHOST0001", op: "dHOST0001-10" },
  "p1|2|scores": { by: "dHOST0001", op: "dHOST0001-11" }
};
live.pending = [
  { playerId: "p1", hole: 1, field: "scores", value: 4, at: 10, by: "dHOST0001", op: "dHOST0001-10" },
  { playerId: "p1", hole: 2, field: "scores", value: 5, at: 11, by: "dHOST0001", op: "dHOST0001-11" }
];
const snap = loadShared(JSON.parse(JSON.stringify(live)), live.deviceId);
snap.pending = snap.pending.filter((d) => d.op === "dHOST0001-10");
snap.seq = 10;
snap.status = "synced";
const adopted = adoptSyncResult(live, {
  shared: snap,
  confirmedOps: ["dHOST0001-10"],
  http: true,
  confirmed: true
});
assert.strictEqual(adopted.pending.length, 1);
assert.strictEqual(adopted.pending[0].value, 5);
assert.strictEqual(adopted.stamps["p1|2|scores"], 11);
assert.strictEqual(adopted.status, "pending");
assert.strictEqual(mayDetachShared(Object.assign({}, adopted, { seal: true })), false);
const during = applyFieldsToPlayers(
  [player("p1", { 1: 4, 2: 5 })],
  { "p1|2|scores": { v: 3, at: 9, by: "dOTHER999" } },
  adopted.stamps
);
assert.strictEqual(during.players[0].scores[2], 5);

const hostileRoom = createMemoryMailbox();
hostileRoom.rooms.set("K7NQ4P", {
  v: 1,
  code: "K7NQ4P",
  createdBy: "dHOST0001",
  updatedAt: 10,
  updatedBy: "dBAD99999",
  meta: { holes: 18, players: [{ id: "p1", name: "p1" }] },
  fields: { "p1|3|scores": { v: 4, at: 1e15, by: "dBAD99999" } },
  presence: {},
  signals: []
});
const honest = session("dHONEST01", "K7NQ4P", "join");
honest.createdBy = "dHOST0001";
honest.stamps = { "p1|3|scores": 3 };
honest.pending = [{ playerId: "p1", hole: 3, field: "scores", value: 5, at: 3, by: "dHONEST01" }];
const honestSync = await syncShared({
  shared: honest,
  players: [player("p1", { 3: 5 })],
  mailbox: hostileRoom,
  online: true,
  now: 50,
  meta: meta
});
assert.strictEqual(honestSync.players[0].scores[3], 5);
assert.strictEqual((await hostileRoom.get("K7NQ4P")).fields["p1|3|scores"].v, 5);
assert.ok((await hostileRoom.get("K7NQ4P")).fields["p1|3|scores"].at < 1000);

function lwwMailbox(delayMs) {
  let room = null;
  return {
    async get() {
      return room ? JSON.parse(JSON.stringify(room)) : null;
    },
    async put(code, doc) {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      room = JSON.parse(JSON.stringify(doc));
    }
  };
}

const two = lwwMailbox(0);
let phoneA = session("dHOST0001", "K7NQ4P", "host");
phoneA.createdBy = "dHOST0001";
let phoneB = session("dGUEST009", "K7NQ4P", "join");
phoneB.createdBy = "dHOST0001";
let cardA = [player("p1", { 1: 4 })];
let cardB = [player("p1", { 2: 5 })];
noteLocalDeltas(phoneA, [player("p1", {})], cardA, 0);
noteLocalDeltas(phoneB, [player("p1", {})], cardB, 0);
const raced = await Promise.all([
  syncShared({ shared: phoneA, players: cardA, mailbox: two, online: true, now: 30, meta: meta }),
  syncShared({ shared: phoneB, players: cardB, mailbox: two, online: true, now: 30, meta: meta })
]);
phoneA = raced[0].shared;
phoneB = raced[1].shared;
cardA = raced[0].players;
cardB = raced[1].players;
assert.strictEqual(cardA[0].scores[1], 4);
assert.strictEqual(cardB[0].scores[2], 5);
const racedRoom = await two.get("K7NQ4P");
assert.strictEqual(racedRoom.fields["p1|1|scores"].v, 4);
assert.strictEqual(racedRoom.fields["p1|2|scores"].v, 5);
const learnA = await syncShared({ shared: phoneA, players: cardA, mailbox: two, online: true, now: 31, meta: meta });
const learnB = await syncShared({ shared: phoneB, players: cardB, mailbox: two, online: true, now: 32, meta: meta });
assert.strictEqual(learnA.players[0].scores[1], 4);
assert.strictEqual(learnA.players[0].scores[2], 5);
assert.strictEqual(learnB.players[0].scores[1], 4);
assert.strictEqual(learnB.players[0].scores[2], 5);
assert.strictEqual((await two.get("K7NQ4P")).fields["p1|1|scores"].v, 4);
assert.strictEqual((await two.get("K7NQ4P")).fields["p1|2|scores"].v, 5);

const late = lwwMailbox(25);
let lateA = session("dHOST0001", "K7NQ4P", "host");
lateA.createdBy = "dHOST0001";
let lateB = session("dGUEST009", "K7NQ4P", "join");
lateB.createdBy = "dHOST0001";
let lateCardA = [player("p1", { 6: 4 })];
let lateCardB = [player("p1", { 7: 5 })];
noteLocalDeltas(lateA, [player("p1", {})], lateCardA, 0);
noteLocalDeltas(lateB, [player("p1", {})], lateCardB, 0);
for (let n = 0; n < 2; n++) {
  const pair = await Promise.all([
    syncShared({ shared: lateA, players: lateCardA, mailbox: late, online: true, now: 40 + n, meta: meta }),
    syncShared({ shared: lateB, players: lateCardB, mailbox: late, online: true, now: 40 + n, meta: meta })
  ]);
  lateA = pair[0].shared;
  lateB = pair[1].shared;
  lateCardA = pair[0].players;
  lateCardB = pair[1].players;
  assert.strictEqual(lateCardA[0].scores[6], 4);
  assert.strictEqual(lateCardB[0].scores[7], 5);
}
const lateRoom = await late.get("K7NQ4P");
assert.strictEqual(lateRoom.fields["p1|6|scores"].v, 4);
assert.strictEqual(lateRoom.fields["p1|7|scores"].v, 5);
const lateA2 = await syncShared({ shared: lateA, players: lateCardA, mailbox: late, online: true, now: 70, meta: meta });
const lateB2 = await syncShared({ shared: lateB, players: lateCardB, mailbox: late, online: true, now: 71, meta: meta });
assert.strictEqual(lateA2.players[0].scores[6], 4);
assert.strictEqual(lateA2.players[0].scores[7], 5);
assert.strictEqual(lateB2.players[0].scores[6], 4);
assert.strictEqual(lateB2.players[0].scores[7], 5);

const offCard = [player("p1", { 1: 4 })];
const off = session("dHOST0001", "K7NQ4P", "host");
off.createdBy = "dHOST0001";
noteLocalDeltas(off, [player("p1", {})], offCard, 0);
offCard[0].scores[2] = 5;
noteLocalDeltas(off, [player("p1", { 1: 4 })], offCard, 0);
const offBox = createMemoryMailbox();
const offSync = await syncShared({
  shared: off,
  players: offCard,
  mailbox: offBox,
  online: false,
  now: 80,
  meta: meta
});
assert.strictEqual(offSync.shared.status, "offline");
assert.strictEqual(offSync.players[0].scores[1], 4);
assert.strictEqual(offSync.players[0].scores[2], 5);
assert.strictEqual(offSync.shared.pending.length, 2);
assert.strictEqual(offBox.rooms.size, 0);
offCard[0].scores[3] = 6;
noteLocalDeltas(offSync.shared, [player("p1", { 1: 4, 2: 5 })], offCard, 0);
assert.strictEqual(offCard[0].scores[3], 6);
assert.strictEqual(offSync.shared.pending.length, 3);

const absentBox = createMemoryMailbox();
absentBox.rooms.set("K7NQ4P", {
  v: 1,
  code: "K7NQ4P",
  createdBy: "dHOST0001",
  updatedAt: 10,
  updatedBy: "dOTHER999",
  meta: { holes: 18, players: [{ id: "p1", name: "p1" }] },
  fields: { "p1|1|scores": { v: 4, at: 3, seq: 3, by: "dOTHER999", op: "dOTHER999-3" } },
  presence: {},
  signals: []
});
const absent = session("dHOST0001", "K7NQ4P", "host");
absent.createdBy = "dHOST0001";
absent.seq = 9;
absent.stamps = { "p1|4|scores": 9, "p1|5|scores": 8 };
absent.marks = {
  "p1|4|scores": { by: "dHOST0001", op: "dHOST0001-9" },
  "p1|5|scores": { by: "dHOST0001", op: "dHOST0001-8" }
};
absent.pending = [{ playerId: "p1", hole: 4, field: "scores", value: 6, at: 9, by: "dHOST0001", op: "dHOST0001-9" }];
const absentPlayers = [player("p1", { 4: 6, 5: 3 })];
const absentSync = await syncShared({
  shared: absent,
  players: absentPlayers,
  mailbox: absentBox,
  online: true,
  now: 90,
  meta: meta
});
assert.strictEqual(absentSync.players[0].scores[5], 3);
assert.strictEqual(absentSync.players[0].scores[4], 6);
assert.strictEqual(absentSync.players[0].scores[1], 4);
const absentRoom = await absentBox.get("K7NQ4P");
assert.strictEqual(absentRoom.fields["p1|5|scores"].v, 3);
assert.strictEqual(absentRoom.fields["p1|4|scores"].v, 6);
assert.strictEqual(absentRoom.fields["p1|1|scores"].v, 4);
const absentOnly = applyFieldsToPlayers(
  [player("p1", { 4: 6, 5: 3 })],
  { "p1|1|scores": { v: 4, at: 3, by: "dOTHER999" } },
  { "p1|4|scores": 9, "p1|5|scores": 8 }
);
assert.strictEqual(absentOnly.players[0].scores[5], 3);
assert.strictEqual(absentOnly.players[0].scores[4], 6);

const lampBox = createMemoryMailbox();
const lampA = session("dAAAAAAA1", "K7NQ4P", "host");
lampA.createdBy = "dAAAAAAA1";
lampA.seq = 4;
lampA.stamps = { "p1|3|scores": 4 };
lampA.marks = { "p1|3|scores": { by: "dAAAAAAA1", op: "dAAAAAAA1-4" } };
lampA.pending = [{ playerId: "p1", hole: 3, field: "scores", value: 4, at: 4, by: "dAAAAAAA1", op: "dAAAAAAA1-4" }];
await syncShared({
  shared: lampA,
  players: [player("p1", { 3: 4 })],
  mailbox: lampBox,
  online: true,
  now: 40,
  meta: meta
});
const lampB = session("dBBBBBBB2", "K7NQ4P", "join");
lampB.createdBy = "dAAAAAAA1";
const seen = await syncShared({
  shared: lampB,
  players: [player("p1", {})],
  mailbox: lampBox,
  online: true,
  now: 50,
  meta: meta
});
assert.strictEqual(seen.players[0].scores[3], 4);
assert.ok(seen.shared.seq >= 4);
const lampNext = [player("p1", { 3: 6 })];
noteLocalDeltas(seen.shared, seen.players, lampNext, 0);
assert.ok(seen.shared.stamps["p1|3|scores"] > 4);
const lampWon = await syncShared({
  shared: seen.shared,
  players: lampNext,
  mailbox: lampBox,
  online: true,
  now: 60,
  meta: meta
});
assert.strictEqual(lampWon.players[0].scores[3], 6);
assert.strictEqual((await lampBox.get("K7NQ4P")).fields["p1|3|scores"].v, 6);

console.log("shared ok");
