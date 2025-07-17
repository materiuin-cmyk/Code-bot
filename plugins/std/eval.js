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

/** @type {import('../../src/plugin.js').Plugin} */
export default {
  cmd: ['>'],
  timeout: 15,
  cat: 'system',
  tags: ['system'],
  desc: 'Evaluate JavaScript code',

  midware: midwareAnd(
    eventNameIs(MESSAGES_UPSERT), fromMe,
  ),

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {
    const src = c.args?.trim();
    if (!src) return;

    try {
      let res = await eval(`(async () => { ${src} })()`);
      c.reply({ text: `${res}` });
    } catch (e) {
      c.reply({ text: `${e}` });
    }
  }
};

