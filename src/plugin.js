/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */


export class Plugin {
  constructor({ cmd, desc, tags, disabled, timeout, noPrefix, midware, exec }) {
    this.handler;
    this.sock;

    this.cmd = cmd;
    this.desc = desc;
    this.tags = tags;
    this.disabled = disabled;
    this.timeout = timeout;
    this.noPrefix = noPrefix;
    this.midware = midware;
    this.exec = exec;
  }

  async check(ctx) {
    if (this.disabled) return false;

    if (this.timeout > 0) {
      const diff = new Date().getTime() - ctx.timestamp;
      if (diff < (this.timeout * 1000)) return false;
    }

    if (this.midware) return this.midware(ctx);

    return true;
  }

}
