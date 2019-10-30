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

import { IArgs } from "./IArgs";
import { IValidator } from "./IValidator";
import { IActionRun } from "./IActionRun";
import { IOutputExtractor } from "./IOutputExtractor";
import { IRepeatAction } from "./IRepeat";

export interface IAction {
    name: string;
    desc: string;
    args: IArgs;
    action: IActionRun;
    successOnFail?: boolean;
    onSuccessMsg?: string;
    onErrorMsg?: string;
    jsonExtractor?: { [key: string]: string };
    outputExtractor?: IOutputExtractor[];
    onError?: string;
    destSystem?: string;
    validators?: IValidator[];
    mergeArgs?: string[];
    conditions?: IAction[] | string;
    repeat?: IRepeatAction;
}
