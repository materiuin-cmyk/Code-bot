/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { CONTACTS_UPDATE, GROUP_PARTICIAPANTS_UPDATE, GROUPS_UPDATE, MESSAGES_REACTION } from './const.js';
import pen from './pen.js';

const skipMessageTypes = [
  'messageContextInfo',
];

/**
 * Extracts text content and context info from a message
 * 
 * @param {Partial<import('baileys').WAMessage>} m - Message object
 * @returns {{text: string, contextInfo: import('baileys').WAContextInfo | null, type: string}} Extracted text and context
 */
export function extactTextContext(m) {
  let resp = {
    text: "",
    contextInfo: null,
    type: null
  }

  if (typeof m !== 'object' || m === null) return resp;

  for (let key in m) {
    if (key === 'protocolMessage') {
      if (m[key]?.editedMessage) {
        resp = extactTextContext(m[key].editedMessage);
        break;
      }
    }

    if (m[key] === null || m[key] === undefined) { continue; }
    if (key === 'conversation') {
      if (m[key].length > 0) {
        resp.text = m[key];
        if (!skipMessageTypes.includes(key)) resp.type = key;
        continue;
      }
    }

    if (typeof m[key] === 'object') {
      if (!skipMessageTypes.includes(key)) resp.type = key;
      if (m[key].caption?.length > 0) { resp.text = m[key].caption; }
      if (m[key].text?.length > 0) { resp.text = m[key].text; }
      if (m[key].contextInfo) { resp.contextInfo = m[key].contextInfo; }
    }
  }

  return resp;
}

export class Ctx {
  constructor({ sock, handler, eventName, event, eventType }) {
    /** @type {import('baileys').WASocket} */
    this.sock = sock;

    /** @type {import('./handler.js').Handler} */
    this.handler = handler;

    this.eventName = eventName;
    this.event = event;
    this.eventType = eventType;

    this.timestamp = event.messageTimestamp ?? new Date().getTime();

    if (eventName === GROUPS_UPDATE) {
      this.chat = event.id;
      this.sender = event.author;
    }

    if (eventName === GROUP_PARTICIAPANTS_UPDATE) {
      this.chat = event.id;
      this.sender = event.author;
      this.mentionedJid = event.participants;
      this.action = event.action;
    }

    if (eventName === CONTACTS_UPDATE) {
      this.sender = event.id;
      this.pushName = event.notify;
    }

    if (event.key) {
      this.id = event.key.id;
      this.fromMe = event.key.fromMe;
      this.chat = event.key.remoteJid;
      this.sender = event.key.participant;
    }

    if (event.message) {
      const ext = extactTextContext(event.message);
      this.type = ext.type;
      this.text = ext.text;
      this.contextInfo = ext.contextInfo;

      this.quotedMessage = ext?.contextInfo?.quotedMessage;
      const qext = extactTextContext(event.quotedMessage);
      this.quotedText = qext.text;
      this.stanzaId = ext.contextInfo?.stanzaId;
      this.participant = ext.contextInfo?.participant;
      this.remoteJid = ext.contextInfo?.remoteJid;
      this.mentionedJid = ext.contextInfo?.mentionedJid;
      this.expiration = ext.contextInfo?.expiration;
    }

    if (event.reaction) {
      this.text = event.reaction.text
      this.stanzaId = event.reaction.key?.id;
      this.remoteJid = event.reaction.key?.remoteJid;
      this.participant = event.reaction.key?.participant;
    }

    this.chatName = this.jidName(this.chat) ?? '';
    this.senderName = this.jidName(this.sender) ?? '';
  }

  async sendMessage(jid, content, options) {
    return await this.sock.sendMessage(jid, content, options)
  }

  async relayMessage(jid, content, options) {
    return await this.sock.relayMessage(jid, content, options);
  }

  async reply(content, options) {
    if (!this.chat) throw new Error('chat jid not provided');

    return await this.sock.sendMessage(this.chat, content, options);
  }

  async replyRelay(content, options) {
    if (!this.chat) throw new Error('chat jid not provided');
    return await this.sock.relayMessage(this.chat, content, options);
  }

  jidName(jid) {
    if (!jid || !this.handler || jid === '') return '';
    pen.Warn(jid);


    if (jid.endsWith('@g.us')) {

      let data = this.handler.groupCache.get(jid);
      if (!data) {
        data = this.sock.groupMetadata(jid);
        this.handler.groupCache.set(jid, data);
      }
      return data.subject;
    } else if (jid.endsWith('@s.whatsapp.net')) {
      const data = this.handler.contactCache.get(jid);
      if (data) {
        return data.name;
      }
    } else if (jid.endsWith('@newsletter')) {

    }

    return '';
  }

}
