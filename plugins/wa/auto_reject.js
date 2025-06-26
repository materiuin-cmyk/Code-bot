/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { CALL } from '../../src/const.js';
import { eventNameIs, midwareAnd } from '../../src/midware.js';
import { delay, randomNumber } from '../../src/tools.js';


/** @type {import('../../src/plugin.js').Plugin} */
export default {
  desc: 'Auto reject call',
  timeout: 15,

  midware: midwareAnd(
    eventNameIs(CALL),
    (ctx) => !ctx.isStatus,
    (ctx) => !ctx.fromMe,
  ),

  /** @param {import('../../src/context.js').Ctx} c */
  exec: async (c) => {
    await delay(randomNumber(1000, 2000));

    await c.handler().client.sock.rejectCall(c.id, c.sender);
  }
};

