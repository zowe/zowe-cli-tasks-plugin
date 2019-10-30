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
import { List, IZosFilesResponse, Download } from "@zowe/cli";
import FuncException from "../exception/FuncException";

export default class DownloadUSSFile extends BaseZosmfFunc {
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {
        const fl: IZosFilesResponse = await List.fileList(session as any, params.action.args.path);
        if (fl.apiResponse.items.length > 1) {
            throw new FuncException(`Listing path "${params.action.args.path}" returned ${fl.apiResponse.items.length} items.` +
                `\nMust be a directory?`);
        }

        await Download.ussFile(session as any, params.action.args.path,
            {
                binary: params.action.args.binary,
                file: params.action.args.dest
            });

        return;
    }
}
