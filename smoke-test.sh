#!/usr/bin/env bash
set -ex

# cleanup to avoid nested folders accumulation due to node_modules
# folder being cached in CI
rm -rf node_modules/ember-try

npm link
npm link ember-try

# try:each
ember try:each --config-path='test/fixtures/dummy-ember-try-config-with-npm-scenarios.js'
