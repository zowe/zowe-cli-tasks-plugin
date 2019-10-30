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
import { ImperativeError, Session } from "@zowe/imperative";
import FuncException from "../exception/FuncException";
import BaseZoweFunc from "./BaseZoweFunc";

export default abstract class BaseZosmfFunc extends BaseZoweFunc {
    protected async execZowe(params: IFuncParameters): Promise<any> {
        let response;
        try {
            const session = new Session({
                type: "basic",
                hostname: params.action.args.host,
                port: params.action.args.port,
                password: params.action.args.password,
                user: params.action.args.user,
                rejectUnauthorized: params.action.args.rejectUnauthorized
            });
            response = await this.execZosmf(params, session);
        } catch (err) {
            if (err instanceof ImperativeError) {
                let msg = `${err.message}`;
                if (err.additionalDetails) {
                    msg += `\n${err.additionalDetails}`;
                }
                throw new FuncException(msg);
            } else {
                throw err;
            }
        }
        return response;
    }

    protected abstract async execZosmf(params: IFuncParameters, session: Session): Promise<any>;
}
