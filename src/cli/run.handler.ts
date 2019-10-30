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

import {
    ICommandHandler,
    IHandlerParameters,
    ImperativeError
} from "@zowe/imperative";
import { ITask } from "../api/interface/config/ITask";
import { IConfig } from "../api/interface/config/IConfig";
import Config from "../api/Config";
import Tasks from "../api/Tasks";
import { INamedTask } from "../api/interface/task/INamedTask";
import RunConsole from "../api/RunConsole";
import ZoweTasksException from "../api/exception/ZoweTasksException";

/**
 * This class is used by the various handlers in the project as the base class for their implementation.
 */
export default class RunHandler implements ICommandHandler {
    private config: IConfig;
    private runConsole: RunConsole;
    private params: IHandlerParameters;
    private configLoader: Config;
    private outputDir: string;

    public process(params: IHandlerParameters): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.params = params;
            this.runConsole = new RunConsole(params.response.console);

            // Try to load the config yaml
            (async () => {
                try {
                    this.configLoader = await Config.load({
                        configPath: params.arguments.configFile,
                        userConfigPaths: params.arguments.userConfigFiles
                    });
                    this.config = this.configLoader.config;
                } catch (err) {
                    this.params.response.console.errorHeader(`Error Loading Config`);
                    this.params.response.console.error(err.message);
                    reject();
                    return;
                }

                this.params.response.console.log("");

                // Create the output directory.
                this.outputDir = this.buildOutputPath();

                // If requested, run a specific task
                const runTask = params.arguments.task;
                if (runTask) {

                    // If the argument is a regular expression, build the
                    // set of tasks to run from checking for matches
                    if (params.arguments.regex === true) {
                        const runMatchedTasks: INamedTask[] = [];
                        const allTasks: INamedTask[] = this.configLoader.tasks;
                        const regex = new RegExp(params.arguments.task);
                        for (const matchTsk of allTasks) {
                            if (matchTsk.name.match(regex) != null) {
                                runMatchedTasks.push(matchTsk);
                            }
                        }

                        // If no matches were found, return an error, otherwise
                        // run the set of tasks synchronously.
                        if (runMatchedTasks.length === 0) {
                            throw new ImperativeError({
                                msg: `No tasks matched input RegEx: ${params.arguments.task}.`
                            });
                        } else {
                            await Tasks.run({
                                logDir: this.outputDir,
                                console: this.runConsole,
                                config: this.config,
                                tasks: runMatchedTasks,
                                logOutput: params.arguments.logOutput,
                                msgIndent: ""
                            });
                        }
                    } else {

                        // The argument is not a regular expression, locate
                        // and run the specified task.
                        const task: ITask = this.taskByName(runTask);
                        if (task) {
                            await Tasks.run({
                                logDir: this.outputDir,
                                console: this.runConsole,
                                config: this.config,
                                tasks: [
                                    {
                                        name: runTask,
                                        task
                                    }
                                ],
                                logOutput: params.arguments.logOutput,
                                msgIndent: ""
                            });
                        } else {
                            throw new ImperativeError({
                                msg: `Task "${runTask}" does not exist in config file:` +
                                    `\n${this.configLoader.path}`
                            });
                        }
                    }
                } else {
                    const namedTasks: INamedTask[] = [];
                    Object.keys(this.config.tasks).forEach((tsk) => {
                        namedTasks.push({
                            name: tsk,
                            task: this.config.tasks[tsk]
                        });
                    });
                    await Tasks.run({
                        logDir: this.outputDir,
                        console: this.runConsole,
                        config: this.config,
                        tasks: namedTasks,
                        logOutput: params.arguments.logOutput,
                        msgIndent: ""
                    });
                }

                resolve();
            })().catch((err) => {
                // If the error is a Zowe tasks exception, then it has already
                // been properly logged.
                if (!(err instanceof ZoweTasksException)) {
                    reject(err);
                } else {
                    reject();
                }
            });
        });
    }

    /**
     * Given a name, get the task object.
     * @param name The name of the task to retrieve its object.
     */
    private taskByName(name: string): ITask {
        return this.config.tasks[name] ||
            ((this.config.helpers != null && this.config.helpers.tasks != null) ? this.config.helpers.tasks[name] : undefined);
    }

    /**
     * Create an output directory for the task/actions.
     */
    private buildOutputPath(): string {
        const date = new Date();
        const dateDir = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_` +
            `time_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}_${date.getMilliseconds()}ms`;
        const dir: string = `${this.config.outputDir || "zowe-tasks-out"}/${dateDir}`;
        return dir;
    }
}
