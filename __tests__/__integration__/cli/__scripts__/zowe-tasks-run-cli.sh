#!/bin/bash
ZOWE=$1
CONFIG=$2
node "$ZOWE" tasks run --config-file "$CONFIG" --log-output
exit $?