# Zowe Tasks Helpers Property
In your [zowe-tasks.yml](./config.md) configuration file you can specify a set of "function-like" helpers that you can "call" or "reuse" throughout your tasks. 

See the [IHelpers.ts](../src/api/interface/config/IHelpers.ts) interface for full documentation.

The complete example described in this document can be found [here](../example/more/helpers/zowe-tasks.yml).

The `helpers` property contains two additional properties `tasks` and `actions`. 

You can use the `helpers.tasks` property to define additional "function-like" tasks that can be called in another `task` as subtasks. 

You can use `helpers.actions` to define additional "function-like" actions that can be called in a task. 

For example, lets define a set of helper tasks and actions that we can reuse:
```
helpers:
  tasks:
    issue-ssh:
      desc: "Issue some SSH commands"
      actions:
        - name: "echoHelloWorld"
          desc: "echo hello world with SSH"
          action: 
            type: "cmd"
            run: "uss issue ssh"
          mergeArgs:
            - sshArgs
            - zosmfArgs
          args:
            command: "echo \"Hello World!\""
        - name: "echoGoodbyeWorld"
          desc: "echo goodbye world with SSH"
          action: 
            type: "cmd"
            run: "uss issue ssh"
          mergeArgs:
            - sshArgs
            - zosmfArgs
          args:
            command: "echo \"Goodbye World!\""
    issue-tso:
      desc: "Start a TSO address space an issue commands"
      actions:
        - name: "startTSOAddressSpace"
          desc: "Starting a TSO address space to issue commands"
          action:
            type: "cmd"
            run: "tso start as"
          mergeArgs:
            - zosmfArgs
          args:
            account: ${account}
          jsonExtractor:
            tsoServletKey: $.data.servletKey     
        - name: "issueTSOStatus"
          desc: "Issue the status command"
          onError: "stopTSOAddressSpace"
          action:
            type: "cmd"
            run: "tso send as"
          mergeArgs:
            - zosmfArgs
          args:
            servletKey: ${extracted.tsoServletKey}
            data: "STATUS"
        - name: "issueTSOLISTALC"
          desc: "Issue the listalc command"
          onError: "stopTSOAddressSpace"
          action:
            type: "cmd"
            run: "tso send as"
          mergeArgs:
            - zosmfArgs
          args:
            servletKey: ${extracted.tsoServletKey}
            data: "LISTALC"
        - "stopTSOAddressSpace"
  actions:
    - name: "stopTSOAddressSpace"
      desc: "Stop the TSO address space (${extracted.tsoServletKey})"
      action:
        type: "cmd"
        run: "tso stop as"
      mergeArgs:
        - zosmfArgs
      args:
        servletkey: ${extracted.tsoServletKey}
```

In the above example, we've defined two helper `tasks` called `issue-tso` and `issue-ssh`. The former, starts a TSO address space, issues 2 commands, and stops the TSO address space. The latter, issues 2 ssh commands. 

For these to run, we need to invoke them from the tasks (and we'll add the necessary user [input](./input.md) as well):
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
  account: 
    desc: "Your account information"
    sources:
      - user
      - env
      - prompt

args:
  zosmfArgs:
    host: ${host}
    port: ${port}
    user: ${user}
    password: ${password}
    rejectUnauthorized: false
  sshArgs:
    port: 22

tasks:
  multiple:
    async: true
    tasks:
      - "issue-ssh"
      - "issue-tso"
```

We now have defined our [input](./input.md) and our [args](./args.md) and our [tasks](./starter.md). Notice however, that this set of tasks are NOT a list of `actions`, but rather a list of sub-`tasks`. We've also specified the `async: true` property to indicate that we would like these two tasks to run asynchronously. They don't depend on each other, so its fine to do this and will reduce the time it tasks to run our full task list.

In our `tasks` array, we didn't need to define the tasks inline, we simply gave it the name of the `helper` task we had defined under the `helpers` property in our `zowe-tasks.yml`. 

Similarly, you'll notice that the final action of the `issue-tso` task is `- "stopTSOAddressSpace"`. The same concept applies for `actions`. Instead of defining the `action` inline under the task, you can simply "point" to a helper `action` defined under `helpers.actions`. 

Now if we issue `zowe tasks run`:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.zosmf.host
The port of your z/OSMF instance "port": 12345
Your user ID for z/OSMF "user": mytsouser
Your password for z/OSMF "password" (masked):
Your account information "account": "myaccountinfo"

Task - multiple - "undefined"
   ✔   Running Tasks "issue-ssh,issue-tso"

```

Notice that both `issue-ssh` and `issue-tso` ran simultaneously. If we had more tasks in our `tasks` stream, they would wait for both of those to complete before starting. 