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
import { fromOwner, settings } from '../settings.js';

const allowed = [
  'extendedTextMessage',
  'videoMessage',
  'imageMessage',
  'audioMessage',
  'protocolMessage',
  'senderKeyDistributionMessage',
  'associatedChildMessage',
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

    if (!c.isStatus || !c.type) return {
      suspect: false,
      reason: 'Not a status message',
    }

    let allow = settings.get('defense_allow_status');
    if (!allow) allow = [];
    allow.push(...allowed);
    allow = allow.filter((v, i, a) => a.indexOf(v) === i);

    return {
      suspect: c.isStatus && !allow?.includes(c.type) && c.type,
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
  /*
  (c) => {
    const key = `${c.chat}|${c.sender}|${c.timestamp}`;
    return {
      suspect: c.isViewOnce && hitman.isOverHit(key),
      reason: 'Too many messages in a short time',
      data: c,
    }
  }
  */
];


/** @type {import('../../src/plugin.js').Plugin[]} */
export default [
  {
    desc: 'Defense system',
    midware: midwareAnd(
      eventNameIs(MESSAGES_UPSERT),
      (c) => ({ success: settings.get(`defense_${c.me}`) }),
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
    desc: 'Create and send sample message as json.',
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
  },

  {
    cmd: ['defense', 'defense+', 'defense-'],
    cat: 'defense',
    desc: 'Manage defense status',
    timeout: 15,

    midware: midwareAnd(
      eventNameIs(MESSAGES_UPSERT),
      fromMe,
    ),

    /** @param {import('../../src/context.js').Ctx} c */
    exec: async (c) => {
      const key = `defense_${c.me}`;
      let pattern = c.pattern;
      if (c.pattern.endsWith('+')) {
        settings.set(key, true)
        pattern = c.pattern.slice(0, -1);
        pen.Warn(`Activating defense for ${c.me}`);
      } else if (c.pattern.endsWith('-')) {
        settings.set(key, false)
        pattern = c.pattern.slice(0, -1);
        pen.Warn(`Deactivating defense for ${c.me}`);
      }
      const set = settings.get(key);
      let text = '';
      if (set) {
        text = `Defense status : *${set}*`;
      } else if (set === false) {
        text = `Defense status : *${set}*`;
      } else {
        text = `Defense status : *${set}*`;
      }
      c.reply({ text: text + `\n\nNB :\n  *${pattern}-* _to deactivating_\n  *${pattern}+* _to activating_` }, { qouted: c.message })
    }
  },

  {
    cmd: ['skip', 'skip+', 'skip-'],
    cat: 'defense',
    desc: 'Manage skip message type on status.',
    timeout: 15,

    midware: midwareAnd(
      eventNameIs(MESSAGES_UPSERT),
      midwareOr(fromMe, fromOwner),
    ),

    /** @param {import('../../src/context.js').Ctx} c */
    exec: async (c) => {
      let newAllowed = c.argv?._;
      if (!newAllowed) newAllowed = [];
      newAllowed = newAllowed.filter((v, i, a) => a.indexOf(v) === i);

      const key = `defense_allow_status`;
      let allow = settings.get(key);
      if (!allow) allow = [];

      let pattern = c.pattern;
      let status = '';
      if (c.pattern.endsWith('+')) {
        pattern = c.pattern.slice(0, -1);
        allow.push(...newAllowed.filter((v) => !allow.includes(v)));
        status = 'added';
      } else if (c.pattern.endsWith('-')) {
        pattern = c.pattern.slice(0, -1);
        allow = allow.filter((v) => !newAllowed.includes(v))
        status = 'removed';
      }

      if (status.length > 0) settings.set(key, allow);

      let text = '';
      if (status.length > 0 && newAllowed?.length > 0) {
        text = `List type that has *${status}* :\n` +
          newAllowed.map((v) => `  - *${v}*`).join('\n') +
          `\n\nDefault :\n` + allowed.map((v) => `  - \`${v}\``).join('\n');
      } else {
        text = `Currrent list type registered :\n` +
          allow.map((v) => `  - \`${v}\``).join('\n') +
          `\n\nDefault :\n` + allowed.map((v) => `  - \`${v}\``).join('\n');
      }
      if (text.length === 0) return await c.react('🤔');
      c.reply({
        text: text +
          `\n\nNB :\n  *${pattern}-* _to remove_\n  *${pattern}+* _to add_` +
          `\n\n_Split multiple type with space_` +
          `\n\n_example :_\n\`${pattern}+ audioMessage imageMessage\``,
      }, { quoted: c.event })
    }
  }

]

