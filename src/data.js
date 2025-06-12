/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */


import fs from 'fs';
import pen from './pen.js';
import path from 'path';

const dataDir = 'data';

/**
 * Check if the data directory exists. If not, create it.
 *
 */
function checkDataDir(targetDir) {
  try {
    fs.mkdirSync(targetDir);
  } catch (e) {
    pen.Debug(e.message);
  }
}

export function getDir(name) {
  checkDataDir(dataDir);
  const targetDir = path.join(dataDir, name);
  checkDataDir(targetDir);
  return targetDir;
}

export function getFile(name) {
  checkDataDir(dataDir);
  return path.join(dataDir, name);
}

