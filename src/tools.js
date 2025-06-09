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
