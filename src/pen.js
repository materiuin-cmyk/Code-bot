/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

export const LL_NONE = 0;
export const LL_DEBUG = 1;
export const LL_INFO = 2;
export const LL_WARN = 3;
export const LL_ERROR = 4;

/** @type {string} */
export const TIME_FORMAT = 'HH:mm:ss.SSS';

/** 
 * getTime returns the current time in the specified format.
 *
 * @param {string} format - The format of the time.
 * @returns {string} The current time in the specified format.
 */
export function getTime(format) {
  if (!format || format === '') {
    format = TIME_FORMAT;
  }
  const now = new Date();
  const repl = {
    'HH': now.getHours().toString().padStart(2, '0'),
    'mm': now.getMinutes().toString().padStart(2, '0'),
    'ss': now.getSeconds().toString().padStart(2, '0'),
    'SSS': now.getMilliseconds().toString().padStart(3, '0')
  }

  for (const key in repl) {
    format = format.replace(key, repl[key]);
  }
  return format;
}


/**
 * Pen is a class that provides methods to print colored logs to the console.
 *
 * @param {number} level - The level of the log.
 * @returns {Pen} A new instance of the Pen class with the specified level.
 */
export class Pen {

  constructor({ level, format, prefix }) {
    this.prefix = prefix;
    this.level = level;
    this.format = format ?? TIME_FORMAT;
  }

  SetPrefix(prefix) {
    this.prefix = prefix;
  }

  Magenta(args) {
    return '\x1b[35m' + args + '\x1b[0m';
  }

  Cyan(args) {
    return '\x1b[36m' + args + '\x1b[0m';
  }

  Green(args) {
    return '\x1b[32m' + args + '\x1b[0m';
  }

  Red(args) {
    return '\x1b[31m' + args + '\x1b[0m';
  }

  Yellow(args) {
    return '\x1b[33m' + args + '\x1b[0m';
  }

  Log(...args) {
    if (this.prefix) {
      console.log(getTime(this.format), this.prefix, ...args);
    } else {
      console.log(getTime(this.format), ...args);
    }
  }

  Debug(...args) {
    if (this.level > LL_DEBUG || this.level == LL_NONE) {
      return
    }
    this.Log(this.Magenta('[D]'), ...args);
  }

  Info(...args) {
    if (this.level > LL_INFO || this.level == LL_NONE) {
      return
    }
    this.Log(this.Cyan('[I]'), ...args);
  }

  Warn(...args) {
    if (this.level > LL_WARN || this.level == LL_NONE) {
      return
    }
    this.Log(this.Yellow('[W]'), ...args);
  }

  Error(...args) {
    if (this.level > LL_ERROR || this.level == LL_NONE) {
      return
    }
    this.Log(this.Red('[E]'), ...args);
  }
}


export default new Pen({ format: 'HH:mm:ss' });
