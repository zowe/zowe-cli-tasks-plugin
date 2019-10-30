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

import ActionValidatorUnexpectedException from "./exception/ActionValidatorUnexpectedException";
import { IAction } from "./interface/config/IAction";

export default class ActionValidator {

    /**
     * Validator for actions. Uses eval to run the custom validation expression
     * that is specified by the user. "output" is not directly referenced in
     * this function, but can be used by the eval expression to check the
     * output/result of an action.
     * @param exp The expression to eval
     * @param output The output from an action
     * @param action The action itself
     */
    public static evaluate(exp: string, output: any, action: IAction): boolean {
        let result;
        try {
            // tslint:disable-next-line: no-eval
            result = eval(exp);
        } catch (err) {
            throw new ActionValidatorUnexpectedException(err.message, action);
        }
        return result;
    }
}

/**
 * Utility function available to the "eval" expression.
 * @param str The string to check for a match.
 * @param regex The regular expression to match.
 */
function match(str: string, regex: RegExp): boolean {
    return (str.match(regex)) ? true : false;
}
