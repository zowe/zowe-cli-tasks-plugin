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

import { ICreateDataSetOptions } from "@zowe/cli";
/**
 * Options for the create data set API call. original interface is
 * documented in zowe-cli.
 */
export interface IDatasetAttributes extends ICreateDataSetOptions {
    /**
     * The data-set name.
     */
    name: string;
}
