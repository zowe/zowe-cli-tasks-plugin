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

import { IFuncLogger } from "./interface/func/IFuncLogger";

export default class FuncLogger implements IFuncLogger {
    public info(message: string) {
        // empty
    }

    public warn(message: string) {
        // empty
    }

    public error(message: string) {
        // empty
    }
}
