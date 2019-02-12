#!/usr/bin/env bash

set -ex
rm ember-try*.tgz || true
npm pack
now=$(date +%s)
mv ember-try*.tgz "ember-try-${now}.tgz"
cd smoke-test-app && npm i && npm i --save-dev "../ember-try-${now}.tgz" && "./${1}"
