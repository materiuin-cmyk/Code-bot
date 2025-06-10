/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { readdirSync, statSync } from 'fs';
import { Ctx } from './context.js';
import { platform } from 'os';
import { pathToFileURL } from 'url';
import { Plugin } from './plugin.js';
import { Pen } from './pen.js';
import { CONTACTS_UPDATE, CONTACTS_UPSERT, GROUP_PARTICIAPANTS_UPDATE, GROUPS_UPDATE, GROUPS_UPSERT, MESSAGES_REACTION, MESSAGES_UPSERT } from './const.js';
import { jidNormalizedUser } from 'baileys';
import { genHEX } from './tools.js';

export class Handler {
  constructor({ pluginDir, filter, prefix, pen, groupCache, contactCache, timerCache }) {
    this.pluginDir = pluginDir ?? '../plugins';
    this.filters = filter;
    this.sock = null;

    /** @type {import('./pen.js').Pen)} */
    this.pen = pen ?? new Pen({ prefix: 'hand' });

    this.prefix = prefix ?? './';

    this.plugins = new Map();
    this.cmds = new Map();
    this.listens = new Map();

    /** @type {Map<string, import('baileys').GroupMetadata>} */
    this.groupCache = groupCache ?? new Map();

    /** @type {Map<string, import('baileys').Contact>} */
    this.contactCache = contactCache ?? new Map();

    /** @type {Map<string, number>} */
    this.timerCache = timerCache ?? new Map();

    this.loadPlugin(this.pluginDir);

  }

  /** @param {import('./plugin.js').Plugin} opts */
  async on(...opts) {
    for (const opt of opts) {
      const plugin = new Plugin(opt);
      if (plugin.cmd) {
        let precmds = [];
        if (Array.isArray(plugin.cmd)) {
          precmds = plugin.cmd;
        } else {
          precmds = [plugin.cmd];
        }

        let cmds = [];
        for (const precmd of precmds) {
          if (plugin.noPrefix) {
            cmds.push(precmd);
          } else {
            for (const pre of this.prefix) {
              cmds.push(`${pre}${precmd}`);
            }
          }
        }

        for (const cmd of cmds) {
          this.cmds.set(cmd.toLowerCase(), plugin);
        }
      } else {
        this.listens.set(this.listens.size, plugin);
      }
    }
  }

  async loadPlugin(dir) {
    let files = [];
    try {
      files = readdirSync(dir);
    } catch (e) {
      this.pen.Error(e);
    }
    for (const file of files) {
      let loc = `${dir}/${file}`.replace('//', '/');

      try {
        if (statSync(loc)?.isDirectory()) await this.loadPlugin(loc);
      } catch (e) {
        this.pen.Error(e.message);
      }
      if (loc.endsWith('.js')) {
        try {
          if (platform === 'win32') {
            loc = pathToFileURL(loc).href;
          }

          const loaded = await import(loc);
          if (loaded.default) {
            if (Array.isArray(loaded.default)) {
              this.on(...loaded.default);
            } else {
              this.on(loaded.default);
            }
          }

          this.pen.Debug(`Plugin loaded:`, loc)
        } catch (e) {
          this.pen.Error(loc, e);
        }
      }
    }
  }

  /** 
   * Check if given pattern is a command
   *
   * @param {string} p
   */
  isCMD(p) {
    return this.cmds.has(p);
  }

  /**
   * Handle event and passed it to all plugins whether it is a command or a listener
   *
   * @param {{event: any, eventType: string, eventName: string}}
   */
  async handle({ event, eventType, eventName }) {
    try {
      const ctx = new Ctx({
        handler: this,
        eventName: eventName,
        event: event,
        eventType: eventType
      });

      this.updateData(ctx);

      for (const listen of this.listens.values()) {
        try {
          /* Check rules and midware before exec */
          const passed = await listen.check(ctx);
          if (!passed) {
            continue;
          }
          /* Exec midware */
          if (listen.exec) await listen.exec(ctx);
        } catch (e) {
          this.pen.Error(e);
        }
      }

      /* Handle commands */
      if (ctx?.pattern && ctx?.eventType !== 'append' && ctx?.type !== 'senderKeyDistributionMessage') {
        const plugin = this.cmds.get(ctx.pattern.toLowerCase());
        if (plugin) {
          try {
            /* Check rules and midware before exec */
            const passed = await plugin.check(ctx);
            if (!passed) {
              return;
            }
            /* Exec midware */
            if (plugin.exec) await plugin.exec(ctx);
          } catch (e) {
            this.pen.Error(e);
          }
        }
      }
    } catch (e) {
      this.pen.Error(e);
    }
  }

  /**
   * Handle update data 
   *
   * @param {import('./context.js').Ctx} ctx
   */
  async updateData(ctx) {
    try {

      switch (ctx.eventName) {
        case GROUPS_UPSERT:
        case GROUP_PARTICIAPANTS_UPDATE:
        case GROUPS_UPDATE: {
          this.pen.Warn(ctx.eventName, ctx.eventName);
          await this.updateGroupMetadata(ctx.chat);
          break;
        }

        case CONTACTS_UPDATE:
        case CONTACTS_UPSERT: {
          this.updateContact(ctx.sender, {
            jid: ctx.sender,
            name: ctx.pushName,
          });
          break;
        }
        case MESSAGES_UPSERT: {
          if (ctx?.expiration) {
            this.updateTimer(ctx.chat, ctx.expiration);
          }
          break;
        }
      }
    } catch (e) {
      this.pen.Error(e);
    }
  }

  /** 
  *
  * @param {import('baileys').WASocket} sock 
  */
  async attach(sock) {
    this.sock = sock;

    sock.ev.on(MESSAGES_UPSERT, (update) => {
      for (const event of update.messages) {
        this.handle({ eventName: MESSAGES_UPSERT, event: event, eventType: update.type });
      }
    });

    sock.ev.on(MESSAGES_REACTION, (update) => {
      for (const event of update) {
        this.handle({ eventName: MESSAGES_REACTION, event: event, eventType: update.type });
      }
    });

    sock.ev.on(GROUPS_UPSERT, (update) => {
      for (const event of update) {
        this.handle({ eventName: GROUPS_UPSERT, event: event, eventType: update.type });
      }
    });

    sock.ev.on(GROUPS_UPDATE, (update) => {
      for (const event of update) {
        this.handle({ eventName: GROUPS_UPDATE, event: event, eventType: update.type });
      }
    });

    sock.ev.on(GROUP_PARTICIAPANTS_UPDATE, (event) => {
      this.handle({ eventName: GROUP_PARTICIAPANTS_UPDATE, event: event, eventType: event.type });
    });


    sock.ev.on(CONTACTS_UPDATE, (update) => {
      for (const event of update) {
        this.handle({ eventName: CONTACTS_UPDATE, event: event, eventType: update.type });
      }
    });

    sock.ev.on(CONTACTS_UPSERT, (update) => {
      for (const event of update) {
        this.handle({ eventName: CONTACTS_UPSERT, event: event, eventType: update.type });
      }
    });
  }

  async updateGroupMetadata(jid) {
    try {
      const data = await this.sock.groupMetadata(jid);
      if (data) this.groupCache.set(jid, data);
    } catch (e) {
      this.pen.Error(e);
    }
  }

  getGroupMetadata(jid) {
    const data = this.groupCache.get(jid);
    if (!data) this.updateGroupMetadata(jid).catch((e) => this.pen.Error(e));
    return data;
  }

  updateContact(jid, data) {
    try {
      if (data) this.contactCache.set(jid, data);
    } catch (e) {
      this.pen.Error(e);
    }
  }

  getContact(jid) {
    return this.contactCache.get(jid);
  }

  updateTimer(jid, ephemeral) {
    if (ephemeral) {
      const data = this.timerCache.get(jid);
      if (data !== ephemeral) {
        this.timerCache.set(jid, ephemeral);
      }
    }
  }

  getTimer(jid) {
    return this.timerCache.get(jid);
  }

  getName(jid) {
    jid = jidNormalizedUser(jid);
    if (!jid || jid === '') return null;

    if (jid.endsWith('@g.us')) {
      let data = this.getGroupMetadata(jid);
      return data?.subject;
    } else if (jid.endsWith('@s.whatsapp.net')) {
      const data = this.getContact(jid);
      if (data) {
        return data.name;
      }
    } else if (jid.endsWith('@newsletter')) {

    } else if (jid.endsWith('@lid')) {

    }

    return null;
  }


  /** 
  * Send message to given jid
  *
  * @param {string} jid
  * @param {import('baileys').AnyMessageContent} content
  * @param {import('baileys').MessageGenerationOptions} options
  */
  async sendMessage(jid, content, options) {
    if (!content) throw new Error('content not provided');
    if (!options) options = {};

    if (!options.messageId) options.messageId = genHEX(32);

    const ephemeral = this.getTimer(jid);
    if (ephemeral && ephemeral > 0) {
      options.ephemeralExpiration = ephemeral;
    }

    try {
      return await this.sock.sendMessage(jid, content, options);
    } catch (e) {
      pen.Error(e);
    }
  }


  /**
   * Relay message to given jid
   *
   * @param {string} jid
   * @param {import('baileys').proto.IMessage} content
   * @param {import('baileys').MessageGenerationOptions} options
   */
  async relayMessage(jid, content, options) {
    if (!content) throw new Error('content not provided');
    if (!options) options = {};

    if (!options.messageId) options.messageId = genHEX(32);

    const ephemeral = this.getTimer(jid);
    if (ephemeral && ephemeral > 0) {
      for (let key in content) {
        if (!content[key]) continue;

        if (!content[key]?.contextInfo) {
          content[key].contextInfo = { expiration: ephemeral };
        } else {
          content[key].contextInfo.expiration = ephemeral;
        }
      }
    }

    try {
      return await this.sock.relayMessage(jid, content, options);
    } catch (e) {
      pen.Error(e);
    }
  }

}
