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

import { ITasks } from "./ITasks";
import { IHelpers } from "./IHelpers";
import { IInputs } from "./IInputs";

export interface IConfig {
    outputDir?: string;
    tasks: ITasks;
    global?: { [key: string]: any };
    args?: { [key: string]: any };
    helpers?: IHelpers;
    input?: IInputs;
}
