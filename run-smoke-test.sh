#!/usr/bin/env bash

set -ex
rm ember-try*.tgz || true
npm pack
now=$(date +%s)
mv ember-try*.tgz "ember-try-${now}.tgz"
cd smoke-test-app && yarn upgrade "ember-try@../ember-try-${now}.tgz" && yarn install && ./smoke-test.sh
