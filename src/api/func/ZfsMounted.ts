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
import { IZosFilesResponse, List } from "@zowe/cli";

export default class ZfsMounted extends BaseZosmfFunc {
    protected async execZosmf(params: IFuncParameters, session: Session): Promise<any> {
        const zfs = params.action.args.zfs.toUpperCase();
        const fp = params.action.args.dir.endsWith("/") ?
            params.action.args.dir.substring(0, params.action.args.dir.length - 1) :
            params.action.args.dir;
        const zfsList: IZosFilesResponse = await List.fsWithPath(session as any, { path: fp });
        let mounted = false;
        if (zfsList.apiResponse.items && zfsList.apiResponse.items.length > 0) {
            for (const item of zfsList.apiResponse.items) {
                if (item.mountpoint.endsWith(fp) && item.name === zfs) {
                    mounted = true;
                    break;
                }
            }
        }
        return {
            mounted
        };
    }
}
