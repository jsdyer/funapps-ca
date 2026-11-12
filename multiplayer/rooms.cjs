'use strict';

const { randomBytes, randomInt, randomUUID } = require('node:crypto');
const { startGame, applyGameAction, viewGame, playerLeft } = require('./room-games.cjs');

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_LIMIT = 200;
const PLAYER_LIMIT = 8;
const CHAT_LIMIT = 40;
const SEAT_GRACE_MS = 5 * 60_000;
const HOST_GRACE_MS = 45_000;
const CONVERSATION_CARDS = [
  'What local snack would you put in a Canadian care package?',
  'You have one free afternoon and a ferry ticket. Where would you go?',
  'What is the best small-town shop you have stumbled across?',
  'If your neighbourhood had a postcard, what would be on it?',
  'What belongs on the playlist for a long Canadian road trip?',
  'What is your favourite thing to do when the weather cancels your plans?',
  'Describe the ideal spot for a thermos and a bench.',
  'What is a local expression that people elsewhere might not know?',
  'What made you stop to take a photo on your last outing?',
  'Invent a name for a roadside diner that only opens after sunset.',
  'Which place is more fun to visit in the off-season?',
  'What is a good destination for a trip built around one meal?'
];

class RoomError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function cleanText(input, limit, label) {
  if (typeof input !== 'string') throw new RoomError(400, `Enter ${label}.`);
  const value = input.replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu, ' ').trim();
  if (!value || [...value].length > limit) {
    throw new RoomError(400, `Enter ${label} of 1–${limit} characters.`);
  }
  return value;
}

function createRooms() {
  const rooms = new Map();
  let entryWindow = 0;
  let entryCount = 0;

  function limitEntry() {
    const now = Date.now();
    if (now >= entryWindow) {
      entryWindow = now + 60_000;
      entryCount = 0;
    }
    if (++entryCount > 120) throw new RoomError(429, 'Too many room requests. Try again in a minute.');
  }

  function roomByCode(code) {
    const room = rooms.get(code);
    if (!room) throw new RoomError(404, 'That room is closed or the code is incorrect.');
    return room;
  }

  function seatByToken(room, token) {
    const seat = room.seats.get(token);
    if (!seat) throw new RoomError(401, 'Your seat has expired. Join the room again.');
    return seat;
  }

  function snapshot(room, viewer) {
    return {
      code: room.code,
      version: room.version,
      hostId: room.hostId,
      locked: room.locked,
      players: [...room.seats.values()].map(seat => ({
        id: seat.id,
        name: seat.name,
        connected: Boolean(seat.stream)
      })),
      messages: room.messages,
      prompt: room.prompt,
      game: room.game ? { ...viewGame(room.game, viewer.id), matchId: room.matchId } : null
    };
  }

  function send(seat, data) {
    const stream = seat.stream;
    if (!stream || stream.destroyed || stream.writableEnded) return;
    if (!stream.write(data)) stream.destroy();
  }

  function broadcast(room) {
    room.version++;
    for (const seat of room.seats.values()) {
      if (seat.stream) send(seat, `data: ${JSON.stringify(snapshot(room, seat))}\n\n`);
    }
  }

  function addSeat(room, name) {
    const id = randomUUID();
    const token = randomBytes(24).toString('base64url');
    room.seats.set(token, { id, name, stream: null, offlineSince: Date.now(), writes: [], lastChat: 0 });
    if (!room.hostId) room.hostId = id;
    broadcast(room);
    return { code: room.code, playerId: id, token };
  }

  function create(name) {
    limitEntry();
    const displayName = cleanText(name, 24, 'a display name');
    if (rooms.size >= ROOM_LIMIT) throw new RoomError(503, 'The clubhouse is full. Try again later.');
    let code;
    do {
      code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    } while (rooms.has(code));
    const room = {
      code, hostId: null, locked: false, version: 0,
      seats: new Map(), messages: [], prompt: null, unusedPrompts: [], game: null, matchId: null
    };
    rooms.set(code, room);
    return addSeat(room, displayName);
  }

  function join(code, name) {
    limitEntry();
    const room = roomByCode(code);
    if (room.locked) throw new RoomError(403, 'The host has paused new joins.');
    if (room.seats.size >= PLAYER_LIMIT) throw new RoomError(409, 'This room already has eight players.');
    const displayName = cleanText(name, 24, 'a display name');
    return addSeat(room, displayName);
  }

  function chooseHost(room, now) {
    const seats = [...room.seats.values()];
    const host = seats.find(seat => seat.id === room.hostId);
    const online = seats.find(seat => seat.stream);
    if (!host) {
      room.hostId = (online || seats[0])?.id ?? null;
      return true;
    }
    if (online && !host.stream && now - host.offlineSince >= HOST_GRACE_MS) {
      room.hostId = online.id;
      return true;
    }
    return false;
  }

  function removeSeat(room, token, seat) {
    room.seats.delete(token);
    if (seat.stream) {
      const stream = seat.stream;
      seat.stream = null;
      stream.end();
    }
    if (room.game) playerLeft(room.game, seat.id);
    chooseHost(room, Date.now());
    if (!room.seats.size) rooms.delete(room.code);
  }

  function connect(code, token, response) {
    const room = roomByCode(code);
    const seat = seatByToken(room, token);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    });
    response.flushHeaders();
    const previous = seat.stream;
    seat.stream = response;
    if (previous) previous.end('event: seat-replaced\ndata: {}\n\n');
    response.on('close', () => {
      if (seat.stream !== response) return;
      seat.stream = null;
      seat.offlineSince = Date.now();
      broadcast(room);
    });
    broadcast(room);
  }

  function action(code, token, data) {
    const room = roomByCode(code);
    const seat = seatByToken(room, token);
    const now = Date.now();
    seat.writes = seat.writes.filter(at => at > now - 10_000);
    if (seat.writes.length >= 30) throw new RoomError(429, 'Slow down for a few seconds.');
    seat.writes.push(now);

    const isHost = room.hostId === seat.id;
    if (['start', 'end', 'lock', 'kick', 'prompt'].includes(data.type) && !isHost) {
      throw new RoomError(403, 'Only the host can do that.');
    }

    switch (data.type) {
      case 'chat': {
        const message = cleanText(data.text, 240, 'a message');
        if (now - seat.lastChat < 900) throw new RoomError(429, 'Wait a moment before sending another message.');
        seat.lastChat = now;
        room.messages.push({ id: randomUUID(), playerId: seat.id, name: seat.name, text: message, at: new Date(now).toISOString() });
        if (room.messages.length > CHAT_LIMIT) room.messages.shift();
        break;
      }
      case 'start': {
        if (!['quiz', 'campfire'].includes(data.game)) throw new RoomError(400, 'Choose a game from the room.');
        if (room.game && viewGame(room.game, seat.id).phase !== 'finished') {
          throw new RoomError(409, 'Finish or end the current game first.');
        }
        const online = [...room.seats.values()].filter(item => item.stream && item !== seat);
        if (!seat.stream || !online.length) throw new RoomError(409, 'Two connected players are needed to start.');
        const playerIds = [seat.id, ...online.map(item => item.id)];
        room.game = startGame(data.game, data.game === 'campfire' ? playerIds.slice(0, 2) : playerIds);
        room.matchId = randomUUID();
        break;
      }
      case 'prompt': {
        if (!room.unusedPrompts.length) {
          room.unusedPrompts = CONVERSATION_CARDS.filter(prompt => prompt !== room.prompt);
        }
        const [prompt] = room.unusedPrompts.splice(randomInt(room.unusedPrompts.length), 1);
        room.prompt = prompt;
        break;
      }
      case 'lock':
        if (typeof data.locked !== 'boolean') throw new RoomError(400, 'Choose whether to allow new joins.');
        room.locked = data.locked;
        break;
      case 'kick': {
        const target = [...room.seats.entries()].find(([, item]) => item.id === data.playerId && item !== seat);
        if (!target) throw new RoomError(400, 'Choose another player in the room.');
        removeSeat(room, ...target);
        break;
      }
      case 'leave':
        removeSeat(room, token, seat);
        break;
      case 'end':
      case 'answer':
      case 'reveal':
      case 'next':
      case 'move':
        if (!room.game || data.matchId !== room.matchId) throw new RoomError(409, 'That game has changed. Try again.');
        if (data.type === 'end') {
          room.game = null;
          room.matchId = null;
        } else {
          try {
            applyGameAction(room.game, seat.id, data, isHost);
          } catch (error) {
            throw new RoomError(409, error.message);
          }
        }
        break;
      default:
        throw new RoomError(400, 'Unknown room action.');
    }

    broadcast(room);
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      let changed = false;
      for (const [token, seat] of room.seats) {
        if (!seat.stream && now - seat.offlineSince >= SEAT_GRACE_MS) {
          removeSeat(room, token, seat);
          changed = true;
        }
      }
      if (chooseHost(room, now) || changed) broadcast(room);
      for (const seat of room.seats.values()) send(seat, ': keepalive\n\n');
    }
  }, 15_000);
  timer.unref();

  return {
    create, join, connect, action,
    close() {
      clearInterval(timer);
      for (const room of rooms.values()) {
        for (const seat of room.seats.values()) {
          seat.stream?.end();
          seat.stream = null;
        }
      }
      rooms.clear();
    }
  };
}

module.exports = { createRooms, RoomError };
