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

import { IBaseRunner } from "./interface/run/IBaseRunner";
import RunConsole from "./RunConsole";
import { IConfig } from "./interface/config/IConfig";
import { ITask } from "./interface/config/ITask";
import { IAction } from "./interface/config/IAction";
import ConfigException from "./exception/ConfigException";
import { join, resolve } from "path";
import * as fs from "fs";
import InputException from "./exception/InputException";
const mkdirp = require("mkdirp");

export default abstract class BaseRunner {
    protected static Indent: string = "       ";
    protected static FileSequenceIndex: number = 0;

    protected extractedOutput: { [key: string]: any };
    protected logDir: string;
    protected console: RunConsole;
    protected config: IConfig;
    protected logOutput: boolean;
    protected msgIndent: string = "";

    constructor(params: IBaseRunner) {
        this.extractedOutput = params.extracted;
        this.console = params.console;
        this.config = params.config;
        this.logOutput = params.logOutput || false;
        this.logDir = params.logDir;
        this.msgIndent = params.msgIndent;
        if (this.logDir == null) {
            throw new InputException(`A log directory must be provided.`);
        }
    }

    // /**
    //  * Given an object, traverse all keys and resolve any extracted variables.
    //  * @param object The object to resolve (normally a task or action)
    //  */
    // protected traverseAndResolve(object: any) {
    //     Object.keys(object).forEach((value) => {
    //         if (Array.isArray(object[value])) {
    //             for (const entry of object[value]) {
    //                 this.traverseAndResolve(entry);
    //             }
    //             return;
    //         }
    //         if (object[value] !== null && typeof object[value] === "object") {
    //             this.traverseAndResolve(object[value]);
    //             return;
    //         }
    //         if (typeof object[value] === "string") {
    //             this.resolve(object, value);
    //         }
    //     });
    // }

    // /**
    //  * Given a property on an object, resolve any extracted variables.
    //  * @param object The object which contains "property"
    //  * @param property The property to attempt to resolve extracted variables.
    //  */
    // protected resolve(object: any, property: string) {
    //     const reg = /\${\S+}/g;
    //     let str: string = object[property];
    //     let result;
    //     while ((result = reg.exec(str)) !== null) {
    //         for (const prop of Object.keys(this.extractedOutput)) {
    //             if (str.indexOf(`\$\{extracted.${prop}\}`) >= 0) {
    //                 object[property] = str.replace(`\$\{extracted.${prop}\}`, this.extractedOutput[prop]);
    //                 str = object[property];
    //                 // TODO: if all are resolved, we can break
    //             }
    //         }
    //     }
    // }

    /**
     * Given the name, search for the task in all possible locations.
     * @param name The task name.
     */
    protected locateTask(name: string): ITask {
        const tsk: ITask = this.taskByName(name) || this.helperTaskByName(name);
        if (tsk == null) {
            throw new ConfigException(`Task "${name}" does not exist.`);
        }
        return tsk;
    }

    /**
     * Locate a task object by name.
     * @param name The name of the task object to locate.
     */
    protected taskByName(name: string): ITask {
        if (this.config.tasks == null) {
            throw new ConfigException(`No tasks defined in config.`);
        } else {
            return this.config.tasks[name];
        }
    }

    /**
     * Locate a helper task by name
     * @param name The helper task to locate.
     */
    protected helperTaskByName(name: string): ITask {
        if (this.config.helpers != null) {
            if (this.config.helpers.tasks != null) {
                // TODO: Should this just throw an error?
                if (this.config.helpers.tasks[name] != null) {
                    return { ...this.config.helpers.tasks[name] };
                } else {
                    return undefined;
                }
            } else {
                throw new ConfigException(`Could not locate helper task "${name}". No helper tasks defined.`);
            }
        } else {
            throw new ConfigException(`Could not locate helper task "${name}". No helpers defined.`);
        }
    }

    /**
     * Locate a helper action by name
     * @param name The name of the helper action to locate
     */
    protected helperActionByName(name: string): IAction {
        if (this.config.helpers != null) {
            if (this.config.helpers.actions) {
                for (const action of this.config.helpers.actions) {
                    if (action.name === name) {
                        return { ...action };
                    }
                }
            } else {
                throw new ConfigException(`Could not locate helper action "${name}". No helper actions defined.`);
            }
        } else {
            throw new ConfigException(`Could not locate helper action "${name}". No helpers defined.`);
        }

        // TODO: Should this just throw an error?
        return undefined;
    }

    /**
     * Log a file to the log directory.
     * @param filename The filename to place in the log directory.
     * @param contents The contents of the file.
     */
    protected logFile(filename: string, contents: string, force = false): string {
        if (this.logOutput || force) {
            this.mkOutputDir();
            BaseRunner.FileSequenceIndex++;
            const fp = join(this.logDir, BaseRunner.FileSequenceIndex.toString() + "_" + filename);
            fs.writeFileSync(fp, contents);
            return resolve(fp);
        } else {
            return undefined;
        }
    }

    /**
     * If necessary, create the log directory
     */
    private mkOutputDir() {
        if (this.logDir != null && !fs.existsSync(this.logDir)) {
            mkdirp.sync(this.logDir);
        }
    }
}
