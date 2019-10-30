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
const glob = require("glob");
import * as path from "path";

export default class UploadGlobToUSS extends BaseZosmfFunc {
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {
        const files: string[] = glob.sync(params.action.args.glob,
            { ...params.action.args.globOpts });
        for (const file of files) {
            let fp = file;
            if (params.action.args.globOpts.cwd) {
                fp = path.join(params.action.args.globOpts.cwd, fp);
            }
            await Upload.fileToUSSFile(session as any, fp,
                path.posix.join(params.action.args.dest, file),
                params.action.args.binary);
        }
        return;
    }
}
