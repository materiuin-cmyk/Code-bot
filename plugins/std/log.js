/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { CONTACTS_UPDATE, MESSAGES_REACTION, MESSAGES_UPSERT, PRESENCE_UPDATE } from '../../src/const.js';
import { BotDetector } from '../../src/detector.js';
import pen from '../../src/pen.js';
import { formatElapse } from '../../src/tools.js';

const storeID = [];
function hasID(c) {
  const key = `${c.sender}_${c.id}`
  if (storeID.indexOf(key) > -1) {
    return true;
  } else {
    if (storeID.length > 100) {
      storeID.shift();
    }
    storeID.push(key);
    return false;

  }
}
const detect = new BotDetector({ delay: 2000 });

/** @type {void} */
const sliceStr = (str, len, mid) => {
  if (!str || str?.length <= len) return str;
  if (!mid) mid = '';
  const half = Math.round(len / 2)
  const start = str.slice(0, half)
  const end = str.slice(str.length - half, str.length)
  return `${start}${mid}${end}`
}

/** @type {void} */
const cleanName = (str) => {
  if (typeof str === 'string') {
    str = str.replaceAll('\n', ' ');
    while (str.includes('  ')) {
      str = str.replaceAll('  ', ' ');
    }
    str = str.trim();
  }

  return str;
}

/** @type {import('../../src/plugin.js').Plugin} */
export default {
  desc: 'Logs the message to the console',

  midware: (c) => {
    return ![CONTACTS_UPDATE].includes(c.eventName);
  },

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {
    const data = [];
    const chatName = cleanName(c.chatName);
    const senderName = cleanName(c.senderName);

    switch (c.eventName) {
      case PRESENCE_UPDATE: {
        switch (c.presence) {
          case 'composing': {
            data.push('✍️', '');
            break;
          }
          case 'recording': {
            data.push('🎤')
            break;
          }
        }

        data.push(
          pen.Blue(chatName),
          '<',
          pen.Red(senderName),
        );

        break;
      }

      case MESSAGES_REACTION:
      case MESSAGES_UPSERT: {

        /* Indicator section */
        if (c.isAdmin) data.push('🛡️', '');

        if (c.isCMD) {
          data.push('⚡');

          const cmd = c.handler?.getCMD(c.pattern);
          if (!cmd?.check(c)) data.push('❌');
        }

        if (c.id && c.type !== 'senderKeyDistributionMessage') {
          if (hasID(c)) {
            data.push('⚠️', '');
          }
        }
        if (detect.isBot(c)) data.push('🤖');
        if (c.sender?.endsWith('@lid')) data.push('🥷');


        /* Data section */
        data.push(formatElapse(new Date().getTime() - c.timestamp));
        if (c.stanzaId) data.push(sliceStr(c.stanzaId, 8, '-'), '<<');
        data.push(sliceStr(c.id, 8, '-'));

        data.push(
          pen.GreenBr(c.type?.replaceAll('Message', '')),
          pen.Blue(chatName),
          '<',
          pen.Red(senderName),
          c.text?.slice(0, 100).replaceAll('\n', ' ') || ''
        );

        break;
      }
      default:
        data.push(c.eventName);
    }

    if (data.length > 0) pen.Info(...data);
  }
};

