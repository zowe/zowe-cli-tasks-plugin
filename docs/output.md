# Zowe Tasks outputDir Property
In your [zowe-tasks.yml](./config.md) configuration file you can specify the directory where you would like Zowe tasks to place output using the `outputDir` property. 

Output is generated when you specify the `--log-output` option OR when a validator fails an action. 

Output is extremely useful for debugging your tasks. If you use `--log-output` on the `zowe tasks run` command, the `action` args, the output of the `run` (Zowe CLI command, etc.), and the extracted variables are logged to separate files under a set of directories created and sequenced for each task and action. 

Under `outputDir` will be a date/time stamped directory created when you issue `zowe tasks run --log-output`. 