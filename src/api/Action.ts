/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import { IRunAction } from "./interface/run/IRunAction";
import BaseRunner from "./BaseRunner";
import { IAction } from "./interface/config/IAction";
import ActionRunException from "./exception/ActionRunException";
import { IRunResult } from "./interface/run/IRunResult";
import ActionValidator from "./ActionValidator";
const JsonPath = require("jsonpath");
// const Spinner = require("cli-spinner").Spinner;
import Functions from "./Functions";
import { ICommandResponse, ICommandDefinition, CommandProcessor, Imperative } from "@zowe/imperative";
import { ProfileManagerFactory } from "./zowe/ProfileManagerFactory";
import FuncLogger from "./FuncLogger";
import ActionInputException from "./exception/ActionInputException";
import ActionValidatorException from "./exception/ActionValidatorException";
import Task from "./Task";
import Tasks from "./Tasks";
import { INamedTask } from "./interface/task/INamedTask";
import { IValidator } from "./interface/config/IValidator";
import { exec } from "child_process";
import Utils from "./Utils";
import { IScript } from "./interface/script/IScript";
import * as path from "path";
const chalk = require("chalk");
const ora = require("ora");

export default class Action extends BaseRunner {
    public static async run(params: IRunAction) {
        const action: Action = new Action(params);
        BaseRunner.FileSequenceIndex++;
        action.logDir = path.join(action.logDir, "action_sequence_" + BaseRunner.FileSequenceIndex + "_" + action.name);
        if (action.extractedOutput == null) {
            action.extractedOutput = {};
        }
        Utils.traverse(action.action, action.extractedOutput, "extracted.");

        // These options are mutually exclusive
        if (params.action.repeat != null &&
            params.action.repeat.forEach != null &&
            params.action.repeat.untilValidatorsPass != null) {
            const errmsg: string = `"repeat.forEach" and "repeat.untilValidatorsPass" are mutually exclusive.`;
            action.logActionFailed(errmsg);
            throw new ActionInputException(errmsg, action.action);
        }

        // If repeat is requested, we will spawn the action multiple times
        // depending on the repeat options
        if (params.action.repeat != null) {

            // For each spawns the action for each of the items in the array
            // supplied and passes the items as extracted variables
            if (params.action.repeat.forEach != null) {
                for (const fe of action.action.repeat.forEach) {
                    const actn = { ...action.action };
                    const extracted = { ...action.extractedOutput, ...fe };
                    delete actn.repeat;
                    await Action.run({
                        action: actn,
                        name: actn.name,
                        logDir: action.logDir,
                        extracted,
                        console: action.console,
                        config: action.config,
                        logOutput: action.logOutput,
                        msgIndent: action.msgIndent
                    });
                }
            } else if (params.action.repeat.untilValidatorsPass != null) {
                await action.repeatUntilValidatorsPass();
            } else {
                throw new ActionInputException(`No properties specified on "repeat".`, action.action);
            }
        } else {
            await action.runAction();
        }
    }

    protected name: string;
    private action: IAction;
    private result: IRunResult;
    private conditional: boolean;
    private successOnFail: boolean;
    private retries: number = 0;

    protected constructor(params: IRunAction) {
        super(params);
        this.name = params.name;
        this.conditional = params.conditional || false;
        this.successOnFail = params.action.successOnFail || false;

        // Every time the action is run, get a clean copy of the action,
        // it is "stateful" in that it will be modified here.
        this.action = JSON.parse(JSON.stringify(params.action));
    }

    /**
     * Run the action specified
     */
    private async runAction() {

        // If the conditions to run the action fail, then don't run the action
        if (!(await this.valid(this.action))) {
            this.console.log(`   \u2B07   Action (${this.name}) "${this.action.desc}"`);
            return;
        }

        // If the action is not silent, start the spinner
        let spinner;
        if (!this.console.silent) {
            spinner = ora({
                text: `  Action (${this.name}) "${this.action.desc}"`,
                prefixText: this.msgIndent + "  "
            });
            spinner.start();
        }

        let error;
        try {

            // Ensure both action and function are not set
            if (this.action.action == null) {
                throw new ActionInputException(`You must specify an action type: "cmd", "func", "host".`, this.action);
            }

            // Make sure that run is specified
            if (this.action.action.run == null) {
                throw new ActionInputException(`You must specify a value for the action's "run".`, this.action);
            }

            // Before we execute the desired action, merge any arguments
            this.mergeArgs();
            if (this.action.args != null) {
                const afp = `${this.name}.action.args.txt`;
                this.logFile(afp, JSON.stringify(this.action.args, null, 2));
            }

            // Run the desired command, function, exec, js, etc.
            switch (this.action.action.type) {
                case "cmd":
                    this.result = await this.runCmd();
                    break;
                case "func":
                    this.result = await this.runFunction();
                    break;
                case "exec":
                    this.result = await this.runExec();
                    break;
                case "js":
                    this.result = await this.runJS();
                    break;
                case "asyncjs":
                    this.result = await this.runAsyncJS();
                    break;
                case "script":
                    this.result = await this.runScript();
                    break;
                default:
                    throw new ActionInputException(`Unknown action type "${this.action.action.type}". ` +
                        `Specify "cmd", "func", or "host".`, this.action);
            }

            // Log the output if desired.
            const fp = `${this.name}.action.output.txt`;
            this.logFile(fp, (typeof this.result.data === "object") ?
                JSON.stringify(this.result.data, null, 2) : this.result.data);

            // Run the output validators
            await this.validateResult(this.result);

            // Check if extraction needs to be performed, and if so, extract
            // vars/etc. from the output of the action to use in downstream actions
            this.jsonExtract(this.result);
            this.outputExtract(this.result);

            // Log the extracted variables
            const efp = `${this.name}.action.extracted.txt`;
            this.logFile(efp, JSON.stringify(this.extractedOutput, null, 2));
        } catch (err) {
            error = err;
        }

        // Stop the spinner and log any messages
        // TODO: Figure out a better way
        if (spinner != null) {
            spinner.stop();
        }

        if (this.result && this.result.warnings != null && this.result.warnings.length > 0) {
            this.console.logMultiLineFuncWarning(this.msgIndent, this.result.warnings);
        }

        // Log the appropriate action complete message and throw and error
        // if the action failed.
        if (error) {

            // If this is a conditional action run, then check if the exception
            // is failing because of a validator, in which case, then mark
            // the action with the check mark
            if (this.conditional === true && error instanceof ActionValidatorException) {
                this.actionSuccessMsg();
            } else if (error instanceof ActionRunException && this.successOnFail) {
                this.actionSuccessMsg();
            } else {
                this.actionFailedMsg();
            }

            // If the error was from a validator, check to see if we need
            // to run the onFailure for the validator.
            if (error instanceof ActionValidatorException) {
                try {
                    await this.onValidatorError(error.validator);
                } catch (valErr) {
                    this.logActionFailed(`"validator.onFailure" exception:\n ${valErr.message}`);
                    throw valErr;
                }
            }

            // If an action exception if caught, check if there are any special
            // on error handlers for this particular action
            if (error instanceof ActionRunException) {
                try {
                    await this.onError(this.action);
                } catch (errErr) {
                    this.logActionFailed(`"onError" exception:\n${errErr.message}`);
                    throw errErr;
                }
            }

            // Log that the action failed
            if (this.conditional !== true && !this.successOnFail) {
                this.logActionFailed(error.message);
            }

            // Surface the error
            if (!this.successOnFail) {
                throw error;
            }
        } else {
            this.actionSuccessMsg();
        }
    }

    /**
     * Repeat an action until the validators validate the action.
     */
    private async repeatUntilValidatorsPass(): Promise<any> {
        let interval: number = 1000;
        let maxRetries: number = 0;
        if (typeof this.action.repeat.untilValidatorsPass === "object") {
            if (this.action.repeat.untilValidatorsPass.interval != null) {
                interval = this.action.repeat.untilValidatorsPass.interval;
            }
            if (this.action.repeat.untilValidatorsPass.maxRetries != null) {
                maxRetries = this.action.repeat.untilValidatorsPass.maxRetries;
            }
        }

        // Start a spinner indicating that we are repeating the action and
        // stop any further console output from the repeated action
        const spinner = ora({
            text: `  Repeating Action (${this.action.name}) Attempt - ` +
                `${this.retries}/${(maxRetries === 0) ? "infinite" : maxRetries}`,
            prefixText: this.msgIndent + "  "
        });
        this.console.silent = true;
        spinner.start();

        // Run the action
        try {
            await this.runRepeatAction(maxRetries, interval, spinner);
        } catch (err) {
            spinner.stop();
            this.console.silent = false;
            this.logActionFailed(err.message);
            throw err;
        }

        // Stop the spinner and allow console messages
        spinner.stop();
        this.console.silent = false;
        this.actionSuccessMsg();
    }

    /**
     * Repeats an action until either the max retries are hit, the validators
     * validate the action, OR a severe (non-validator) error occurs.
     * @param maxRetries The maximum number of retries
     * @param interval The interval (in ms) for each retry
     * @param spinner The spinner to update the text
     */
    private runRepeatAction(maxRetries: number, interval: number, spinner: any): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            this.retries++;
            const actn = { ...this.action };
            delete actn.repeat;
            this.console.silent = true;
            Action.run({
                action: actn,
                name: actn.name,
                logDir: this.logDir,
                extracted: this.extractedOutput,
                console: this.console,
                config: this.config,
                logOutput: this.logOutput,
                msgIndent: this.msgIndent,
                conditional: true
            }).then(() => {
                resolve();
            }).catch((err) => {
                // console.log(err);
                if (!(err instanceof ActionValidatorException)) {
                    reject(err);
                } else if (maxRetries !== 0 && this.retries >= maxRetries) {
                    const errmsg: string = `Max retries (${maxRetries}) attempted.`;
                    reject(new ActionRunException(errmsg, this.action));
                } else {
                    setTimeout(() => {
                        spinner.text = `  Repeating Action (${this.action.name}) Attempt - ` +
                            `${this.retries}/${(maxRetries === 0) ? "infinite" : maxRetries}`;
                        this.runRepeatAction(maxRetries, interval, spinner).catch((repeatErr) => {
                            reject(repeatErr);
                        }).then(() => {
                            resolve();
                        });
                    }, interval);
                }
            });
        });
    }

    /**
     * Output the message indicating that the action failed with the "x" mark
     * next to the action text.
     */
    private actionFailedMsg() {
        this.console.log(this.msgIndent + `   \u2716   Action (${this.name}) "${this.action.desc}"`);
        if (this.action.onErrorMsg != null) {
            this.console.logMultiLineFuncError(this.msgIndent, this.action.onErrorMsg.split("\n"));
        }
    }

    /**
     * Output the message indicating that the action succeeded with the check
     * mark next to the action text.
     */
    private actionSuccessMsg() {
        this.console.log(this.msgIndent + `   \u2714   Action (${this.name}) "${this.action.desc}"`);
        if (this.action.onSuccessMsg != null) {
            this.console.logMultiLineFuncInfo(this.msgIndent, this.action.onSuccessMsg.split("\n"));
        }
    }

    /**
     * If a validator fails and has an "onFailure" task list, run those
     * tasks now.
     * @param validator The validator that failed.
     */
    private async onValidatorError(validator: IValidator) {
        if (validator.onFailure != null) {
            const tasks: INamedTask[] = [];
            for (const task of validator.onFailure) {
                const tsk = this.locateTask(task);
                tasks.push({
                    name: task,
                    task: tsk
                });
            }
            await Tasks.run({
                logDir: this.logDir,
                extracted: this.extractedOutput,
                console: this.console,
                config: this.config,
                tasks,
                logOutput: this.logOutput,
                msgIndent: this.msgIndent + BaseRunner.Indent,
                msgPrefix: "(On Error) "
            });
        }
    }

    /**
     * If an error is detected in an action and the action has an "onError"
     * tasks specified, run that task now.
     * @param action The action that failed
     */
    private async onError(action: IAction) {
        if (action.onError != null) {
            const onErrTsk = this.locateTask(action.onError);
            await Task.run({
                logDir: this.logDir,
                extracted: this.extractedOutput,
                console: this.console,
                config: this.config,
                task: onErrTsk,
                name: action.onError,
                logOutput: this.logOutput,
                msgIndent: this.msgIndent + BaseRunner.Indent,
                msgPrefix: "(On Error) "
            });
        }
    }

    /**
     * After the command or function is ran, execute each validator against
     * the results of the run.
     * @param result The result from the run.
     */
    private async validateResult(result: IRunResult) {
        // If a validator is present, invoke on the output
        if (this.action.validators != null && this.action.validators.length > 0 && result.data != null) {
            for (const validator of this.action.validators) {
                const valid: boolean = ActionValidator.evaluate(validator.exp, result.data, this.action);
                if (!valid) {

                    let file;
                    if (this.logOutput || !this.conditional) {
                        const data: string = (typeof result.data === "object") ? JSON.stringify(result.data, null, 2) : result.data;
                        const fp = `${this.name}.action.failed.validator.txt`;
                        file = this.logFile(fp, data, true);
                    }
                    let errMsg: string = `${chalk.blue(`Action Failed by Validator:`)}\n${validator.exp}`;
                    if (file != null) {
                        errMsg += `\n\n${chalk.blue("Action Output:")}\n${file}`;
                    }
                    throw new ActionValidatorException(errMsg, this.action, validator);
                }
            }
        } else if (this.action.validators != null && this.action.validators.length > 0 && result.data == null) {
            result.warnings.push(`Validators are present, but this action has no output.`);
        }
    }

    /**
     * Create a javascript function and run it
     */
    private async runJS(): Promise<IRunResult> {

        // Construct the list of arguments to the function
        const argNames: string[] = [];
        const argValues: any[] = [];

        // This is a little hack that makes require available to this function
        // which will be created in the global scope.
        argNames.push("require");
        argValues.push(require);

        // Push the configuration as a parameter
        argNames.push("zoweTasksConfig");
        argValues.push(JSON.parse(JSON.stringify(this.config)));

        if (this.action.args) {
            Object.keys(this.action.args).forEach((arg) => {
                argNames.push(arg);
                argValues.push(this.action.args[arg]);
            });
        }

        // Create the function
        let func;
        try {
            func = new Function(...argNames, this.action.action.run);
        } catch (err) {
            throw new ActionRunException(`Failed to create new js function:\n${err.message}`, this.action);
        }

        // Invoke the function
        let result;
        try {
            result = func(...argValues);
        } catch (err) {
            throw new ActionRunException(`Function threw an error:\n${err.message}`, this.action);
        }


        // Return the results of the function
        return {
            data: result,
            warnings: []
        };
    }

    /**
     * Instantiate a user written script and run it
     */
    private async runScript(): Promise<IRunResult> {

        // Attempt to instantiate the script
        let script: IScript;
        try {
            const scriptPath = path.resolve(this.action.action.run);
            const relativePath = path.relative(__dirname, scriptPath);
            const scriptModule = require(relativePath);
            script = new scriptModule.default();
        } catch (err) {
            throw new ActionRunException(`Failed to instantiate script: ${err.message}`, this.action);
        }

        // Attempt to run the script
        let result;
        try {
            result = await script.run({
                config: JSON.parse(JSON.stringify(this.config)),
                args: (this.action.args == null) ? undefined : JSON.parse(JSON.stringify(this.action.args))
            });
        } catch (err) {
            throw new ActionRunException(`Script failed: ${err.message}`, this.action);
        }

        // Return the result of the script
        return {
            data: result,
            warnings: []
        };
    }

    /**
     * Run an async piece of JS code. Must invoke cb to indicate that it is
     * finished.
     */
    private runAsyncJS(): Promise<IRunResult> {
        return new Promise<IRunResult>((resolve, reject) => {
            // Construct the list of arguments to the function
            const argNames: string[] = [];
            const argValues: any[] = [];

            // This is a little hack that makes require available to this function
            // which will be created in the global scope.
            argNames.push("require");
            argValues.push(require);

            // Push the configuration as a parameter
            argNames.push("zoweTasksConfig");
            argValues.push(JSON.parse(JSON.stringify(this.config)));


            // callback
            const cb = (err: Error, rslt: any) => {
                if (err) {
                    reject(new ActionRunException(`Async js function error callback invoked: ${err.message}`, this.action));
                } else {
                    resolve({
                        data: rslt,
                        warnings: []
                    });
                }
            };
            argNames.push("cb");
            argValues.push(cb);

            // Push any remaining args
            if (this.action.args) {
                Object.keys(this.action.args).forEach((arg) => {
                    argNames.push(arg);
                    argValues.push(this.action.args[arg]);
                });
            }
            // Create the function
            let cont: boolean = true;
            let func;
            try {
                func = new Function(...argNames, this.action.action.run);
            } catch (err) {
                cont = false;
                reject(new ActionRunException(`Failed to create new js function:\n${err.message}`, this.action));
            }

            // Create and call the function
            if (cont) {
                try {
                    func(...argValues);
                } catch (err) {
                    reject(new ActionRunException(`Function threw an error:\n${err.message}`, this.action));
                }
            }
        });
    }

    /**
     * Using node exec, run a host command.
     */
    private runExec(): Promise<IRunResult> {
        return new Promise<IRunResult>((resolve, reject) => {
            exec(this.action.action.run, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    // Error.message already contains stderr, we will append
                    // STDOUT in case it has any relevant information, also
                    // error.code should have the exit code of the command
                    let errMsg = (stdout != null && stdout.trim().length > 0) ? chalk.blue("Command Stdout:") + "\n" + stdout + "\n" : "";
                    errMsg += `Command failed with exit code "${error.code}".`;
                    reject(new ActionRunException(`Failed to exec command: ${error.message}\n${errMsg}`, this.action));
                } else {
                    resolve({
                        data: {
                            stdout,
                            stderr
                        }
                    });
                }
            });
        });
    }

    /**
     * Run the built in function and return the results.
     */
    private async runFunction(): Promise<IRunResult> {
        let warnings: string[] = [];
        // Check for the built in function
        const builtIn = Functions.BuiltIn.get(this.action.action.run);
        let result: IRunResult;
        if (builtIn) {
            try {
                result = await builtIn.func({
                    logger: new FuncLogger(),
                    action: this.action
                });
            } catch (err) {
                throw new ActionRunException(err.message, this.action);
            }
            warnings = warnings.concat(result.warnings);
        } else {
            throw new ActionInputException(`Function "${this.action.action.run}" not available.`, this.action);
        }

        return {
            warnings,
            data: result.data
        };
    }

    /**
     * Run the CLI command handler specified and return the result.
     */
    private runCmd(): Promise<IRunResult> {
        return new Promise<IRunResult>((resolve, reject) => {
            // Get the command segments to help find the command in the tree
            const cmdSeg: string[] = this.action.action.run.trim().split(" ");
            for (let x = 0; x < cmdSeg.length; x++) {
                cmdSeg[x] = cmdSeg[x].trim();
            }

            // Locate the command in the tree
            const cmd = this.findCommand(this.action.action.run.split(" "), Imperative.fullCommandTree);

            // Construct all the necessary objects to invoke the command silently
            const help = Imperative.getHelpGenerator({
                commandDefinition: cmd,
                fullCommandTree: Imperative.fullCommandTree
            });
            const commandProcessor = new CommandProcessor({
                definition: cmd,
                helpGenerator: help,
                profileManagerFactory: new ProfileManagerFactory(Imperative.api),
                rootCommandName: "zowe",
                commandLine: this.action.action.run,
                envVariablePrefix: "ZOWE",
                promptPhrase: "prompt*"
            });

            // This is a hack because there are some strange errors that
            // can occur from some of the handlers
            process.removeAllListeners("uncaughtException");
            process.on("uncaughtException", (error: Error) => {
                process.removeAllListeners("uncaughtException");
                reject(new ActionRunException(`Command failed from uncaught exception:\n${error.message}`, this.action));
            });

            // Invoke the command
            // TODO: convert this to async so that the spinners work
            const args = { _: [""], $0: "", ...this.buildArguments() };
            // console.log(args);
            commandProcessor.invoke({
                arguments: args,
                silent: true,
                responseFormat: "json"
            }).then((response: ICommandResponse) => {
                if (response.success === false) {
                    let errMsg: string = "";
                    if (response.message === "Command syntax invalid") {
                        response.data.forEach((err: any) => {
                            errMsg += ((errMsg.length > 0) ? "\n" : "") + err.message;
                        });
                    } else {
                        let err: string = `The CLI "${chalk.yellow(this.action.action.run)}" command failed.`;
                        if (response.stderr.toString().trim().length > 0) {
                            err += `\n\n${chalk.blue("Command Stderr:")}\n\n${response.stderr.toString()}`;
                        }
                        if (response.stdout.toString().trim().length > 0) {
                            err += `\n\n${chalk.blue("Command Stdout:")}\n\n${response.stdout.toString()}`;
                        }
                        errMsg = err;
                    }

                    // Indicate that the command failed
                    const exp = new ActionRunException(errMsg, this.action);
                    reject(exp);
                } else if (response.exitCode != null && response.exitCode !== 0) {
                    let err: string = `Command exited with a non-zero code: ${response.exitCode}.`;
                    if (response.stderr.toString().trim().length > 0) {
                        err += `\nstderr:\n${response.stderr.toString()}`;
                    }
                    if (response.stdout.toString().trim().length > 0) {
                        err += `\nstdout:\n${response.stdout.toString()}`;
                    }

                    // Indicate that the command failed
                    reject(new ActionRunException(err, this.action));
                } else {

                    // Command has succeeded
                    (response as any).stderr = response.stderr.toString();
                    (response as any).stdout = response.stdout.toString();
                    resolve({
                        warnings: [],
                        data: response
                    });
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * Given the positional array of parameters, attempt to locate the command
     * definition in preparation for invoking the command handler.
     * @param segments The command segments (e.g. jobs ls jobs)
     * @param tree The command tree to search.
     */
    private findCommand(segments: string[], tree: ICommandDefinition): ICommandDefinition {
        for (const child of tree.children) {
            if (this.match(segments[0], child)) {
                if (segments.length === 1) {
                    return child;
                } else {
                    if (child.children && child.children.length > 0) {
                        segments.shift();
                        return this.findCommand(segments, child);
                    }
                }
            }
        }
        throw new ActionInputException(`Could not find command definition for "${segments[0]}"`, this.action);
    }

    /**
     * Find a command name match (including aliases).
     * @param name The command segment name
     * @param definition The command definition
     */
    private match(name: string, definition: ICommandDefinition): boolean {
        if (name === definition.name) {
            return true;
        }

        if (definition.aliases && definition.aliases.length > 0) {
            for (const alias of definition.aliases) {
                if (name === alias) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Merge any arguments into the configurations arguments
     */
    private mergeArgs() {
        if (this.config.args && this.action.mergeArgs && this.action.mergeArgs.length > 0) {
            if (this.action.args == null) {
                this.action.args = {};
            }
            this.action.mergeArgs.forEach((additional) => {
                if (this.config.args[additional]) {
                    this.action.args = { ...this.config.args[additional], ...this.action.args };
                }
            });
        }
        // console.log(this.action.args);
    }

    /**
     * Build the arguments to the command using the yargs style.
     * TODO: There is a bug with some handlers that are using the "-" style
     * TODO: of the arguments. We should convert any camel case to dash
     * TODO: case here.
     * @param action The action to build the arguments for.
     */
    private buildArguments(): { [key: string]: any } {
        const obj: any = this.action.args || {};
        if (this.action.args) {
            Object.keys(this.action.args).forEach((parm) => {
                obj[parm] = this.action.args[parm];
                const kebabCase = parm.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
                if (kebabCase !== parm) {
                    obj[kebabCase] = this.action.args[parm];
                }
                if (parm.indexOf("-") >= 0) {
                    const optSeg: string[] = parm.split("-");
                    for (let x = 1; x < optSeg.length; x++) {
                        optSeg[x] = optSeg[x].charAt(0).toUpperCase() + optSeg[x].slice(1);
                    }
                    obj[optSeg.join("")] = this.action.args[parm];
                }
            });
        }
        return obj;
    }

    /**
     * Validate that the action can be run if the conditions are met.
     * @param action The action to validate conditions for.
     */
    private async valid(action: IAction): Promise<boolean> {
        let valid: boolean = true;
        if (this.action.conditions && this.action.conditions.length > 0) {
            for (const actionCondition of action.conditions) {
                try {

                    // Actions can be specified inline or as a helper
                    if (typeof actionCondition === "object") {

                        // Run the condition action
                        await Action.run({
                            action: actionCondition,
                            name: actionCondition.name,
                            logDir: this.logDir,
                            extracted: this.extractedOutput,
                            console: this.console,
                            config: this.config,
                            conditional: true,
                            logOutput: this.logOutput,
                            msgIndent: this.msgIndent
                        });
                    } else if (typeof actionCondition === "string") {

                        // Attempt to locate the action by name and run it
                        const actn = this.helperActionByName(actionCondition);
                        if (actn == null) {
                            throw new ActionInputException(`Condition action "${actionCondition}" does not exist.`, this.action);
                        } else {
                            await Action.run({
                                action: actn,
                                name: actionCondition,
                                logDir: this.logDir,
                                extracted: this.extractedOutput,
                                console: this.console,
                                config: this.config,
                                conditional: true,
                                logOutput: this.logOutput,
                                msgIndent: this.msgIndent
                            });
                        }
                    }
                } catch (err) {
                    if (err instanceof ActionValidatorException) {
                        valid = false;
                        break;
                    } else {
                        this.logActionFailed(err.message);
                        throw err;
                    }
                }
            }
        }
        return valid;
    }

    /**
     * Given the results of a run and a jsonExtractor is specified, attempt to
     * extract from the JSON Results.
     * @param result The results from the run.
     */
    private jsonExtract(result: IRunResult) {
        if (this.action.jsonExtractor) {
            if (typeof result.data === "object") {
                Object.keys(this.action.jsonExtractor).forEach((key) => {
                    this.extractedOutput[key] = JsonPath.value(result.data, this.action.jsonExtractor[key]);
                });
            } else {
                result.warnings.push(`JSON extractor present, ` +
                    `but result data is not an object ("${typeof result.data}")`);
            }
        }
    }

    /**
     * If specified, set the specified vars to the output of the action.
     * @param result The results that contain the output.
     */
    private outputExtract(result: IRunResult) {
        if (this.action.outputExtractor != null && this.action.outputExtractor.length > 0) {
            for (const extractor of this.action.outputExtractor) {
                if (extractor.var != null) {
                    this.extractedOutput[extractor.var] = result.data;
                }
            }
        }
    }

    /**
     * Log that the action failed
     * @param msg The message to include
     */
    private logActionFailed(msg: string) {
        this.console.error("");
        const runStr = (this.action.action != null && this.action.action.run != null) ? this.action.action.run : "undefined";
        const maxLength = 18;
        const trimmedString = runStr.length > maxLength ? runStr.substring(0, maxLength) + "..." : runStr;
        this.console.errorHeader(`Action "${this.action.name}" (run: "${trimmedString}" ` +
            `desc: "${this.action.desc}") Failed`);
        this.console.logMultiLineError(this.msgIndent + "   ", msg);
    }
}
