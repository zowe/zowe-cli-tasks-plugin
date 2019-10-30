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
import { IJob, SubmitJobs, MonitorJobs, IMonitorJobWaitForParms } from "@zowe/cli";

export default class WaitForJobStatus extends BaseZosmfFunc {
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {
        const response: IJob = await MonitorJobs.waitForStatusCommon(session as any,
            // tslint:disable-next-line: no-object-literal-type-assertion
            { ...params.action.args } as IMonitorJobWaitForParms);
        return response;
    }
}
