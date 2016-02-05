#!/bin/bash

export NODE_ENV=testing
export BRANCH=master
export COMMIT=asd5a4565
export PROJECT=single-page-test-project

gulp s3-deployandnotify
