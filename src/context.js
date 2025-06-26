/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { jidNormalizedUser } from 'baileys';
import { CALL, CONTACTS_UPDATE, GROUP_PARTICIAPANTS_UPDATE, GROUPS_UPDATE, PRESENCE_UPDATE } from './const.js';
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
      if (m[key].caption?.length > 0) resp.text = m[key].caption;
      if (m[key].text?.length > 0) resp.text = m[key].text;
      if (m[key].selectedId?.length > 0) resp.text = m[key].selectedId;
      if (m[key].contextInfo) resp.contextInfo = m[key].contextInfo;
    }
  }

  return resp;
}

export class Ctx {
  /**
   * @param {{handler: import('./handler.js').Handler, eventName: string, eventType: string, event: any}}
   */
  constructor({ handler, eventName, eventType, event }) {

    /** @returns {import('./handler.js').Handler} */
    this.handler = () => handler;

    /** @type {import('./plugin.js').Plugin} */
    this.plugin = null;

    /** @returns {import('baileys').WASocket} */
    this.sock = () => handler?.client?.sock;

    /** @returns {string} */
    this.getName = (jid) => handler?.getName(jid);

    /** @returns {import('baileys').WAMessage} */
    this.sendMessage = async (jid, content, options) => handler?.sendMessage(jid, content, options);

    /** @returns {import('baileys').WAMessage} */
    this.relayMessage = async (jid, content, options) => handler?.relayMessage(jid, content, options);

    /** @returns {import('baileys').WAMessage} */
    this.reply = async (content, options) => {
      if (!this.chat) throw new Error('chat jid not provided');
      return await handler?.sendMessage(this.chat, content, options);
    };

    /** @returns {import('baileys').WAMessage} */
    this.replyRelay = async (content, options) => {
      if (!this.chat) throw new Error('chat jid not provided');
      return await handler?.relayMessage(this.chat, content, options);
    };

    /**
     * @param {string} emoji - Emoji to react with
     * @param {import('baileys').WAMessageKey} key - Message key to react to
     * @returns {import('baileys').WAMessage}
     */
    this.react = async (emoji, key) => await handler.sendMessage(this.chat, { react: { text: emoji, key: key, } });


    /** @type {string} */
    this.eventName = eventName;

    /** @type {any | import('baileys').WAMessage} */
    this.event = event;

    /** @type {string} */
    this.eventType = eventType;

    /** @type {number} */
    this.timestamp = event.messageTimestamp ? event.messageTimestamp * 1000 : new Date().getTime();

    /** @type {string} */
    this.me = jidNormalizedUser(handler?.client?.sock?.user?.id);

    /** @type {string} */
    this.meLID = jidNormalizedUser(handler?.client?.sock?.user?.lid);

    if (eventName === GROUPS_UPDATE) {
      /** @type {string} */
      this.chat = event.id;

      /** @type {string} */
      this.sender = event.author;
    }

    if (eventName === GROUP_PARTICIAPANTS_UPDATE) {
      this.chat = event.id;
      this.sender = event.author;

      /** @type {string[]} */
      this.mentionedJid = event.participants;

      /** @type {import('baileys').ParticipantAction} */
      this.action = event.action;
    }

    if (eventName === CONTACTS_UPDATE) {
      this.sender = event.id;

      /** @type {string} */
      this.pushName = event.notify;
    }

    if (eventName === PRESENCE_UPDATE) {
      this.chat = event.id;
      for (const jid of Object.keys(event.presences)) {
        this.sender = jid;

        /** @type {import('baileys').WAPresence} */
        this.presence = event.presences[jid].lastKnownPresence;
      }
    }

    if (event.key) {
      /** @type {import('baileys').WAMessageKey} */
      this.key = event.key;

      /** @type {string} */
      this.id = event.key.id;

      /** @type {boolean} */
      this.fromMe = event.key.fromMe;
      this.chat = event.key.remoteJid;
      this.sender = event.key.participant;
    }

    if (event.message) {
      /** @type {import('baileys').WAMessage} */
      this.message = event.message;
      const ext = extactTextContext(event.message);

      /** @type {string} */
      this.type = ext.type;

      /** @type {string} */
      this.text = ext.text;

      /** @type {import('baileys').WAContextInfo} */
      this.contextInfo = ext.contextInfo;

      /** @type {import('baileys').WAMessage} */
      this.quotedMessage = ext?.contextInfo?.quotedMessage;
      const qext = extactTextContext(this.quotedMessage);

      /** @type {string} */
      this.quotedText = qext.text;

      /** @type {string} */
      this.stanzaId = ext.contextInfo?.stanzaId;

      /** @type {string} */
      this.participant = ext.contextInfo?.participant;

      /** @type {string} */
      this.remoteJid = ext.contextInfo?.remoteJid;
      this.mentionedJid = ext.contextInfo?.mentionedJid;

      /** @type {number} */
      this.expiration = ext.contextInfo?.expiration;
    }

    if (eventType === 'append') {
      this.sender = jidNormalizedUser(event.participant);
    }

    if (event.reaction) {
      this.text = event.reaction.text
      this.stanzaId = event.reaction.key?.id;
      this.remoteJid = event.reaction.key?.remoteJid;
      this.participant = event.reaction.key?.participant;
    }

    if (eventName === CALL) {
      this.chat = event.groupJid ?? event.chatId;
      this.sender = jidNormalizedUser(event.from);
      this.id = event.id;
      this.timestamp = event.date * 1000;
      this.isGroup = event.isGroup;

      /** @type {boolean} */
      this.isVideo = event.isVideo;

      /** @type {string} */
      this.callStatus = event.status;
    }

    /* Parsing cmd */
    if (this.text && this.text.length > 0) {
      const splitted = this.text.split(' ');
      /** @type {string} */
      this.pattern = splitted[0];

      /** @type {string} */
      this.args = splitted.slice(1)?.join(' ');

      /** @type {boolean} */
      this.isCMD = handler?.isCMD(this.pattern);
    }

    this.pushName = event?.pushName ?? this.pushName;

    /** @type {string} */
    this.chatName = this.getName(this.chat) ?? this.chat;

    /** @type {string} */
    this.senderName = this.pushName ?? this.getName(this.sender) ?? this.sender;

    if (this.sender?.includes(':')) this.sender = jidNormalizedUser(this.sender);

    if (this.sender && this.sender?.endsWith('@lid')) {
      this.fromMe = this.sender === this.meLID || this.fromMe;
    } else {
      this.fromMe = this.me ? this.sender === this.me : this.fromMe;
    }

    /** @type {boolean} */
    this.isGroup = this.chat?.endsWith('@g.us');

    /** @type {boolean} */
    this.isStatus = this.chat === 'status@broadcast';

    if (this.isGroup) {
      const data = handler?.getGroupMetadata(this.chat);
      if (data) {
        for (const part of data.participants) {
          if (this.sender == part.jid || this.sender == part.lid || this.sender == part.id) {
            /** @type {boolean} */
            this.isAdmin = part.admin?.includes('admin');
            // this.sender = part.jid ?? this.sender;
          }
        }
      }
    }
  }
}
