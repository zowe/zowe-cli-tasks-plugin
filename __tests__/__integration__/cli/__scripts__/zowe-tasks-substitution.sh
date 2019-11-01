#!/bin/bash
ZOWE=$1
CONFIG=$2
ZOWE_TASKS_EXAMPLEVAR1="Var 1 Value" ZOWE_TASKS_EXAMPLEVAR2="Var 2 Value" node "$ZOWE" tasks run --config-file "$CONFIG" --log-output
exit $?