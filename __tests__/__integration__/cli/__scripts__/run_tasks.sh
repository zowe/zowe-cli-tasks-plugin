#!/bin/bash
ZOWE=$1
ZOWE_TASKS_SCRIPTPATH=$2 node "$ZOWE" tasks run
exit $?