/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

import { StoreJson } from '../src/store.js';
import { getFile } from '../src/data.js';

export const settings = new StoreJson({
  saveName: getFile('settings.json'),
  autoSave: true
});
