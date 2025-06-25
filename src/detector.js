/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { midwareAnd, midwareOr } from './midware.js';

const onlyOfficial = [
  'buttonsMesage',
  'botInvokeMessage',
  'interactiveResponseMessage',
];

const detect = midwareOr(
  midwareAnd(
    (ctx) => {
      /* Check if id contains non hex char */
      return /[^0-9a-fA-F]+/.test(ctx.id);
    }
  ),
  (ctx) => {
    if (!ctx.id) return false;
    /* Check if id contains lowercase */
    return ctx.id.toUpperCase() !== ctx.id;
  },
  (ctx) => {
    /* Check if message type is in onlyOfficial list */
    return onlyOfficial.includes(ctx.type);
  }
);

export class BotDetector {
  constructor({ delay }) {
    this.delay = delay ?? 1000;
  }

  /** 
  * @param {import('./context.js').Ctx} ctx
  */
  isBot(ctx) {
    return detect(ctx);
  }
}

export default new BotDetector({});
