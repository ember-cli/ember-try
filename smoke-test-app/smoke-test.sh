#!/usr/bin/env bash
set -ex

ember try:one test2 --config-path='../test/fixtures/dummy-ember-try-config-with-npm-scenarios.js'
