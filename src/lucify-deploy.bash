#!/bin/bash

# exit if any command returns non-zero exit value
set -e

export AWS_ACCESS_KEY_ID=${OVERRIDE_AWS_ACCESS_KEY_ID:-$AWS_ACCESS_KEY_ID}
export AWS_SECRET_ACCESS_KEY=${OVERRIDE_AWS_SECRET_ACCESS_KEY:-$AWS_SECRET_ACCESS_KEY}
export FLOW_TOKEN=${OVERRIDE_FLOW_TOKEN:-$FLOW_TOKEN}

# if [ -n "$ENCRYPTED_AWS_SECRET_ACCESS_KEY" ]; then
#   echo "Using encrypted access key"
#   DECRYPTED_AWS_SECRET_ACCESS_KEY=$(echo $ENCRYPTED_AWS_SECRET_ACCESS_KEY | openssl enc -d -aes256 -base64 -A -pass pass:$LUCIFY_ENC_PASS)
#   export AWS_SECRET_ACCESS_KEY=$DECRYPTED_AWS_SECRET_ACCESS_KEY
# fi

echo "LUCIFY_ENV is $LUCIFY_ENV"
echo "NODE_ENV is $NODE_ENV"
echo "AWS_ACCESS_KEY_ID ends ${AWS_ACCESS_KEY_ID:(-4)}"
echo "AWS_SECRET_ACCESS_KEY ends ${AWS_SECRET_ACCESS_KEY:(-4)}"
echo "FLOW_TOKEN ends ${FLOW_TOKEN:(-4)}"

rm -rf dist
gulp github-deploy
gulp dist
gulp build-artifact
gulp s3-deploy
gulp notify
