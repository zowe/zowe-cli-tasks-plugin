# Zowe CLI Tasks Plugin
**Note:** This is a work in progress plugin and should be considered an alpha state. Functionality is subject to change.

Installing: 
```
zowe plugins install @zowe/tasks-for-zowe-cli
```

Use cases: 
- Consolidate your Zowe build/script logic into a single Yaml file
- Consolidate the input to your Zowe automation in a single file (no need for multiple profiles)
- Quickly write automation using the power of Zowe CLI and it's plugins
- Build common "workflow"-style tasks that can be shared and reused 
- Speed up your automation by running tasks asynchronously and commands in a single process 

The Zowe CLI tasks plugin allows you to write sets of automation tasks in a Yaml config, similar to how you configure jobs and workflows using build tools like CircleCI, Drone, Travis, etc. 

For example, a common workflow might be:
- Render a batch job from a template file for submission
- Submit the batch job 
- Wait for the job to complete
- Verify that the Job finished CC 0000

You can now script these actions in Yaml. For example, here is submitting a job and extracting the jobname and jobid for use in future actions:
```yaml
...
      - name: "submitIefbr14Job"
        desc: "Submit the rendered IEFBR14"
        action:
          type: "cmd"
          run: "jobs submit lf"
        mergeArgs:
          - zosmfArgs
        args:
          localFile: rendered/iefbr14.jcl
        jsonExtractor: 
          jobid: "$.data.jobid"
          jobname: "$.data.jobname"
...
```

From a task's "action" you can run any of the following:
- Any Zowe CLI command (or plugin command) you have installed (e.g. `zowe jobs ls jobs`)
- Any host command (e.g. `ls -la`)
- Inline JavaScript function (sync or async)
- A built in function (provided by the tasks plugin)
- A JavaScript script file that contains the appropriate default export

Checkout a short [tutorial](./docs/starter.md) to learn about Zowe tasks and the yml configuration file.

Checkout the [example](./example) directory for a more complete example. 

For reference and in-depth information, checkout the [config](./docs/config.md) documentation.

# Building and Installing the Plugin from Source
1. `npm install`
2. `npm run build`
3. `zowe plugins install .`
