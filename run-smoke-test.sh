#!/usr/bin/env bash

set -ex
rm ember-try*.tgz || true
npm pack
now=$(date +%s)
mv ember-try*.tgz "ember-try-${now}.tgz"
if [[ $npm_execpath =~ ^.*yarn.*$ ]]; then
  cd smoke-test-app && yarn upgrade "ember-try@file:../ember-try-${now}.tgz" && yarn install && "./${1}"
else
  cd smoke-test-app && npm install --save-dev "../ember-try-${now}.tgz" && npm install && "./${1}"
fi

