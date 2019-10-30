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
import { Dataset } from "../zosmf/Dataset";
import FuncException from "../exception/FuncException";

export default class UploadGlobToPds extends BaseZosmfFunc {
    private static readonly MaxMemberLength = 8;
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {

        // Ensure the dataset already exists
        const destDs = params.action.args.dest.toUpperCase();
        if (!(await Dataset.exists(session, destDs))) {
            throw new FuncException(`Data set "${destDs}" does not exist`);
        }

        // Build the glob list for files to upload
        const globOpts = { ...params.action.args.globOpts } || {};
        globOpts.nodir = true;
        const files: string[] = glob.sync(params.action.args.glob,
            globOpts);
        for (const file of files) {
            let fp = file;
            if (globOpts.cwd) {
                fp = path.join(globOpts.cwd, fp);
            }

            // If necessary, truncate the file name to 8 characters
            const filename = path.basename(fp).split(".").slice(0, -1).join(".");
            const member = (filename.length <= UploadGlobToPds.MaxMemberLength) ?
                filename : filename.substring(0, UploadGlobToPds.MaxMemberLength);
            if (filename.length > UploadGlobToPds.MaxMemberLength) {
                this.warnings.push(`Filename "${filename}" truncated to member name "${member}".`);
            }

            // Upload to the dataset
            const options = {...params.action.args.options} || {};
            await Upload.fileToDataset(session as any, fp, `${destDs}(${member})`, options);
        }
    }
}
