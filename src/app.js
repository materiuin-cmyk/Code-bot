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
import { Wangsaf } from "./client.js";
import { Handler } from "./handler.js";
import { StoreJson } from "./store.js";

/* Load environment variables from .env file */
try {
  loadEnvFile();
} catch (e) {
  pen.Debug('loadEnvFile', e.message);
}

const wea = new Wangsaf({
  dataDir: 'data',
  phone: process.env.PHONE ?? '',
  method: process.env.METHOD ?? 'otp',
  session: process.env.SESSION ?? 'sesi',
  handler: new Handler({
    pluginDir: process.cwd() + '/plugins',
    groupCache: new StoreJson({ saveName: 'group_metadata.json', autoSave: true }),
    // contactCache: new StoreJson({ saveName: 'contacts.json', autoSave: true }),
  }),
  retry: true
});

try {
  wea.connect();
} catch (e) {
  pen.Error(e)
  wea.connect();
}




