/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { fromMe, midwareAnd } from '../../src/midware.js';
import { formatElapse } from '../../src/tools.js';

/** @type {import('../../src/plugin.js').Plugin} */
export default {

  cmd: 'menu',
  timeout: 15,
  cat: 'info',
  desc: 'Show the menu of commands',

  midware: midwareAnd(
    fromMe
  ),

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {

    const texts = ['*# Available menu*'];

    const since = new Date() - c.handler()?.client?.dateStarted;
    texts.push('', `Uptime: ${formatElapse(since)}`);


    const prefix = c.pattern[0];
    const categories = new Map();
    let cmdCount = 0;
    for (const cid of c.handler()?.cmds?.values()) {
      const p = c.handler()?.plugins?.get(cid);
      if (!p || p?.hidden || p?.disabled) continue;
      if (!categories.has(p.cat)) categories.set(p.cat, new Map());

      const cat = categories.get(p.cat);
      if (cat.has(cid)) continue;

      const patt = Array.isArray(p.cmd) ? p.cmd[0] : p.cmd;

      cat.set(cid, `${p.noPrefix ? patt : prefix + patt}`);
      cmdCount++;
    }

    let lascat = '';
    for (const [catname, cat] of categories.entries()) {
      if (catname !== lascat) texts.push('', `*# ${catname}*`);
      if (cat.size > 0) {
        for (const [cid, patt] of cat.entries()) {
          texts.push(`  ${patt}`);
        }
      }
    }

    texts.push('', `${cmdCount} cmd & ${c.handler()?.listens?.size} listener`);
    if (texts.length > 1) {
      c.reply({ text: texts.join('\n') });
    }
  }
};

