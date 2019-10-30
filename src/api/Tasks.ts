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

import BaseRunner from "./BaseRunner";
import { IRunTasks } from "./interface/task/IRunTasks";
import Task from "./Task";
import { INamedTask } from "./interface/task/INamedTask";

export default class Tasks extends BaseRunner {
    public static async run(params: IRunTasks) {
        const tasks: Tasks = new Tasks(params);

        // If extracted vars are passed, we'll use those on each run
        // any extracted variables during tasks and not persisted to the next
        // task run (vars have a scope of a task, except these)
        if (params.extracted != null) {
            tasks.useExtracted = params.extracted;
        }

        // Run the tasks
        await tasks.perform();
    }

    private tasks: INamedTask[];
    private useExtracted: { [key: string]: any };
    private msgPrefix: string = "";

    private constructor(params: IRunTasks) {
        super(params);
        this.tasks = params.tasks;
        this.msgPrefix = (params.msgPrefix == null) ? "" : params.msgPrefix;
    }

    private async perform() {
        for (const task of this.tasks) {
            await this.invoke(task);
        }
    }

    private async invoke(task: INamedTask) {
        // clear the extracted output for each task run and replace with the
        // input if desired.
        if (this.useExtracted != null) {
            this.extractedOutput = {...this.useExtracted};
        } else {
            this.extractedOutput = {};
        }
        await Task.run({
            config: this.config,
            logDir: this.logDir,
            console: this.console,
            task: task.task,
            name: task.name,
            extracted: this.extractedOutput,
            logOutput: this.logOutput,
            msgIndent: this.msgIndent
        });
    }
}
