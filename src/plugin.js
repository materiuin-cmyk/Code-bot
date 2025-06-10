/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

/**
 * Plugin class for handling event as listener or command
 */
export class Plugin {
  constructor({ cmd, desc, tags, disabled, hidden, timeout, noPrefix, midware, exec }) {
    /** @type {import('./handler.js').Handler} */
    this.handler = null;

    /** @type {import('baileys').WASocket} */
    this.sock = null;

    /** @type {string | string[]}*/
    this.cmd = cmd;

    /** @type {string} */
    this.desc = desc;

    /** @type {string[]} */
    this.tags = tags;

    /** @type {boolean} */
    this.disabled = disabled;

    /** @type {boolean} */
    this.hidden = hidden;

    /**
     * Timeout in second
     *
     * @type {number}
     */
    this.timeout = timeout;

    /** @type {boolean} */
    this.noPrefix = noPrefix;

    /** @type {(ctx: import('./context.js').Ctx) => Promise<boolean>} */
    this.midware = midware;

    /** @type {(ctx: import('./context.js').Ctx) => Promise<void>} */
    this.exec = exec;
  }

  /**
   * Checker before execution
   *
   * @param {import('./context.js').Ctx} ctx
   */
  async check(ctx) {
    if (this.disabled) return false;

    if (this.timeout > 0) {
      const diff = new Date().getTime() - ctx.timestamp;
      if (diff > (this.timeout * 1000)) return false;
    }

    if (this.midware) return await this.midware(ctx);

    return true;
  }

}
