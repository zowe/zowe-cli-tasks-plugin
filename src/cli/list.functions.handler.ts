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
    IHandlerParameters
} from "@zowe/imperative";
import Functions from "../api/Functions";

/**
 * This class is used by the various handlers in the project as the base class for their implementation.
 */
export default class ExecHandler implements ICommandHandler {
    public async process(params: IHandlerParameters): Promise<void> {
        const keyIter = Functions.BuiltIn.keys();
        let value;
        while ((value = keyIter.next().value) != null) {
            params.response.console.log(value);
        }
    }
}
