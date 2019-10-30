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
import { Session } from "@zowe/imperative";
import BaseZosmfFunc from "./BaseZosmfFunc";
import { Upload } from "@zowe/cli";

export default class UploadDirToUSS extends BaseZosmfFunc {
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {
        await Upload.dirToUSSDirRecursive(session as any,
            params.action.args.source,
            params.action.args.dest, {...params.action.args.options});
        return;
    }
}
