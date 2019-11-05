# Zowe Tasks Starter
The Zowe Tasks plugin for Zowe CLI lets you define sets of automation/build tasks in a yml file, similar to using build tools like CircleCI, Drone, Travis, etc.

To start, create a `zowe-tasks.yml` file in your project. For example:
```yaml
tasks:
  check-status:
    desc: "Check the status of z/OSMF"
    actions:
      - name: "checkZosmfStatus"
        desc: "Check the status of z/OSMF"
        action:
          type: "cmd"
          run: "zosmf check status"
```

You can run this task by issuing the following command from the directory containing `zowe-tasks.yml`:
```
zowe tasks run
```

If you have a default z/OSMF profile, your task should complete successfully:
```
$ zowe tasks run

Task - check-status - "Check the status of z/OSMF"
   ✔   Action (checkZosmfStatus) "Check the status of z/OSMF"
```

`zowe-tasks.yml` is the default configuration file that is used when issuing `zowe tasks run` (you can specify an alternate config file using `--config-file`).

In `zowe-tasks.yml`, you define your `tasks`, which are an array of `actions`. In the example provided, we have one task called `check-status` that contains a single `action`. The `action` issues the Zowe CLI command `zosmf check status` (notice there is no need to specify `zowe`):
```yaml
      - name: "checkZosmfStatus"
        desc: "Check the status of z/OSMF"
        action:
          type: "cmd"
          run: "zosmf check status"
```
All actions have a `type`. In the example, we've specified `cmd` indicating a Zowe CLI command. Other types include:
- `js` - a short inline JavaScript snippet 
- `asyncjs` - a short asynchronous JavaScript snippet (must call a `done` method)
- `script` - A JavaScript module that contains a default export 
- `exec` - A host command (e.g. `ls -la`)

Actions must also specify what to `run`. Again, in the example provided, we are running Zowe CLI command `zosmf check status`. 

As mentioned, our example tasks script requires that the user has a default profile. This is convenient for human users, but not as convenient for build tools, which already have a mechanism to store configuration info. 

To gather the required input, we can use the `input` property in our `zowe-tasks.yml` file. The order doesn't matter, but for readability, add `input` to the top of your `zowe-tasks.yml`: 


```yaml
# Zowe Tasks input 
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
```

The `input` property specifies what inputs should be made available to the script, and where to locate the input.

For example, our tasks script will require `host` as input, and `host` can be specified in:
- `user` - A user configuration file (defaults to `zowe-tasks-user.yml`)
- `env` - An environment variable named `ZOWE_TASKS_HOST`
- `prompt` - Prompts the user for the input

Zowe Tasks will search all of the sources in the order specified on `input` until the value is found. 

Run the script:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.hostname
The port of your z/OSMF instance "port": 12345

Task - check-status - "Check the status of z/OSMF"
   ✔   Action (checkZosmfStatus) "Check the status of z/OSMF"
```

Notice that Zowe tasks prompted for `host` and `port`. However, the `checkZosmfStatus` action is still using our default z/OSMF profile. 

To use the gathered input, we can use the following throughout the script to automatically "fill in" the values:
```
${host}
${port}
```

For example, let's supply these as arguments to the `check zosmf status` command. 

In order to determine the argument names, we can use `zowe zosmf check status -h` to view the help text:
```
...
 ZOSMF CONNECTION OPTIONS
 ------------------------

   --host  | -H (string)

      The z/OSMF server host name.

   --port  | -P (number)

      The z/OSMF server port.
...
```

The arguments we want to supply are `--host` and `--port`. 

We can supply these options to the `cmd` we want to `run` (`zosmf check status`) by using the `args` property:
```yaml
      - name: "checkZosmfStatus"
        desc: "Check the status of z/OSMF"
        action:
          type: "cmd"
          run: "zosmf check status"
        args:
          host: ${host}
          port: ${port}
```

Notice that we are using the substitution syntax `${<varname>}` and specifying the host and port we gathered from `input`. Also notice that we did not specify `--`. If the option was hyphenated, such as `--reject-unauthorized` we would specify it as `rejectUnauthorized` on the `args` property. 

Let's specify an incorrect port, to make sure its working:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.zosmf.host
The port of your z/OSMF instance "port": 12345

Task - check-status - "Check the status of z/OSMF"
   ✖   Action (checkZosmfStatus) "Check the status of z/OSMF"

Action "checkZosmfStatus" (run: "zosmf check status" desc: "Check the status of z/OSMF") Failed:
   The CLI "zosmf check status" command failed.

   Command Stderr:

   Command Error:
   z/OSMF REST API Error:
   http(s) request error event called
   Error: connect ECONNREFUSED 123.123.123.123:12345
   Error Details:
   HTTP(S) client encountered an error. Request could not be initiated to host.
   Review connection details (host, port) and ensure correctness.

   Host:      my.zosmf.host
   Port:      12345
   Base Path:
   Resource:  /zosmf/info
   Request:   GET
   Headers:   [{"X-CSRF-ZOSMF-HEADER":true}]
   Payload:   undefined

   The action in progress was "checkZosmfStatus".
```

Notice that the error presented is exactly as it would be from the CLI (with the added text indicating the action that has failed... `checkZosmfStatus`).

Now let's try using an environment variable (with the correct host and port):
```
$ ZOWE_TASKS_HOST=my.zosmf.host ZOWE_TASKS_PORT=12345 zowe tasks run

Task - check-status - "Check the status of z/OSMF"
   ✔   Action (checkZosmfStatus) "Check the status of z/OSMF"

```

We can use these input variables anywhere in the script. For example, let's print the name of the host in the `action` description:
```yaml
      - name: "checkZosmfStatus"
        desc: "Check the status of z/OSMF on ${host}"
        action:
          type: "cmd"
          run: "zosmf check status"
        args:
          host: ${host}
          port: ${port}
```

And if we run `zowe tasks run`:
```
$ ZOWE_TASKS_HOST=my.zosmf.host ZOWE_TASKS_PORT=12345 zowe tasks run

Task - check-status - "Check the status of z/OSMF"
   ✔   Action (checkZosmfStatus) "Check the status of z/OSMF on my.zosmf.host"

```

Notice "my.zosmf.host" appeared in the action text. 

Next, we can use the output from the check status command in subsequent `actions`. When running commands with Zowe tasks, Zowe command output is always returned using the `--reponse-format-json` flag to make it simpler to extract. Zowe CLI always returns the following fields with `--rfj`:

```json
{
  "success": true,
  "exitCode": 0,
  "message": "",
  "stdout": "Hello Stdout!",
  "stderr": "Hello Stderr!",
  "data": {}
}
```

The `data` property can be very useful when extracting information. For example, the `zosmf check status` command returns the enabled plugins:
```json
  "data": {
    "zos_version": "04.26.00",
    "zosmf_port": "12345",
    "zosmf_version": "26",
    "zosmf_hostname": "my.zosmf.host",
    "plugins": [
      {
        "pluginVersion": "HSMA230;PH12708P;2019-06-20T04:29:14",
        "pluginDefaultName": "z/OS Operator Consoles",
        "pluginStatus": "ACTIVE"
      }
    ]
```

We can extract this data for future usage by updating our `action` with a `jsonExtractor`:
```yaml
      - name: "checkZosmfStatus"
        desc: "Check the status of z/OSMF"
        action:
          type: "cmd"
          run: "zosmf check status"
        args:
          host: ${host}
          port: ${port}
        jsonExtractor:
          plugins: "$.data.plugins"
```

The `jsonExtractor` specified will extract the data from the `--reponse-format-json` output of the `zosmf check status` command and assign it to a Zowe tasks variable called `plugins`. The `jsonExtractor` uses the standard JSON path query language. In further actions, we can refer to the extracted variable with `${extracted.plugins}`.

Let's use the extracted plugins data in a new `action` we'll add to the end of our `zowe-tasks.yml` file:
```yaml
      - name: "checkIfConsole"
        desc: "Check if the z/OS Operator Consoles plugin in installed"
        onSuccessMsg: "z/OS Operator Consoles is installed!"
        action:
          type: "js"
          run: >
            for (let plugin of plugins) {
                if (plugin.pluginDefaultName === "z/OS Operator Consoles") {
                    return;
                }
            }
            throw new Error("z/OS Operator Consoles is NOT defined");
        args:
          plugins: ${extracted.plugins}
``` 

Notice on the `args` property that we have specified a variable named `plugins` and assigned the extracted plugins data using `${extracted.plugins}`.

This new `action` uses a small JavaScript snippet (`action.type` is `"js"`). Zowe tasks passes all the arguments specified on `args` by name to the snippet. This is why `plugins` is directly reference-able in the script. In the snippet provided, we are checking if one of the plugins is named `z/OS Operator Consoles`. If none found with that name, we can fail the `action` by throwing an error.

Now if we run `zowe tasks run`:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.zosmf.host
The port of your z/OSMF instance "port": 12345

Task - check-status - "Check the status of z/OSMF"
   ✔   Action (checkZosmfStatus) "Check the status of z/OSMF on my.zosmf.host"
   ✔   Action (checkIfConsole) "Check if the z/OS Operator Consoles plugin in installed"
          [info] z/OS Operator Consoles is installed!
```

Zowe tasks can also validate the output from `actions`. For example, we could ensure that the `zosmf_version` is greater than or equal to `26` by adding `validators`:
```yaml
      - name: "checkZosmfStatus"
        desc: "Check the status of z/OSMF"
        action:
          type: "cmd"
          run: "zosmf check status"
        args:
          host: ${host}
          port: ${port}
        jsonExtractor:
          plugins: "$.data.plugins"
        validators:
          - exp: "parseInt(output.data[\"zosmf_version\"],10) >= 26" 
```

`validators` allow you to specify an array of expressions (`exp`) that will be evaluated with JavaScript `eval`. The `output` variable is the output from the `zosmf check status` command (remember with the `--response-format-json` applied). The `exp` statement is the verbatim JavaScript statement that will be executed to check the output. If the validator returns `true` then the output is considered valid. 

For the sake of the example, we'll test our validator by specifying  `>= 100`:
```yaml
        validators:
          - exp: "parseInt(output.data[\"zosmf_version\"],10) >= 100" 
```

If we run `zowe tasks run`:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.zosmf.host
The port of your z/OSMF instance "port": 12345

Task - check-status - "Check the status of z/OSMF"
   ✖   Action (checkZosmfStatus) "Check the status of z/OSMF on my.zosmf.host"

Action "checkZosmfStatus" (run: "zosmf check status" desc: "Check the status of z/OSMF on my.zosmf.host") Failed:
   Action Failed by Validator:
   parseInt(output.data["zosmf_version"],10) >= 100

   Action Output:
   path/to/action/output.txt
   The action in progress was "checkZosmfStatus".
```

The `action` failed and Zowe tasks presented the `action` details and which validator failed. In addition, a file is written that contains the output of the task for review (useful when debugging, etc.).

Now we have a simple Zowe tasks script to check the the z/OSMF version and if certain plugins are installed.

You can find a complete example of this sample [here](../example/more/starter/zowe-tasks.yml).











