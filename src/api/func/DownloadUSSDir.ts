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
import * as path from "path";
const mkdirp = require("mkdirp");

export default class DownloadUSSDir extends BaseZosmfFunc {
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {
        const dl: string[] = [];
        await this.buildList(session, params.action.args.path, dl);
        mkdirp.sync(params.action.args.path);
        for (const dlpath of dl) {
            const remotePath: string = dlpath.replace(params.action.args.path, "");
            const localPath: string = path.join(params.action.args.dest, remotePath);
            await Download.ussFile(session as any, dlpath,
                {
                    binary: params.action.args.binary,
                    file: localPath
                });
        }
        return;
    }

    private async buildList(session: Session, filepath: string, list: string[]) {
        const fl: IZosFilesResponse = await List.fileList(session as any, filepath);
        for (const details of fl.apiResponse.items) {
            if (details.name !== "." && details.name !== "..") {
                if (details.mode.startsWith("-")) {
                    list.push(path.posix.join(filepath, details.name));
                } else {
                    await this.buildList(session, path.posix.join(filepath, details.name), list);
                }
            }
        }
    }
}
