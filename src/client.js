/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { Browsers, makeWASocket, useMultiFileAuthState } from "baileys";
import readline from "node:readline";
import pino from "pino";
import QRCode from "qrcode";
import { Pen } from "./pen.js";
import { DisconnectReason } from "baileys";
import { CONNECTION_UPDATE, CREDS_UPDATE } from "./const.js";

let pen = new Pen({ prefix: 'sys' });

/* Initialize readline */
const question = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/* Ask for input text */
function ask(prompt) {
  return new Promise((resolve) => question.question(prompt, resolve))
}

/** @type {import('node:timers').Timer} */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


/**
 *
 * @param {string} sessionStr 
 */
export async function useStore(sessionStr) {
  if (!sessionStr) return null;

  if (sessionStr.includes('mongodb')) {
    return useMongoStore(sessionStr);
  } else if (sessionStr.includes('.sqlite') || sessionStr.includes('.db')) {
    return useSQLite(sessionStr)
  } else {
    return await useMultiFileAuthState(sessionStr)
  }
}

/**
 * @typedef {Object} Config
 * @property {string} session
 * @property {string} dataDir
 * @property {string} phone
 * @property {string} method
 * @property {Array<string>} browser 
 * @property {void} handler
 * @property {Object} socketOptions
 * @property {import("baileys").CacheStore} groupCache
 * @property {boolean} retry
 * @property {import('./pen.js').Pen} pen 
 */

/**
 * @param {Config} config 
 */
export async function makeConnection(config) {
  if (!config) throw new Error('config is required');
  if (!config.session) throw new Error('session is required');
  if (config.pen) pen = config.pen;

  /** @type  {import('baileys').AuthenticationState, Promise<void> } */
  const { state, saveCreds } = await useStore(config.session)

  const groupCache = new Map();

  /** {import('baileys').UserFacingSocketConfig } */
  const socketOptions = {
    syncFullHistory: false,
    auth: state,
    browser: config.browser ? config.browser : Browsers.macOS('Safari'),
    logger: pino({ level: 'error' }),
    cachedGroupMetadata: config?.groupCache ? async (jid) => config.groupCache.get(jid) : async (jid) => groupCache.get(jid),
  }

  if (config.socketOptions) {
    Object.assign(socketOptions, config.socketOptions)
  }

  /** @type {import('baileys').WASocket} */
  const sock = makeWASocket(socketOptions)
  if (config.handler) {
    if (config.handler.attach) {
      config.handler.attach(sock, config)
    }
  }

  pen.Debug('Method :', config.method, ', Registered :', state?.creds?.registered, ', Platform :', state?.creds?.platform);
  pen.Warn(config.method == 'otp', (!state?.creds?.registered && !state?.creds?.platform))
  if (config.method == 'otp' && (!state?.creds?.registered && !state?.creds?.platform)) {

    pen.Debug('Delay for 3000ms before requesting pairing code')
    /* Delay needed for pairing code */
    await delay(3000);

    let phone = config.phone;
    if (!phone) {
      while (!phone) {
        phone = await ask(`Enter phone ${phone ?? ''}: `);
        phone = phone?.replace(/[^+0-9]/g, '');
        phone = phone?.trim()

        if (!phone || phone == '') console.log('Invalid phone number')
      }
    }

    pen.Debug(`Using this phone : ${phone}`);


    let code = await sock.requestPairingCode(phone);
    if (code) pen.Log('Enter this OTP :', code)
  }


  sock.ev.on(CONNECTION_UPDATE, async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && config.method == 'qr') {
      console.log(await QRCode.toString(qr, { type: 'terminal', small: true }))
    }

    if (connection === 'close') {
      pen.Debug(CONNECTION_UPDATE, connection, lastDisconnect)

      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        if (config.retry) {
          pen.Debug(CONNECTION_UPDATE, 'Reconnecting...')
          makeConnection(config)
        } else {
          pen.Debug(CONNECTION_UPDATE, 'Not retrying')
        }
      }
    } else if (connection === 'open') {
      pen.Debug(CONNECTION_UPDATE, connection, lastDisconnect)
    }

  });

  sock.ev.on(CREDS_UPDATE, saveCreds);

}
