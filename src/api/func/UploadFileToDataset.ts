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
import * as path from "path";
import { Dataset } from "../zosmf/Dataset";
import FuncException from "../exception/FuncException";
import * as fs from "fs";

export default class UploadFileToDataset extends BaseZosmfFunc {
    private static readonly MaxMemberLength = 8;
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {

        // Ensure the dataset already exists
        let destDs: string = params.action.args.dest.toUpperCase();
        let noMem = destDs;
        let ignoreFileAsMem: boolean = false;
        if (destDs.indexOf("(") >= 0) {
            noMem = destDs.split("(")[0].toUpperCase();
            if (params.action.args.fileAsMember === true) {
                this.warnings.push(`"dest" specifies a member. "fileAsMember" ignored.`);
                ignoreFileAsMem = true;
            }
        }
        if (!(await Dataset.exists(session, noMem))) {
            throw new FuncException(`Data set "${noMem}" does not exist`);
        }

        // Ensure the local file exists
        const fp: string = params.action.args.file;
        if (!fs.existsSync(fp)) {
            throw new FuncException(`Local file "${fp}" does not exist.`);
        }

        // If necessary, truncate the file name to 8 characters
        if (params.action.args.fileAsMember === true && !ignoreFileAsMem) {
            const filename = path.basename(fp).split(".").slice(0, -1).join(".");
            const member = (filename.length <= UploadFileToDataset.MaxMemberLength) ?
                filename : filename.substring(0, UploadFileToDataset.MaxMemberLength);
            if (filename.length > UploadFileToDataset.MaxMemberLength) {
                this.warnings.push(`Filename "${filename}" truncated to member name "${member}".`);
            }
            destDs = `${destDs}(${member})`;
        }

        // Upload the file to the dataset
        const options = {...params.action.args.options} || {};
        await Upload.fileToDataset(session as any, fp, destDs, options);
    }
}
