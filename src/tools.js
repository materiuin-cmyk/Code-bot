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
 * Generate hex string by given length and return as toUpperCase
 * @param {number} n - length of hex string
 * @returns {string} - hex string
 */
export function genHEX(n) {
  let hex = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < n; i++) {
    result += hex.charAt(Math.floor(Math.random() * 16));
  }
  return result.toUpperCase();
}

/**
 * Generate hash crc32 by given string and return as toUpperCase
 * @param {string} str
 * @returns {string} - crc32 hash
 */
export function hashCRC32(str) {
  let crc = 0;
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 1) ^ (str.charCodeAt(i) & 1 ? 0xedb88320 : 0);
  }
  return (crc >>> 0).toString(16).toUpperCase();
}


/** 
 * Number of milliseconds in a second
 * @type {number}
 */
const SECOND = 1000;

/** 
 * Number of milliseconds in a minute
 * @type {number}
 */
const MINUTE = 60 * SECOND;

/** 
 * Number of milliseconds in an hour
 * @type {number}
 */
const HOUR = 60 * MINUTE;

/** 
 * Number of milliseconds in a day
 * @type {number}
 */
const DAY = 24 * HOUR;

/** 
 * Format elapsed time into human readable string
 * 
 * @param {number} elapse - Time in milliseconds
 * @returns {string} Formatted string (e.g. "5h 30m 20s", "45m 30s", "30s", "100ms")
 */
export function formatElapse(elapse) {
  let est = `${elapse}ms`;
  if (elapse >= DAY) {
    est = `${Math.floor(elapse / DAY)}d ${Math.floor((elapse % DAY) / HOUR)}h ${Math.floor((elapse % HOUR) / MINUTE)}m ${Math.floor((elapse % MINUTE) / SECOND)}s`;
  } else if (elapse >= HOUR) {
    est = `${Math.floor(elapse / HOUR)}h ${Math.floor((elapse % HOUR) / MINUTE)}m ${Math.floor((elapse % MINUTE) / SECOND)}s`;
  } else if (elapse >= MINUTE) {
    est = `${Math.floor(elapse / MINUTE)}m ${Math.floor((elapse % MINUTE) / SECOND)}s`;
  } else if (elapse >= SECOND) {
    est = `${Math.floor(elapse / SECOND)}s`;
  }
  return est
}

/**
 * Delay execution of a function for a given number of milliseconds
 * @param {number} ms - Number of milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random number between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random number between min and max
 */
export function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const reBoldItalic = /\*\*\*(.+?)\*\*\*/g;
const reBold = /\*\*(.+?)\*\*/g;
const reItalic = /\*(.+?)\*/g;
const reStrike = /~~(.+?)~~/g;
const reMono = /```[\w]*\n([\s\S]+?)\n```/g;

const BOLD_ITALIC_START = '#{BI}';
const BOLD_ITALIC_END = '#{BE}';
const BOLD = '#{BB}';
const ITALIC = '#{II}';

export function formatMD(s) {
  if (!s || typeof s !== 'string') return s;
  s = s.replace(reBoldItalic, `${BOLD_ITALIC_START}$1${BOLD_ITALIC_END}`);
  s = s.replace(reBold, `${BOLD}$1${BOLD}`);
  s = s.replace(reItalic, `${ITALIC}$1${ITALIC}`);
  s = s.replace(reStrike, `~$1~`);

  s = s.replace(new RegExp(BOLD_ITALIC_START, 'g'), '_*');
  s = s.replace(new RegExp(BOLD_ITALIC_END, 'g'), '*_');
  s = s.replace(new RegExp(BOLD, 'g'), '*');
  s = s.replace(new RegExp(ITALIC, 'g'), '_');

  s = s.replace(reMono, '```$1```');
  return s;
}
