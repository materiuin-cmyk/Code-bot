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
import { eventNameIs, fromMe, midwareAnd } from '../../src/midware.js';
import pen from '../../src/pen.js';

/** @type {import('../../src/plugin.js').Plugin} */
export default {
  cmd: ['rvo', 'readviewonce'],
  cat: 'whatsapp',
  desc: 'Read View Once messages',
  timeout: 15,

  midware: midwareAnd(
    eventNameIs(MESSAGES_UPSERT), fromMe,
  ),

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {
    let m = null;

    if (!c.quotedMessage) return;
    m = c.quotedMessage;

    if (m.viewOnceMessage) {
      m = m.viewOnceMessage?.message;
    }

    for (const k of Object.keys(m)) {
      if (!m[k]) continue;
      if (typeof m[k] === 'object') {
        if (m[k].viewOnce) m[k].viewOnce = false;
        if (m[k].scansSidecar) m[k].scansSidecar = null;
      }

      if (key === 'messageContextInfo') {
        delete m[k];
      }
    }

    if (m?.messageContextInfo) m.messageContextInfo = null;

    if (m) {
      pen.Warn(m)
      c.relayMessage(c.chat, m);
    }
  }
};

