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
import { formatElapse } from '../../src/tools.js';

/** @type {import('../../src/plugin.js').Plugin} */
export default {
  cmd: ['ping', 'p'],
  timeout: 120,
  cat: 'system',
  tags: ['system'],
  desc: 'Ping the bot and get the response time.',

  midware: midwareAnd(
    eventNameIs(MESSAGES_UPSERT), fromMe,
  ),

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {
    const current = new Date().getTime();
    const est = Math.floor(current - c.timestamp);
    c.reply({ text: `⏱️ ${formatElapse(est)}\n\nCurrent : ${current}\nChat : ${c.timestamp}` });
  }
};

