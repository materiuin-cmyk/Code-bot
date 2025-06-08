/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { loadEnvFile } from "process";
import pen from "./pen.js";
import { makeConnection } from "./client.js";
import { Handler } from "./handler.js";

/* Load environment variables from .env file */
try {
  loadEnvFile();
} catch (e) {
  pen.Debug('loadEnvFile', e.message);
}

function connect() {
  makeConnection({
    dataDir: 'data',
    phone: process.env.PHONE ?? '',
    method: process.env.METHOD ?? 'otp',
    session: process.env.SESSION ?? 'sesi',
    handler: new Handler({
      pluginDir: process.cwd() + '/plugins',
    })
  })
}

try {
  connect()
} catch (e) {
  pen.Error(e)
  connect()
}




