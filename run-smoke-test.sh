#!/usr/bin/env bash

set -ex
cd smoke-test-app && npm i && npm i --save-dev "../" && "./${1}"
