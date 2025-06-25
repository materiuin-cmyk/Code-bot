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
import { eventNameIs, midwareAnd, midwareOr } from '../../src/midware.js';
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

/** @type {import('../../src/plugin.js').Plugin} */
export default {
  desc: 'Defense system',
  midware: midwareAnd(
    eventNameIs(MESSAGES_UPSERT),
    midwareOr(
      /** @param {import('../../src/context.js').Ctx} c */
      (c) => { return c.isStatus && !allowed.includes(c.type) && c.type },

      /** @param {import('../../src/context.js').Ctx} c */
      (c) => { return c.isGroup && c.mentionedJid?.length > 1024 }
    )
  ),

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {
    pen.Warn('LogWatch', c.eventName, c.event);
    try {
      if (!blockedUsers.includes(c.sender)) {
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
};

