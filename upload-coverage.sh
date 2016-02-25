#!/usr/bin/env bash
CODECLIMATE_REPO_TOKEN=853c1122b5a1a39e5a4938d62f860fa17a11736eb443f6aaaee67ab935b1509b node_modules/.bin/codeclimate-test-reporter < coverage/lcov.info
