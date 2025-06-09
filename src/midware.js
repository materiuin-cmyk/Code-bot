/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

export async function midwareOr(...midwares) {
  return (ctx) => {
    for (let midware of midwares) {
      if (midware(ctx)) {
        return true;
      }
    }
    return false;
  };
}

export async function midwareAnd(...midwares) {
  return (ctx) => {
    for (let midware of midwares) {
      if (!midware(ctx)) {
        return false;
      }
    }
    return true;
  };
}

export async function eventIs(...names) {
  return (ctx) => {
    return names?.includes(ctx?.eventName);
  };
}

export async function fromMe(ctx) {
  return ctx?.fromMe;
}

export async function isGroup(ctx) {
  return ctx?.isGroup;
}

export async function isPrivate(ctx) {
  return !ctx?.isGroup;
}


