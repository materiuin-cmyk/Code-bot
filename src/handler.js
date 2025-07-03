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
import { CALL, CONTACTS_UPDATE, CONTACTS_UPSERT, GROUP_PARTICIAPANTS_UPDATE, GROUPS_UPDATE, GROUPS_UPSERT, MESSAGES_REACTION, MESSAGES_UPDATE, MESSAGES_UPSERT, PRESENCE_UPDATE } from './const.js';
import { jidNormalizedUser } from 'baileys';
import { genHEX, hashCRC32 } from './tools.js';
import * as chokidar from 'chokidar';
import { WA_DEFAULT_EPHEMERAL } from 'baileys';

export class Handler {
  constructor({ pluginDir, filter, prefix, pen, groupCache, contactCache, timerCache }) {
    this.pluginDir = pluginDir ?? '../plugins';

    /** @type {Function} */
    this.filter = filter;

    /** @type {import('./client.js').Wangsaf} */
    this.client = null;

    /** @type {import('./pen.js').Pen)} */
    this.pen = pen ?? new Pen({ prefix: 'hand' });

    this.prefix = prefix ?? './';

    /** @type {Map<number, import('./plugin.js').Plugin>} */
    this.plugins = new Map();

    /** @type {Map<string, number>} */
    this.cmds = new Map();

    /** @type {Map<number, number>} */
    this.listens = new Map();

    /** @type {Map<string, import('baileys').GroupMetadata>} */
    this.groupCache = groupCache ?? new Map();

    /** @type {Map<string, import('baileys').Contact>} */
    this.contactCache = contactCache ?? new Map();

    /** @type {Map<string, number>} */
    this.timerCache = timerCache ?? new Map();

    /** @type {Array} */
    this.watchID = [];

    /* Scan plugins on start */
    this.scanPlugin(this.pluginDir);

    /* Watch changes in pluginDir */
    this.watcher = chokidar.watch(this.pluginDir, {
      ignoreInitial: true,
      usePolling: true,
      interval: 1000,
    })
      .on('change', (loc) => {
        this.pen.Debug(`Plugin changed:`, loc);
        this.loadFile(loc);
      })
      .on('add', (loc) => {
        this.pen.Debug(`Plugin added:`, loc);
        this.loadFile(loc);
      })
      .on('unlink', (loc) => {
        this.pen.Debug(`Plugin removed:`, loc);
        const hash = hashCRC32(loc);
        this.removeOn(hash);
      });
  }

  /**
   * Set prefix for command plugins
   *
   * @param {string} prefix
   */
  setPrefix(prefix) {
    this.prefix = prefix;
    this.cmds.clear()
    for (const [id, plugin] of this.plugins) {
      if (!plugin.cmd) continue;
      this.genCMD(id, plugin);
    }
  }

  /**
   * Generate & registering command for given plugin
   *
   * @param {string} id
   * @param {import('./plugin.js').Plugin} plugin
   */
  genCMD(id, plugin) {
    if (plugin?.cmd) {
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
        this.cmds.set(cmd.toLowerCase(), id);
      }
    }
  }

  /**
   * Add plugin to handler
   *
   * @param {string} location
   * @param {import('./plugin.js').Plugin} opts 
   */
  async on(location, ...opts) {
    let i = 0;
    for (const opt of opts) {
      /* Check if plugin hasn't exec */
      if (!opt.exec) continue;

      const hash = hashCRC32(location);
      const plugin = new Plugin(opt);
      plugin.location = location;

      if (this.filter) {
        if (!this.filter(this, plugin)) continue;
      }

      const newid = `${hash}-${i}`;
      this.plugins.set(newid, plugin);

      /* Check if plugin has cmd, so it is a command plugin */
      if (plugin.cmd) {
        this.genCMD(newid, plugin);
      } else {
        this.listens.set(newid, newid);
      }

      i++;
    }
  }

  /**
   * Remove plugin by hash
   *
   * @param {string} hash
   */
  async removeOn(hash) {
    try {
      for (const id of this.plugins.keys()) {
        if (id.startsWith(hash)) {
          this.plugins.delete(id);
          for (const [id_ls, val] of this.listens) {
            if (val === id) {
              this.listens.delete(id_ls);
            }
          }
          for (const [id_cmd, val] of this.cmds) {
            if (val.startsWith(hash)) {
              this.cmds.delete(id_cmd);
            }
          }
        }
      }
    } catch (e) {
      this.pen.Error(e);
    }
  }

  /**
   * Plugin scanner for given directory
   *
   * @param {string} dir
   */
  async scanPlugin(dir) {
    let files = [];
    try {
      files = readdirSync(dir);
    } catch (e) {
      this.pen.Error(e);
    }
    for (const file of files) {
      let loc = `${dir}/${file}`.replace('//', '/');

      try {
        if (statSync(loc)?.isDirectory()) await this.scanPlugin(loc);
      } catch (e) {
        this.pen.Error(e.message);
      }

      await this.loadFile(loc);
    }
  }

  /**
   * Preload plugins before start
   *
   * @param {...Function} callbacks
   */
  async preLoad(...callbacks) {
    if (!callbacks) return;

    for (const callback of callbacks) {
      try {
        await callback(this);
      } catch (e) {
        this.pen.Error(e);
      }
    }
  }

  /**
   * Load plugin file from given location
   *
   * @param {string} loc
   */
  async loadFile(loc) {
    if (loc.endsWith('.js')) {
      try {
        const filename = loc.split('/').pop();
        if (filename.startsWith('_') || filename.startsWith('.')) {
          this.pen.Debug('Skip:', loc)
          return;
        }

        if (platform === 'win32') {
          loc = pathToFileURL(loc).href;
        }

        const loaded = await import(`${loc}?t=${Date.now()}`);
        let pre = 0;
        let def = 0;

        if (loaded.pre) {
          if (Array.isArray(loaded.pre)) {
            this.preLoad(...loaded.pre);
            pre = loaded.pre.length;
          } else {
            this.preLoad(loaded.pre);
            pre = 1;
          }
        }

        if (loaded.default) {
          if (Array.isArray(loaded.default)) {
            this.on(loc, ...loaded.default);
            def = loaded.default.length;
          } else {
            this.on(loc, loaded.default);
            def = 1;
          }
        }

        const msgs = ['Loaded'];
        if (pre > 0) msgs.push(`${pre} pre`);
        if (def > 0) msgs.push(`${def} default`);
        msgs.push(loc);

        this.pen.Debug(...msgs);
      } catch (e) {
        this.pen.Error(loc, e);
      }
    }

  }

  /** 
   * Get command by pattern
   *
   * @param {string} p
   * @returns {import('./plugin.js').Plugin|undefined}
   */
  getCMD(p) {
    if (!p) return;
    const cid = this.cmds.get(p.toLowerCase());
    if (!cid) return;
    return this.plugins.get(cid);
  }

  /** 
   * Check if given pattern is a command
   *
   * @param {string} p
   * @returns {boolean}
   */
  isCMD(p) {
    if (!p) return false;
    return this.cmds.has(p.toLowerCase());
  }

  /**
   * Check if given context id is already exist in watchID
   * 
   * @param {import('./context.js').Ctx} ctx
   * @returns {boolean|undefined}
   */
  idExist(ctx) {
    if (this.watchID.includes(ctx?.id)) {
      return true;
    } else {
      if (this.watchID.length >= 100) this.watchID.shift();
      this.watchID.push(ctx.id);
      return false;
    }
  }

  /**
   * Check if given context is safe to execute
   *
   * @param {import('./context.js').Ctx} ctx
   * @returns {boolean|undefined}
   */
  isSafe(ctx) {
    const isAppend = ctx?.eventType === 'append';
    const isPrekey = ctx?.type === 'senderKeyDistributionMessage';
    const isUndefined = ctx?.type === 'undefined' || typeof ctx?.type === 'undefined';
    const idExist = isPrekey || isUndefined ? false : this.idExist(ctx);

    return !(isAppend || isPrekey || isUndefined || idExist);
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

      for (const lsid of this.listens.values()) {
        try {
          const listen = this.plugins.get(lsid);
          if (!listen) continue;

          ctx.plugin = () => listen;

          /* Check rules and midware before exec */
          const passed = await listen.check(ctx);
          if (!passed) {
            continue;
          }

          /* Exec */
          if (listen.exec) await listen.exec(ctx);
        } catch (e) {
          this.pen.Error(e);
        } finally {
          ctx.plugin = null;
        }
      }

      /* Handle commands */
      if (ctx?.pattern && this.isSafe(ctx)) {
        const pid = this.cmds.get(ctx.pattern.toLowerCase());
        if (!pid) return;
        const plugin = this.plugins.get(pid);
        if (plugin) {
          try {
            ctx.plugin = () => plugin;

            /* Check rules and midware before exec */
            const passed = await plugin.check(ctx);
            if (!passed) {
              return;
            }

            /* Exec */
            if (plugin.exec) await plugin.exec(ctx);
          } catch (e) {
            this.pen.Error(e);
          } finally {
            ctx.plugin = null;
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
          await this.updateGroupMetadata(ctx.chat, ctx.eventName);
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
          if (ctx?.fromMe && ctx?.eventType !== 'append' && ctx?.type !== 'senderKeyDistributionMessage') {
            this.updateTimer(ctx.chat, ctx.expiration, ctx.eventName);
          }
          break;
        }

        case WA_DEFAULT_EPHEMERAL: {
          this.pen.Debug(WA_DEFAULT_EPHEMERAL, ctx.event);
          break;
        }
      }
    } catch (e) {
      this.pen.Error(e);
    }
  }

  /** 
  * Attach client to handler & start listening for events
  *
  * @param {import('./client.js').Wangsaf} client 
  */
  async attach(client) {
    this.pen.Debug('Attaching client');

    this.client = client;

    this.client.sock.ev.process(events => {
      for (const eventName of Object.keys(events)) {
        const update = events[eventName];
        switch (eventName) {
          case MESSAGES_UPSERT: {
            for (const event of update?.messages) {
              this.handle({ eventName: eventName, event: event, eventType: update.type });
            }
            break;
          }

          case CALL:
          case MESSAGES_REACTION:
          case MESSAGES_UPDATE:
          case CONTACTS_UPDATE:
          case CONTACTS_UPSERT:
          case GROUPS_UPSERT:
          case GROUPS_UPDATE: {
            for (const event of update) {
              this.handle({ eventName: eventName, event: event, eventType: update.type });
            }
            break;
          }

          case GROUP_PARTICIAPANTS_UPDATE:
          case PRESENCE_UPDATE: {
            this.handle({ eventName: eventName, event: update, eventType: update.type });
            break;
          }

          case WA_DEFAULT_EPHEMERAL: {
            this.pen.Debug(WA_DEFAULT_EPHEMERAL, update);
            break;
          }

          default: {
            if (Array.isArray(update)) {
              for (const event of update) {
                this.handle({ eventName: eventName, event: event, eventType: update.type });
              }
            } else {
              this.handle({ eventName: eventName, event: update, eventType: update.type });
            }
          }
        }
      }
    });
  }

  /**
   * Update group metadata by given jid
   *
   * @param {string} jid
   * @param {string} via
   */
  async updateGroupMetadata(jid, via) {
    try {
      this.pen.Debug('Updating group metadata', jid, via ? `via ${via}` : '');
      const data = await this.client.sock.groupMetadata(jid);
      if (data) {
        this.groupCache.set(jid, data);
        this.updateTimer(data.id, data.ephemeralDuration, via);
      }
    } catch (e) {
      this.pen.Error(e);
    }
  }

  /**
   * Get group metadata by given jid
   *
   * @param {string} jid
   * @returns {import('baileys').GroupMetadata|undefined}
   */
  getGroupMetadata(jid) {
    const data = this.groupCache.get(jid);
    if (!data) this.updateGroupMetadata(jid).catch((e) => this.pen.Error(e));
    return data;
  }

  /**
   * Update contact by given jid & data
   *
   * @param {string} jid
   * @param {import('baileys').Contact} data
   */
  updateContact(jid, data) {
    try {
      if (data) this.contactCache.set(jid, data);
    } catch (e) {
      this.pen.Error(e);
    }
  }

  /**
   * Get contact by given jid
   *
   * @param {string} jid
   * @returns {import('baileys').Contact|undefined}
   */
  getContact(jid) {
    return this.contactCache.get(jid);
  }

  /**
   * Update timer by given jid & ephemeral
   * 
   * @param {string} jid
   * @param {number} ephemeral
   * @param {string} via
   */
  updateTimer(jid, ephemeral, via) {
    this.pen.Debug('Updating ephemeral for', jid, 'to', ephemeral, via ? `via ${via}` : '');
    if (jid) {
      const data = this.timerCache.get(jid);
      if (data !== ephemeral) {
        if (!ephemeral) {
          this.timerCache.delete(jid)
        } else {
          this.timerCache.set(jid, ephemeral);
        }
      }
    }
  }

  /**
   * Get timer by given jid
   * 
   * @param {string} jid
   * @returns {number|undefined}
   */
  getTimer(jid) {
    return this.timerCache.get(jid);
  }

  /**
   * Get name by given jid
   * 
   * @param {string} jid
   * @returns {string|undefined}
   */
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
      return await this.client.sock.sendMessage(jid, content, options);
    } catch (e) {
      this.pen.Error(e);
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
        if (typeof content[key] === 'object') {
          if (!content[key]?.contextInfo) {
            content[key].contextInfo = { expiration: ephemeral };
          } else {
            content[key].contextInfo.expiration = ephemeral;
          }
        }
      }
    }

    try {
      return await this.client.sock.relayMessage(jid, content, options);
    } catch (e) {
      pen.Error(e);
    }
  }

}
