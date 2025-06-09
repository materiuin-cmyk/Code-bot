/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

export function midwareOr(...midwares) {
  return (ctx) => {
    for (let midware of midwares) {
      const result = midware(ctx);
      if (result) {
        return true;
      }
    }
    return false;
  };
}

export function midwareAnd(...midwares) {
  return (ctx) => {
    for (let midware of midwares) {
      const result = midware(ctx);
      if (!result) {
        return false;
      }
    }
    return true;
  };
}

export function eventNameIs(...names) {
  return (ctx) => {
    return names?.includes(ctx?.eventName);
  };
}

export function fromMe(ctx) {
  return ctx?.fromMe;
}

export function isGroup(ctx) {
  return ctx?.isGroup;
}

export function isPrivate(ctx) {
  return !ctx?.isGroup;
}


