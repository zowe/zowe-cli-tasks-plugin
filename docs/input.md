# Zowe Tasks input Property
In your [zowe-tasks.yml](./config.md) configuration file you can specify how user input should be gathered using the `input` property.

See the [IInputs.ts](../src/api/interface/config/IInputs.ts) interface for full documentation. 

The complete example described in this document can be found [here](../example/more/input/zowe-tasks.yml).

## Defining User Input

For example, let's say our tasks needed `host`, `port`, `user`, `password`, and `job` to operate. 

We can define these as inputs using the `input` property:
```
input: 
  host:
    desc: "The hostname of your z/OSMF instance"
    sources:
      - user
      - env
      - prompt
  port:
    desc: "The port of your z/OSMF instance"
    sources:
      - user
      - env
      - prompt
  user: 
    desc: "Your user ID for z/OSMF" 
    sources: 
      - user
      - env
      - prompt
  password:
    desc: "Your password for z/OSMF"
    mask: true
    sources: 
      - user
      - env
      - prompt
  job: 
    desc: "The job to check if ACTIVE"
    sources:
      - user
      - env
      - prompt
```

Under the `input` property, we specify the input variable by name (e.g. `password`). We then give the intput some additional properties, such as `sources`. 

`sources` informs Zowe tasks where to gather the input variable from and in what order it should search. In the example given, we are instructing Zowe tasks to locate the value for `password` by searching the following:
1. A user configuration file. By default, if a `zowe-tasks-user.yml` exists in the same directory as your `zowe-tasks.yml` file, it will be searched for a root level property called `password`. You can also specify additional user configuration files on the `--user-config-files` option on `zowe tasks run`. 
2. An environmental variable called `ZOWE_TASKS_PASSWORD`. 
3. If (1) and (2) fail to provide a value, the user will be prompted. Notice that the `mask: true` property is set. This will cause the user input to be hidden. 

## Using User Input
Now let's define a task in our `zowe-tasks.yml` to check if the input `job` is active on the system:
```
tasks:
  job-active:
    desc: "Determine if ${job} is ACTIVE"
    actions:
      - name: "listJobs"
        desc: "List jobs using prefix '${job}' and owner '*'"
        action:
          type: "cmd"
          run: "jobs ls jobs"
        args:
          user: ${user}
          password: ${password}
          host: ${host}
          port: ${port}
          rejectUnauthorized: false
          owner: "*"
          prefix: ${job}
        jsonExtractor:
          jobsList: "$.data"
      - name: "checkForActive"
        desc: "Check if a job with name '${job}' is active"
        onSuccessMsg: "A job with jobname '${job}' is ACTIVE"
        action:
          type: "js"
          run: >
            for (let j of jobsList) 
              if (j.status === "ACTIVE") return;
            throw new Error("No jobs with jobname ${job} are ACTIVE"); 
        args:
          jobsList: ${extracted.jobsList}
```

Notice that we are using `${host}`, `${port}`, `${user}`, `${password}`, and `${job}` throughout the script as `args` and in `desc` text, etc. We can use the input properties throughout our `zowe-tasks.yml` using the Zowe tasks substitution operator: `${<varname>}`. `input` is resolved first, so you can use the values in any of the other properties in your `zowe-tasks.yml` (i.e. `global`, `args`, `tasks`, `helpers,` etc.). You can also specify input values from one input (resolved first) in the `desc` of another input. 

In the task we have defined, the first action will list jobs with `prefix: ${job}` and `owner: "*"`. The second action then checks if one of those jobs is ACTIVE. 

If we run our task with `WOW` as the input for `job`:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.zosmf.host
The port of your z/OSMF instance "port": 12345
Your user ID for z/OSMF "user": mytsouserid
Your password for z/OSMF "password" (masked):
The job to check if ACTIVE "job": WOW

Task - job-active - "Determine if WOW is ACTIVE"
   ✔   Action (listJobs) "List jobs using prefix 'WOW' and owner '*'"
   ✖   Action (checkForActive) "Check if a job with name 'WOW' is active"

Action "checkForActive" (run: "for (let j of jobs..." desc: "Check if a job with name 'WOW' is active") Failed:
   Function threw an error:
   No jobs with jobname WOW are ACTIVE
   The action in progress was "checkForActive".
```

There are no jobs ACTIVE with jobname WOW. 

Notice in this case, we did not have a `zowe-tasks-user.yml` file and no `ZOWE_TASKS` environment variables were set, so Zowe tasks prompted the user. We can mix and match user input sources by specifying some as ENV vars:
```
$ ZOWE_TASKS_HOST=my.zosmf.host ZOWE_TASKS_PORT=12345 zowe tasks run
Your user ID for z/OSMF "user": mytsouserid
Your password for z/OSMF "password" (masked):
The job to check if ACTIVE "job": WOW

Task - job-active - "Determine if WOW is ACTIVE"
   ✔   Action (listJobs) "List jobs using prefix 'WOW' and owner '*'"
   ✖   Action (checkForActive) "Check if a job with name 'WOW' is active"

Action "checkForActive" (run: "for (let j of jobs..." desc: "Check if a job with name 'WOW' is active") Failed:
   Function threw an error:
   No jobs with jobname WOW are ACTIVE
   The action in progress was "checkForActive".
``` 

Notice we specified `host` and `port` as environment variables and Zowe tasks only prompted for `user`, `password`, and `job`. 

We can also persist everything in the `zowe-tasks-user.yml` for convenience if we plan on re-running this task constantly: 
```
host: my.zosmf.host
port: 12345
user: mytsouserid
password: mytsopassword
job: WOW
```

Now if run `zowe tasks run`:
```
$ zowe tasks run

Task - job-active - "Determine if WOW is ACTIVE"
   ✔   Action (listJobs) "List jobs using prefix 'WOW' and owner '*'"
   ✖   Action (checkForActive) "Check if a job with name 'WOW' is active"

Action "checkForActive" (run: "for (let j of jobs..." desc: "Check if a job with name 'WOW' is active") Failed:
   Function threw an error:
   No jobs with jobname WOW are ACTIVE
   The action in progress was "checkForActive".
```

No prompting or ENV variables are necessary. All input was resolved from `zowe-tasks-user.yml`. 

## User Input Type Inference
When we defined `input` we did not need to specify the data type. If the data is coming from a user configuration file (`zowe-tasks-user.yml`) the input are left as-is. If the input is specified as an environment variable (`env`) or `prompt`, then the type is inferred. For example, if `12345` is specified for `port`, the value is a number, so the value of `${port}` is a number. Similarly if the the user typed `true` for the `prompt` value, the value would be converted to a boolean `true`. A user can prevent this behavior by enclosing the value in quotes (and the value will be a string). 

