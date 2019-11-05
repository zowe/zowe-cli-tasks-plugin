# "zowe-tasks.yml" Configuration File
`zowe-tasks.yml` is the default configuration file that is used when issuing `zowe tasks run` (the name can be overridden by the `--config-file` option).

The configuration file is the starting point for Zowe tasks where you define your input, variables, tasks, actions, etc. 

Full reference for each property can be found in the [interface](../src/api/interface/config/IConfig.ts).

In the `zowe-tasks.yml` file, there are several root level properties that can be defined:
Property | Description | Interface/Type | Doc
--- | --- | --- | ---
`input` | Allows specification of user input to the tasks. | [IInputs.ts](../src/api/interface/config/IInputs.ts) | [input](./input.md)
`global` | Allows definition of global variables for the tasks. | keyword/value pairs | [global](./global.md)
`args` | Allows specification of sets of arguments for `mergeArgs` | keyword/value pairs | [args](./args.md)
`helpers` | Allows definition of "function-like" tasks and actions that can be reused. | [IHelpers.ts](../src/api/interface/config/IHelpers.ts) | [helpers](./helpers.md)
`outputDir` | The directory to place the output from Zowe tasks. Output such as task/action logs, etc. | string | [output](./output.md)
`tasks` | The tasks that will with after issuing `zowe tasks run`. | [ITasks.ts](../src/api/interface/config/ITasks.ts) | [tasks](./tasks.md)

Follow the "Doc" links for detailed information on each property. 

