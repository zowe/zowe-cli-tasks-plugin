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
const mkdirp = require("mkdirp");
import BaseFunc from "./BaseFunc";
export default class Mkdirp extends BaseFunc {
    protected async exec(params: IFuncParameters): Promise<any> {
        params.action.args.dirs.forEach((dir: string) => {
            mkdirp.sync(dir);
        });
    }
}
