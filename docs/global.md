# Zowe Tasks global Property
In your [zowe-tasks.yml](./config.md) configuration file you can specify a global set of default variables using the `global` property. 

The complete example described in this document can be found [here](../example/more/global/zowe-tasks.yml).

Let's say we needed to create a set of data sets for our project and we wanted each data set to have the same HLQ pattern for every team member. 

In our `zowe-tasks.yml` file we an define a global variable called `dataSetHLQ` that can then be used throughout the `zowe-tasks.yml` tasks:
```yaml
global:
  dataSetHLQ: ${user}.MYPROJ
  dataSetsToCreate:
    - dataset: ${dataSetHLQ}.LOADLIB
      cmdType: "bin"
    - dataset: ${dataSetHLQ}.JCL
      cmdType: "classic"
```

Notice we have also defined an array of `dataSetsToCreate`, that can be used on `forEach`. 

`global` is a "free-form" object that you can create based on your needs. You can specify anything you'd like under `global` and it can be referenced throughout your scripts. 

We can then add some [input](./input.md) to our script to resolve `${user}`:
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
global:
  dataSetHLQ: ${user}.MYPROJ
  dataSetsToCreate:
    - dataset: ${dataSetHLQ}.LOADLIB
      cmdType: "bin"
    - dataset: ${dataSetHLQ}.JCL
      cmdType: "classic"
```

Notice that we have defined `user` as an input and are using it in `global.dataSetHLQ` to build our HLQ for the project. We are then using `global.dataSetHLQ` to build the list of data set names in `dataSetsToCreate`. 

Now we can write a task to create the data sets in our array:
```yaml
tasks:
  create-project-datasets:
    desc: "Create a few project data sets"
    actions:
      - name: "createLoadlib"
        desc: "Create the data set ${extracted.dataset}"
        repeat:
          forEach: ${dataSetsToCreate}
        conditions:
          - name: "checkIfLoadlibExists"
            desc: "Check if ${extracted.dataset} exists"
            action:
              type: "func"
              run: "datasetExists"
            mergeArgs:
              - zosmf
            args:
              dataset: ${extracted.dataset}
            validators:
              - exp: "output.exists === false"
        action:
          type: "cmd"
          run: "files create ${extracted.cmdType}"
        mergeArgs:
          - zosmf
        args:
          dataSetName: ${extracted.dataset}
```

In this example, we've created a single task with a single action. The action uses the `repeat.forEach` capability which iterates over the `dataSetsToCreate` array we defined in our `global` property. The action first checks if the data set exists, and if not, creates the data set. 

If we run `zowe tasks run`:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.zosmf.host
The port of your z/OSMF instance "port": 12345
Your user ID for z/OSMF "user": mytsouser
Your password for z/OSMF "password" (masked):

Task - create-project-datasets - "Create a few project data sets"
   ✔   Action (checkIfLoadlibExists) "Check if mytsouser.MYPROJ.LOADLIB exists"
   ✔   Action (createLoadlib) "Create the data set mytsouser.MYPROJ.LOADLIB"
   ✔   Action (checkIfLoadlibExists) "Check if mytsouser.MYPROJ.JCL exists"
   ✔   Action (createLoadlib) "Create the data set mytsouser.MYPROJ.JCL"
```

The first run will create all the data sets. A second run will skip the actions based on the `conditions` specified:
```
$ zowe tasks run
The hostname of your z/OSMF instance "host": my.zosmf.host
The port of your z/OSMF instance "port": 12345
Your user ID for z/OSMF "user": mytsouser
Your password for z/OSMF "password" (masked):

Task - create-project-datasets - "Create a few project data sets"
   ✔   Action (checkIfLoadlibExists) "Check if mytsouser.MYPROJ.LOADLIB exists"
   ⬇   Action (createLoadlib) "Create the data set mytsouser.MYPROJ.LOADLIB"
   ✔   Action (checkIfLoadlibExists) "Check if mytsouser.MYPROJ.JCL exists"
   ⬇   Action (createLoadlib) "Create the data set mytsouser.MYPROJ.JCL"
```

Notice the downward arrows indicate that the actions were skipped based on `conditions`. 
