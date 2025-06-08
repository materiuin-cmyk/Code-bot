/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { readdirSync, statSync } from "fs";
import { Ctx } from "./context.js";
import { platform } from "os";
import { pathToFileURL } from "url";
import { Plugin } from "./plugin.js";
import pen from "./pen.js";
import { MESSAGES_UPSERT } from "./const.js";

export class Handler {
  constructor({ pluginDir, filter }) {
    this.pluginDir = pluginDir ?? '../plugins';
    this.filters = filter;
    this.sock = null;

    this.plugins = new Map();
    this.cmds = new Map();
    this.listens = new Map();

    this.loadPlugin(this.pluginDir);

  }

  /** @param {import('./plugin.js').Plugin} opts */
  async on(opts) {
    const plugin = new Plugin(opts);
    if (plugin.cmd) {
      const newid = this.cmds.size;
      this.cmds.set(newid, plugin);
    } else {
      const newid = this.cmds.size;
      this.listens.set(newid, plugin);
    }
  }


  async loadPlugin(dir) {
    const files = readdirSync(dir);
    for (const file of files) {
      let loc = `${dir}/${file}`.replace('//', '/');

      try {
        if (statSync(loc)?.isDirectory()) await this.loadPlugin(loc);
      } catch (e) {
        pen.Error(e.message);
      }
      if (loc.endsWith('.js')) {
        try {
          if (platform === 'win32') {
            loc = pathToFileURL(loc).href;
          }

          const loaded = await import(loc);
          if (loaded.on) this.on(loaded.on);
          if (loaded.ons) this.ons(loaded.ons);

          pen.Debug(`Plugin loaded:`, loc)
        } catch (e) {
          pen.Error(e.message, loc);
        }
      }
    }
  }

  async handle(ctx) {
    for (const listen of this.listens.values()) {
      if (!await listen.check(ctx)) {
        continue;
      }
      if (listen.exec) await listen.exec(ctx);
    }
  }

  async attach(sock) {
    this.sock = sock;

    sock.ev.on(MESSAGES_UPSERT, (upsert) => {
      for (const msg of upsert.messages) {
        const ctx = new Ctx({ eventName: MESSAGES_UPSERT, event: msg, eventType: upsert.type });
        this.handle(ctx);
      }
    });

  }
}
