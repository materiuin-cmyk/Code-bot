/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { MESSAGES_UPSERT } from '../../src/const.js';
import { eventNameIs, fromMe, midwareAnd, midwareOr } from '../../src/midware.js';
import pen from '../../src/pen.js';

const allowed = [
  'extendedTextMessage',
  'videoMessage',
  'imageMessage',
  'audioMessage',
  'protocolMessage',
  'senderKeyDistributionMessage'
]

let blockedUsers = [];

class Result {
  constructor({ suspect, reason, data }) {
    this.suspect = suspect;
    this.reason = reason;
    this.data = data;
  }
}

class HitGen {
  constructor(maxHit) {
    this.key = '';
    this.hits = 0;
    this.maxHit = maxHit;
  }

  isOverHit(key) {
    if (this.key === key) {
      this.hits++;
    } else {
      this.key = key;
      this.hits = 1;
    }
    return this.hits >= this.maxHit;
  }
}

const hitman = new HitGen(5);

/** @typedef {(c: import('../../src/context.js').Ctx) => Result | any} Detector */
/** @type {Detector[]} */
const listDetectors = [
  (c) => {
    return {
      suspect: c.isStatus && !allowed.includes(c.type) && c.type,
      reason: 'Status message with not allowed type',
      data: c,
    };
  },
  (c) => {
    return {
      suspect: c.mentionedJid?.length > 1024,
      reason: 'Too many mentioned jids',
      data: c.contextInfo,
    };
  },
  (c) => {
    const key = `${c.chat}|${c.sender}|${c.timestamp}`;
    return {
      suspect: c.isViewOnce && hitman.isOverHit(key),
      reason: 'Too many messages in a short time',
      data: c,
    }
  }
];


/** @type {import('../../src/plugin.js').Plugin[]} */
export default [
  {
    desc: 'Defense system',
    midware: midwareAnd(
      eventNameIs(MESSAGES_UPSERT),
    ),

    /** @param {import('../../src/context.js').Ctx} c */
    exec: async (c) => {
      let detect = new Result({ suspect: false });
      for (const detector of listDetectors) {
        detect = new Result(detector(c));
        if (detect?.suspect) {
          break;
        }
      }

      if (!detect.suspect) {
        return;
      }

      pen.Warn('Defense :', c.eventName, detect.suspect, detect.reason, detect.data);
      try {
        if (!blockedUsers.includes(c.sender)) {
          c.sendMessage(c.me, {
            document: Buffer.from(JSON.stringify(detect, null, 2)),
            fileName: `${c.chat}_${c.sender}_${c.timestamp}.json`,
            mimetype: 'application/json',
          });

          c.handler().client.sock.updateBlockStatus(c.sender, 'block');
          blockedUsers.push(c.sender);
        }

        if (c.isGroup && c.mentionedJid?.length > 1024) {
          c.reply({ delete: c.key });
        }
      } catch (e) {
        pen.Error(e);
      }
    }
  },
  {
    cmd: ['smp'],
    cat: 'defense',
    timeout: 15,
    midware: midwareAnd(
      eventNameIs(MESSAGES_UPSERT),
      midwareOr(fromMe),
    ),

    /** @param {import('../../src/context.js').Ctx} c */
    exec: async (c) => {
      c.reply({
        document: Buffer.from(JSON.stringify(c)),
        fileName: `${c.chat}_${c.sender}_${c.timestamp}.json`,
        mimetype: 'application/json',
      });
    }
  }
]

