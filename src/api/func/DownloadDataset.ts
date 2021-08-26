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
import { Download } from "@zowe/cli";
import FuncException from "../exception/FuncException";
import { Dataset } from "../zosmf/Dataset";

export default class DownloadDataset extends BaseZosmfFunc {
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {
        const dataset: string =  params.action.args.dataset.toUpperCase();
        const nomember: string = (dataset.indexOf("(") >= 0) ?  dataset.split("(")[0] : dataset;
        if (!(await Dataset.exists(session as any, nomember))) {
            throw new FuncException(`Data set "${nomember}" does not exist.`);
        }

        await Download.dataSet(session as any, dataset, {
            binary: params.action.args.binary,
            file: params.action.args.dest
        });
    }
}
