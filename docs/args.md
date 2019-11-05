# Zowe Tasks args Property
In your [zowe-tasks.yml](./config.md) configuration file you can specify sets of arguments that can be re-used on actions using the `args` property.

The complete example described in this document can be found [here](../example/more/args/zowe-tasks.yml).

In most of our tasks, we're going to want to issue Zowe CLI commands. However, we don't want to have to specify the same set of arguments over and over (e.g. host, port, user, password) for each command.

We can use the `args` property to define named sets of arguments to reuse throughout our actions on the `mergeArgs` property:
```yaml
args:
  zosmfArgs:
    host: ${host}
    port: ${port}
    user: ${user}
    password: ${password}
    rejectUnauthorized: false
```

In the example above, we have provided a set of args called `zosmfArgs` that contains `host`, `port`, `user`, `password`, and `rejectUnauthorized`. 

However, we need to resolve, for example, `${host}`, so we'll add some [input](./input.md):
```yaml
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
args:
  zosmfArgs:
    host: ${host}
    port: ${port}
    user: ${user}
    password: ${password}
    rejectUnauthorized: false
```

Now we can write some tasks and re-use the `zosmfArgs` where needed:
```yaml
tasks:
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
helpers:
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

In the above example, we are starting a TSO address space, extracting the servlet key and issuing a couple commands before stopping the address space. 

We are using our `zosmfArgs` in each action to merge the `args` specified for the `run` command with `zosmfArgs`. Since `mergeArgs` is an array, we can specify a list of `args` sets that will be merged. Index 0 in the array (the first one) takes precedence. 

For example, if we look at `action` "startTSOAddressSpace". We see that its `args` property specifies `account` and we are also specifying `mergeArgs` with "zosmfArgs". When the `tso start as` command is run, the full set of merged args will include:
- `host`
- `port`
- `user`
- `password`
- `account`
- `rejectUnauthorized`

If we run `zowe run tasks`:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.zosmf.host
The port of your z/OSMF instance "port": 12345
Your user ID for z/OSMF "user": mytsouser
Your password for z/OSMF "password" (masked):
Your account information "account": "myaccount"

Task - issue-tso - "Start a TSO address space an issue commands"
   ✔   Action (startTSOAddressSpace) "Starting a TSO address space to issue commands"
   ✔   Action (issueTSOStatus) "Issue the status command"
   ✔   Action (issueTSOLISTALC) "Issue the status command"
   ✔   Action (stopTSOAddressSpace) "Stop the TSO address space (mytsouser-352-aafyaagq)"
```