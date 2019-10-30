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

import RunConsole from "../../RunConsole";
import { IConfig } from "../config/IConfig";

export interface IBaseRunner {
    config: IConfig;
    console: RunConsole;
    logDir: string;
    msgIndent: string;
    logOutput?: boolean;
    extracted?: { [key: string]: any };
}
