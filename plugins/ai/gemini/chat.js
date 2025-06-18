/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { MESSAGES_UPSERT } from '../../../src/const.js';
import { eventNameIs, fromMe, midwareAnd } from '../../../src/midware.js';
import pen from '../../../src/pen.js';
import { gemini } from './gemini.js';
import { StoreJson } from '../../../src/store.js';
import { getFile } from '../../../src/data.js';
import { extactTextContext } from '../../../src/context.js';
import { hashCRC32 } from '../../../src/tools.js';
import { downloadMediaMessage } from 'baileys';

const chatWatch = new StoreJson({
  autoSave: true,
  saveName: getFile('gemini_id.json')
});

const contentSupport = [
  'audioMessage',
  'imageMessage',
  'videoMessage',
  'documentMessage',
  'stickerMessage',
];


/**
 * @param {import('../../../src/context.js').Ctx} c
 */
async function processChat(c) {
  let query = c.isCMD ? c.args : c.text;
  if (c.quotedText && c.quotedText?.length > 0 && !chatWatch.has(c.stanzaId)) query = c.quotedText;

  /** @type {import('@google/generative-ai').Part[]} */
  const parts = [];

  query = query.trim();

  if (query || query.length > 0) parts.push(query);

  const msgs = [c.message, c.quotedText];
  for (const m of msgs) {
    const ext = extactTextContext(m);
    if (!m || !ext) continue;
    if (!contentSupport.includes(ext.type)) continue;

    let mtype = 'unknown';
    let content = null;

    switch (ext.type) {
      case 'audioMessage': {
        mtype = 'audio';
        content = m.audioMessage;
        break;
      }
      case 'imageMessage': {
        mtype = 'image';
        content = m.imageMessage;
        break;
      }
      case 'videoMessage': {
        mtype = 'video';
        content = m.videoMessage;
        break;
      }
      case 'documentMessage': {
        mtype = 'document';
        content = m.documentMessage;
        break;
      }
      case 'stickerMessage': {
        mtype = 'sticker';
        content = m.stickerMessage;
        break;
      }
    }

    const mimetype = content?.mimetype || 'unknown';
    const unique = content ? hashCRC32(content.fileSha256.toString(16)) : c.timestamp;

    const buff = await downloadMediaMessage({ message: m }, 'buffer', {});
    if (!buff) continue;

    parts.push({
      inlineData: {
        data: Buffer.from(buff).toString('base64'),
        mimeType: mimetype
      }
    });
  }

  if (parts.length > 0) {
    try {
      pen.Warn(`Parts ${parts.length}, Query : ${query?.length}`);

      const resp = await gemini.send(this.chat, parts);
      const respText = resp?.response?.text()?.trim();
      if (!respText || respText?.length === 0) return;
      const sent = await c.reply({ text: `${respText}` });
      if (sent) {
        chatWatch.set(sent.key?.id, `${c.sender}_${c.chat}_${c.timestamp}`);
      }
    } catch (e) {
      pen.Error(e);
    }
  }
}

/** @type {import('../../src/plugin.js').Plugin[]} */
export default [
  {
    cmd: ['gm', 'gemini'],
    timeout: 15,
    desc: 'Gemini chat plugin',
    midware: midwareAnd(
      eventNameIs(MESSAGES_UPSERT), fromMe,
    ),

    /** @param {import('../../src/context.js').Ctx} c */
    exec: processChat
  },
  {
    timeout: 15,
    desc: 'Gemini chat listener',
    midware: midwareAnd(
      eventNameIs(MESSAGES_UPSERT), fromMe,
      (c) => chatWatch.has(c.stanzaId),
    ),
    exec: processChat
  }
];



