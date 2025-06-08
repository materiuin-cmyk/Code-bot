/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */


export class Ctx {
  constructor({ eventName, event, eventType }) {
    this.eventName = eventName;
    this.event = event;
    this.eventType = eventType;

    this.timestamp = new Date().getTime();


  }
}
