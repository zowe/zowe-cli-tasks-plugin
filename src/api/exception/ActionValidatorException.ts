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
import { IValidator } from "../interface/config/IValidator";
import ActionException from "./ActionException";

export default class ActionValidatorException extends ActionException {
    /**
     * Exception generated when a validator fails an action.
     * @param message The message for the error.
     * @param action The action object.
     * @param validator The validator used that failed.
     */
    constructor(message: string, action: IAction, public validator: IValidator) {
        super(message, action);
    }
}
