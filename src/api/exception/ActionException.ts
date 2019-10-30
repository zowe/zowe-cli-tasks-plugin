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

import ZoweTasksException from "./ZoweTasksException";
import { IAction } from "../interface/config/IAction";
const chalk = require("chalk");

export default class ActionException extends ZoweTasksException {
    public action: IAction;

    /**
     * The base Action exception.
     * @param message The message for the error.
     * @param action The action object.
     */
    constructor(message: string, action: IAction) {
        super(message + "\n" + `The action in progress was "${chalk.yellow(action.name)}".`);
        this.action = action;
    }
}
