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

import { IFuncParameters } from "../interface/func/IFuncParameters";
import { ImperativeError } from "@zowe/imperative";
import FuncException from "../exception/FuncException";
import BaseFunc from "./BaseFunc";

export default abstract class BaseZoweFunc extends BaseFunc {
    protected async exec(params: IFuncParameters): Promise<any> {
        let response;
        try {
            response = await this.execZowe(params);
        } catch (err) {
            if (err instanceof ImperativeError) {
                let msg = `${err.message}`;
                if (err.additionalDetails) {
                    msg += `\n\n${err.additionalDetails}`;
                }
                throw new FuncException(msg);
            } else {
                throw err;
            }
        }
        return response;
    }

    protected abstract async execZowe(params: IFuncParameters): Promise<any>;
}
