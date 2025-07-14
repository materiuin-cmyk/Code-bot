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
import { formatBytes, formatElapse } from '../../src/tools.js';
import { settings, fromOwner } from '../settings.js';
import os from 'os';
import process from 'process';

/** @type {import('../../src/plugin.js').Plugin} */
export default {
  cmd: ['ping', 'p'],
  timeout: 120,
  cat: 'system',
  tags: ['system'],
  desc: 'Ping the bot and get the response time.',

  midware: midwareAnd(
    eventNameIs(MESSAGES_UPSERT),
    midwareOr(
      fromMe,
      fromOwner,
    )
  ),

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {
    const current = new Date().getTime();
    const latency = current - c.timestamp;
    const uptime = new Date() - c.handler().client.dateCreated;
    const { rss, heapUsed } = process.memoryUsage();

    const text = `*「 PONG 」*

*⏱️ Latency:* ${formatElapse(latency)}
*🚀 Uptime:* ${formatElapse(uptime)}

*💻 System:*
  - *OS:* ${os.type()} ${os.release()} (${os.arch()})
  - *CPU:* ${os.cpus().length} Core(s)
  - *Memory:* ${formatBytes(heapUsed)} / ${formatBytes(rss)}
`.trim();

    c.reply({ text });
  }
};

