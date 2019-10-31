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

import { IScript } from "../api/interface/script/IScript";
import { IScriptParameters } from "../api/interface/script/IScriptParameters";

export default class GetIPLVol implements IScript {
    public async run(params: IScriptParameters): Promise<any> {
        const volRegex = /VOLUME\((.*)\)/g;
        const matches = volRegex.exec(params.args.dIPLOutput);
        return matches[1];
    }
}
