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

import { IHandlerResponseConsoleApi } from "@zowe/imperative";
const chalk = require("chalk");

export default class RunConsole {
    public silent: boolean = false;

    constructor(private console: IHandlerResponseConsoleApi) {
    }


    /**
     * Log a multiline error message
     * @param indent The indentation to use for the error
     * @param message The message to log
     */
    public logMultiLineError(indent: string, message: string) {
        if (!this.silent) {
            message.split("\n").forEach((msg) => {
                this.console.error(`${indent}${msg}`);
            });
        }
    }

    public logMultiLineFuncWarning(indent: string, warnings: string[]) {
        if (!this.silent) {
            warnings.forEach((msg) => {
                this.console.error(`          ${indent}${chalk.yellow("[warn]")} ${msg}`);
            });
        }
    }

    public logMultiLineFuncInfo(indent: string, info: string[]) {
        if (!this.silent) {
            info.forEach((msg) => {
                this.console.error(`          ${indent}${chalk.green("[info]")} ${msg}`);
            });
        }
    }

    public logMultiLineFuncError(indent: string, errors: string[]) {
        if (!this.silent) {
            errors.forEach((msg) => {
                this.console.error(`          ${indent}${chalk.red("[error]")} ${msg}`);
            });
        }
    }

    public log(msg: string) {
        if (!this.silent) {
            this.console.log(msg);
        }
    }

    public error(msg: string) {
        if (!this.silent) {
            this.console.error(msg);
        }
    }

    public errorHeader(header: string) {
        if (!this.silent) {
            this.console.errorHeader(header);
        }
    }
}
