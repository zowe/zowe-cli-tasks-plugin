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

import { IFunc } from "../interface/func/IFunc";
import { IFuncParameters } from "../interface/func/IFuncParameters";
import { IRunResult } from "../interface/run/IRunResult";

export default abstract class BaseFunc implements IFunc {
    protected warnings: string[] = [];
    public async func(params: IFuncParameters): Promise<IRunResult> {
        return {
            warnings: this.warnings,
            data: await this.exec(params)
        };
    }

    protected abstract exec(params: IFuncParameters): Promise<any>;
}
