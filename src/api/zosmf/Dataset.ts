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

import {
    List,
    IZosFilesResponse,
    ZosmfRestClient
} from "@zowe/cli";
import { ImperativeExpect, Session } from "@zowe/imperative";
import { IDatasetAttributes } from "./interface/IDatasetAttributes";

/**
 * Wrapper class to invoke zowe commands
 */
export class Dataset {
    /**
     * Create a data set.
     * @param session The z/OSMF session for the API.
     * @param options The data-set attributes.
     */
    public static async create(session: Session, options: IDatasetAttributes) {
        ImperativeExpect.keysToBeDefinedAndNonBlank(options, ["name"], "You must specify the data-set name.");
        const json: any = { ...options };
        delete json.name;
        const payload: any = JSON.stringify(json);
        const URI: string = `/zosmf/restfiles/ds/${options.name.toUpperCase()}`;
        await ZosmfRestClient.postExpectString(session as any, URI, [], payload);
    }

    /**
     * Checks if a data set exists.
     * @param session The session object for the API.
     * @param dataset The data set name.
     */
    public static async exists(session: Session, dataset: string): Promise<boolean> {
        const response: IZosFilesResponse = await List.dataSet(session as any, dataset);
        let exists: boolean = false;
        for (const ds of response.apiResponse.items) {
            if (ds.dsname === dataset.toUpperCase()) {
                exists = true;
                break;
            }
        }
        return exists;
    }
}
