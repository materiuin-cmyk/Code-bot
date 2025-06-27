/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { CALL, MESSAGES_UPSERT } from '../../src/const.js';
import { eventNameIs, fromMe, midwareAnd } from '../../src/midware.js';
import pen from '../../src/pen.js';
import { delay, randomNumber } from '../../src/tools.js';
import { settings } from '../settings.js';


/** @type {import('../../src/plugin.js').Plugin[]} */
export default [
  {
    desc: 'Auto reject call',
    timeout: 15,

    midware: midwareAnd(
      eventNameIs(CALL),
      (ctx) => !ctx.isStatus,
      (ctx) => !ctx.fromMe,
      (ctx) => settings.get(`auto_reject_${ctx.me}`)
    ),

    /** @param {import('../../src/context.js').Ctx} c */
    exec: async (c) => {
      if (c.callStatus !== 'offer') return;

      await delay(randomNumber(1000, 2000));
      pen.Warn('Rejecting call from', c.senderName, c.sender);

      await c.handler().client.sock.rejectCall(c.id, c.sender);
    }
  },

  {
    cmd: ['reject', 'reject+', 'reject-'],
    cat: 'whatsapp',
    desc: 'Set auto reject message',
    timeout: 15,
    midware: midwareAnd(
      eventNameIs(MESSAGES_UPSERT),
      fromMe,
    ),
    exec: async (c) => {
      const key = `auto_reject_${c.me}`;
      let pattern = c.pattern;
      if (c.pattern.endsWith('+')) {
        settings.set(key, true)
        pattern = c.pattern.slice(0, -1);
        pen.Warn(`Activating auto reject for ${c.me}`);
      } else if (c.pattern.endsWith('-')) {
        settings.set(key, false)
        pattern = c.pattern.slice(0, -1);
        pen.Warn(`Deactivating auto reject for ${c.me}`);
      }
      const set = settings.get(key);
      let text = '';
      if (set) {
        text = `Auto reject status : *${set}*`;
      } else {
        text = `Auto reject is not yet set.`;
      }
      c.reply({ text: text + `\n\nNB :\n  *${pattern}-* _to deactivating_\n  *${pattern}+* _to activating_` }, { qouted: c.message })
    }
  }
]

