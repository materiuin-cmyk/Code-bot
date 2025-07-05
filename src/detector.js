/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { S_WHATSAPP_NET } from 'baileys';
import { midwareAnd, midwareOr } from './midware.js';

class Reason {
  constructor({ status, author, message }) {
    /** @type {boolean} */
    this.status = status;

    /** @type {string} */
    this.author = author;

    /** @type {any} */
    this.message = message;
  }
}

async function And(...args) {
  return async (c) => {
    for (const arg of args) {
      if (typeof arg !== 'function') continue;
      /** @type {Reason} */
      const result = await arg(c);
      if (result?.status) return result;
    }
  }
}

async function Or(...args) {
  return async (c) => {
    for (const arg of args) {
      if (typeof arg !== 'function') continue;
      /** @type {Reason} */
      const result = await arg(c);
      if (!result?.status) return result;
    }
    return new Reason({
      status: false,
      message: ''
    });
  }
}


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
  },
  (ctx) => {
    /* Check if participant is a 0 + S_WHATSAPP_NET */
    return ctx.participant === '0' + S_WHATSAPP_NET;
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
