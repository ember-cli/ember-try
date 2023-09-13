'use strict';

const debug = require('debug')('ember-try:backup');
const { copy, existsSync, mkdirSync } = require('fs-extra');
const { createHash } = require('node:crypto');
const { join } = require('node:path');
const { promisify } = require('node:util');
const remove = promisify(require('rimraf'));
const tempDir = require('temp-dir');

module.exports = class Backup {
  constructor({ cwd }) {
    this.cwd = cwd;
    this.dir = join(tempDir, 'ember-try', createHash('sha256').update(cwd).digest('hex'));
    mkdirSync(this.dir, { recursive: true });

    debug(`Created backup directory ${this.dir}`);
  }

  /**
   * Adds a file to the backup directory.
   *
   * @param {String} filename Filename relative to the current working directory.
   * @returns {Promise<void>}
   */
  addFile(filename) {
    let originalFile = join(this.cwd, filename);

    if (existsSync(originalFile)) {
      debug(`Adding ${originalFile} to backup directory`);

      return copy(originalFile, this.pathForFile(filename));
    }

    return Promise.resolve();
  }

  /**
   * Adds multiple files to the backup directory.
   *
   * @param {Array<String>} filenames Filenames relative to the current working directory.
   * @returns {Promise<void>}
   */
  addFiles(filenames) {
    return Promise.all(filenames.map((filename) => this.addFile(filename)));
  }

  /**
   * Cleans up the backup directory.
   *
   * @returns {Promise<void>}
   */
  cleanUp() {
    debug(`Cleaning up backup directory ${this.dir}`);

    return remove(this.dir);
  }

  /**
   * Returns the absolute path for a file in the backup directory.
   *
   * @param {String} filename Filename relative to the current working directory.
   * @returns {String}
   */
  pathForFile(filename) {
    return join(this.dir, filename);
  }

  /**
   * Restores a file from the backup directory.
   *
   * @param {String} filename Filename relative to the current working directory.
   * @returns {Promise<void>}
   */
  restoreFile(filename) {
    let backupFile = this.pathForFile(filename);

    if (existsSync(backupFile)) {
      debug(`Restoring ${backupFile} from backup directory`);

      return copy(backupFile, join(this.cwd, filename));
    }

    return Promise.resolve();
  }

  /**
   * Restores multiple files from the backup directory.
   *
   * @param {Array<String>} filenames Filenames relative to the current working directory.
   * @returns {Promise<void>}
   */
  restoreFiles(filenames) {
    return Promise.all(filenames.map((filename) => this.restoreFile(filename)));
  }

  /**
   * Checks if a file exists in the backup directory.
   *
   * @param {String} filename Filename relative to the current working directory.
   * @returns {boolean}
   */
  hasFile(filename) {
    let backupFile = this.pathForFile(filename);

    return existsSync(backupFile);
  }
};
