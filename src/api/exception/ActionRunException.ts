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

import { IAction } from "../interface/config/IAction";
import ActionException from "./ActionException";

export default class ActionRunException extends ActionException {
    /**
     * Errors that might occur while running the command, function, exec,
     * or javascript action. (runtime errors for the action)
     * @param message The message for the error.
     * @param action The action object.
     */
    constructor(message: string, action: IAction) {
        super(message, action);
    }
}
