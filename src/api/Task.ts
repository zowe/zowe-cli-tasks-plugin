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

import { IRunTask } from "./interface/task/IRunTask";
import { ITask } from "./interface/config/ITask";
import { IWatch } from "./interface/config/IWatch";
import Action from "./Action";
import { IAction } from "./interface/config/IAction";
import { INamedTask } from "./interface/task/INamedTask";
import Tasks from "./Tasks";
import TaskException from "./exception/TaskException";
import BaseRunner from "./BaseRunner";
import ZoweTasksException from "./exception/ZoweTasksException";
const chokidar = require("chokidar");
import * as nodepath from "path";
import Utils from "./Utils";
const ora = require("ora");

export default class Task extends BaseRunner {
    public static async run(params: IRunTask) {
        const task: Task = new Task(params);
        BaseRunner.FileSequenceIndex++;
        task.logDir = nodepath.join(task.logDir, "task_sequence_" + BaseRunner.FileSequenceIndex + "_" + task.name);
        if (task.extractedOutput == null) {
            task.extractedOutput = {};
        }
        Utils.traverse(task.task, task.extractedOutput, "extracted.");
        await task.runTask();
    }

    protected name: string;
    private task: ITask;
    private msgPrefix: string = "";

    private constructor(params: IRunTask) {
        super(params);
        this.name = params.name;
        this.msgPrefix = (params.msgPrefix == null) ? "" : params.msgPrefix;
        this.task = JSON.parse(JSON.stringify(params.task));
    }

    /**
     * Perform the requested task.
     */
    private async runTask() {

        // Log that we're starting the task
        this.logTaskStart();

        // Run the actions or the watch
        if (this.task.actions != null) {
            for (const action of this.task.actions) {
                if (typeof action === "string") {
                    let actn: IAction;
                    try {
                        actn = this.helperActionByName(action);
                    } catch (err) {
                        this.logTaskFailed(err.message);
                        throw err;
                    }
                    if (actn == null) {
                        const err: string = `Could not run action "${action}". No helper action defined with name "${action}".`;
                        this.logTaskFailed(err);
                        throw new TaskException(err);
                    } else {
                        await this.runAction(actn);
                    }
                } else {
                    await this.runAction(action);
                }
            }
        } else if (this.task.watch != null) {
            await this.runWatch(this.task.watch);
        } else if (this.task.tasks) {
            await this.runTasks();
        } else {
            const err: string = `Task "${this.name} does not specify "actions" or "watch".`;
            this.logTaskFailed(err);
            throw new TaskException(err);
        }
    }

    /**
     * Run a set of tasks synchronously or async
     */
    private async runTasks() {
        const tsks: INamedTask[] = [];
        for (const task of this.task.tasks) {
            if (typeof task === "string") {
                try {
                    const t = this.locateTask(task);
                    tsks.push({
                        name: task,
                        task: t
                    });
                } catch (err) {
                    this.logTaskFailed(`Task "${task}" not found.`);
                    throw err;
                }
            } else {
                tsks.push({
                    name: task.name,
                    task: task.task
                });
            }
        }

        // Run the set of tasks async
        if (this.task.async) {
            const promises = [];

            // Build a list of task names to run
            const names: string[] = [];
            tsks.forEach((t) => {
                names.push(t.name);
            });

            // Start the spinner for the tasks and silence the tasks/actions
            // That might run during the async task block
            // TODO: There is probably a better way to handle this besides
            // TODO: globally silencing the tasks.
            const spinner = ora({
                text: `  Running Tasks "${names.toString()}"`,
                prefixText: this.msgIndent + "  "
            });
            spinner.start();
            this.console.silent = true;

            // Build the list of task promises
            for (const tsk of tsks) {
                promises.push(Task.run({
                    logDir: this.logDir,
                    extracted: this.extractedOutput,
                    console: this.console,
                    config: this.config,
                    task: tsk.task,
                    name: tsk.name,
                    logOutput: this.logOutput,
                    msgIndent: this.msgIndent + BaseRunner.Indent
                }));
            }

            // Await all promises and handle all results
            const results = await Promise.all(promises.map((p) => p.catch((e) => e)));
            spinner.stop();
            this.console.silent = false;
            let err: boolean = false;
            for (const result of results) {
                if (result instanceof Error) {
                    // First error, issue the failed task message
                    if (!err) {
                        this.console.log(this.msgIndent + `   \u2716   Running Tasks "${names.toString()}"`);
                    }

                    // Log the task failure and indicate error for surfacing.
                    // TODO: This doesn't work.
                    this.logTaskFailed(result.message);
                    err = true;
                }
            }

            // surface the error
            if (err) {
                throw new TaskException(`Async task set failed.`);
            }

            // Success message
            this.console.log(this.msgIndent + `   \u2714   Running Tasks "${names.toString()}"`);
        } else {

            // Run the tasks synchronously
            for (const tsk of tsks) {
                await Task.run({
                    logDir: this.logDir,
                    extracted: this.extractedOutput,
                    console: this.console,
                    config: this.config,
                    task: tsk.task,
                    name: tsk.name,
                    logOutput: this.logOutput,
                    msgIndent: this.msgIndent + BaseRunner.Indent
                });
            }
        }
    }

    /**
     * Invoke the action and handle any errors, changes in flow
     * @param action The action to invoke
     */
    private async runAction(action: IAction) {
        // Run the action
        try {
            await Action.run({
                logDir: this.logDir,
                extracted: this.extractedOutput,
                console: this.console,
                config: this.config,
                action,
                name: action.name,
                logOutput: this.logOutput,
                msgIndent: this.msgIndent
            });
        } catch (err) {
            // Surface the error to the caller to indicate that the task
            // execution has failed.
            if (err instanceof ZoweTasksException) {
                throw new TaskException(err.message, err);
            } else {
                throw err;
            }
        }
    }

    /**
     * Establish a file watcher that will invoke the specified tasks when
     * the watcher is triggered.
     * @param watch See the interface for details.
     */
    private async runWatch(watch: IWatch) {
        // Establish the watcher
        const watcher = chokidar.watch(watch.glob, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true
        });

        // On error handler
        watcher.on("error", (err: any) => {
            this.console.error(`Watch Error: ${err}`);
        });

        // Establish the watcher for onChange
        watcher.on("change", (path: string, stats: any) => {
            const vars = {
                onChangeFileName: nodepath.basename(path),
                onChangeFullPath: path,
                onChangeStats: stats
            };
            this.console.log(`File "${path}" changed.`);
            if (watch.onChange != null) {
                this.runWatchTasks(watch.onChange, vars);
            }
        });

        // Add event
        watcher.on("add", (path: string, stats: any) => {
            const vars = {
                onAddFileName: nodepath.basename(path),
                onAddFullPath: path,
                onAddStats: stats
            };
            this.console.log(`File "${path}" added.`);
            if (watch.onAdd != null) {
                this.runWatchTasks(watch.onAdd, vars);
            }
        });

        // Add unlink (delete) event
        watcher.on("unlink", (path: string, stats: any) => {
            const vars = {
                onUnlinkFileName: nodepath.basename(path),
                onUnlinkFullPath: path,
                onUnlinkStats: stats
            };
            this.console.log(`File "${path}" added.`);
            if (watch.onUnlink != null) {
                this.runWatchTasks(watch.onUnlink, vars);
            }
        });

        // Add addDir (delete) event
        watcher.on("addDir", (path: string, stats: any) => {
            const vars = {
                onAddDirFullPath: path,
                onAddDirStats: stats
            };
            this.console.log(`Directory "${path}" added.`);
            if (watch.onAddDir != null) {
                this.runWatchTasks(watch.onAddDir, vars);
            }
        });

        // Add unlinkDir (delete) event
        watcher.on("unlinkDir", (path: string, stats: any) => {
            const vars = {
                onUnlinkDirFullPath: path,
                onUnlinkDirStats: stats
            };
            this.console.log(`Directory "${path}" added.`);
            if (watch.onUnlinkDir != null) {
                this.runWatchTasks(watch.onUnlinkDir, vars);
            }
        });
    }

    /**
     * After a watch is fired, run the tasks specified
     * @param strTasks The tasks (by name) to run
     * @param vars The variables extracted to pass to the tasks
     */
    private runWatchTasks(strTasks: string[], vars: any) {
        // Create a list of changed names
        const tasks: INamedTask[] = [];
        for (const fail of strTasks) {
            const tsk: ITask = this.locateTask(fail);
            tasks.push({
                name: fail,
                task: tsk
            });
        }

        // Run the tasks
        Tasks.run({
            logDir: this.logDir,
            extracted: vars,
            console: this.console,
            config: this.config,
            tasks,
            logOutput: this.logOutput,
            msgIndent: this.msgIndent
        }).then(() => {
            // empty
        }).catch((err) => {
            this.logTaskFailed(err.message);
        });
    }

    /**
     * Log the task start message
     */
    private logTaskStart() {
        this.console.log(this.msgIndent + this.msgPrefix + `Task - ${this.name} - "${this.task.desc}"`);
    }

    /**
     * Log that the task failed
     */
    private logTaskFailed(msg: string) {
        this.console.error("");
        this.console.errorHeader(`Task "${this.name}" (${this.task.desc}) Failed`);
        this.console.logMultiLineError("   ", msg);
    }
}
