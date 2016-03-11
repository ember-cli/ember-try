#!/usr/bin/env bash
set -ex

# try:each
ember try:each

# all styles of options for ember-try's own option
ember try:each --skip-cleanup
ember try:each --skip-cleanup=true
ember try:each --skip-cleanup true

# config-path option
ember try:each --config-path='test/fixtures/dummy-ember-try-config.js'

# both ember-try options
ember try:each --config-path='test/fixtures/dummy-ember-try-config.js' --skip-cleanup true

# try:ember
ember try:ember '> 1.13.0 < 2.0.0'
ember try:ember '1.13.0' --config-path='test/fixtures/dummy-ember-try-config.js'
ember try:ember '1.13.0' --skip-cleanup=true

# try:config
ember try:config
ember try:config --config-path='test/fixtures/dummy-ember-try-config.js'

# try:testall (Deprecated)
ember try:testall

# all styles of options for ember-try's own option
ember try:testall --skip-cleanup
ember try:testall --skip-cleanup=true
ember try:testall --skip-cleanup true

# config-path option
ember try:testall --config-path='test/fixtures/dummy-ember-try-config.js'

# both ember-try options
ember try:testall --config-path='test/fixtures/dummy-ember-try-config.js' --skip-cleanup true

# try <scenario>  (Deprecated)
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

# try:one <scenario>
ember try:one default

# custom command
ember try:one default --- ember help

# skip-cleanup option
ember try:one default --skip-cleanup
ember try:one default --skip-cleanup=true
ember try:one default --skip-cleanup true

# config-path option
ember try:one test1 --config-path='test/fixtures/dummy-ember-try-config.js'

# both ember-try options
ember try:one test1 --config-path='test/fixtures/dummy-ember-try-config.js' --skip-cleanup true

# custom command with all styles of options
ember try:one default --- ember help --json
ember try:one default --- ember help --json=true
ember try:one default --- ember help --json true

# custom command mixed with ember try's own option
ember try:one default --skip-cleanup --- ember help --json


# try:reset
ember try:reset
