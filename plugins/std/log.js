/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { CONTACTS_UPDATE, MESSAGES_REACTION, MESSAGES_UPSERT } from '../../src/const.js';
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

/** @type {import('../../src/plugin.js').Plugin} */
export default {
  desc: 'Logs the message to the console',

  midware: (c) => {
    return ![CONTACTS_UPDATE].includes(c.eventName);
  },

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {
    switch (c.eventName) {
      case MESSAGES_REACTION:
      case MESSAGES_UPSERT: {
        const data = [];

        /* Indicator section */
        if (c.isAdmin) data.push('🛡️', '');

        if (c.isCMD) {
          data.push('⚡');

          const cmd = c.handler?.getCMD(c.pattern);
          if (!cmd.check(c)) data.push('❌');
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
        data.push(c.id.slice(0, 4) + '..' + c.id.slice(c.id.length - 4, c.id.length));


        data.push(
          pen.GreenBr(c.type?.replaceAll('Message', '')),
          pen.Blue(c.chatName),
          '<',
          pen.Red(c.senderName),
          c.text?.slice(0, 100).replaceAll('\n', ' ') || ''
        );

        pen.Info(...data);

        break;
      }
      default:
        pen.Info(c.eventName);
    }
  }
};

