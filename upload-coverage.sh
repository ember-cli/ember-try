#!/usr/bin/env bash
CODECLIMATE_REPO_TOKEN=db6ab7e9e6c4f92bda33709f13ab712afc55c3ef7f9c25611c3967e18d552a1a node_modules/.bin/codeclimate-test-reporter < coverage/lcov.info
