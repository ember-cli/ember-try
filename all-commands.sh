#!/usr/bin/env bash
set -ex

# try:testall
ember try:testall

# all styles of options for ember-try's own option
ember try:testall --skip-cleanup
ember try:testall --skip-cleanup=true
ember try:testall --skip-cleanup true

# config-path option
ember try:testall --config-path='test/fixtures/dummy-ember-try-config.js'

# both ember-try options
ember try:testall --config-path='test/fixtures/dummy-ember-try-config.js' --skip-cleanup true

# try <scenario>
ember try default

# custom command
ember try default help

# skip-cleanup option
ember try default --skip-cleanup

# The following two DO NOT CURRENTLY WORK
# ember try default --skip-cleanup=true
# ember try default --skip-cleanup true

# config-path option; DOES NOT CURRENTLY WORK
# ember try test1 --config-path='test/fixtures/dummy-ember-try-config.js'

# both ember-try options; DOES NOT CURRENTLY WORK
# ember try test1 --config-path='test/fixtures/dummy-ember-try-config.js' --skip-cleanup true

# custom command with all styles of options
ember try default help --json
ember try default help --json=true
ember try default help --json true

# custom command mixed with ember try's own option
ember try default help --json --skip-cleanup

# try:reset
ember try:reset
