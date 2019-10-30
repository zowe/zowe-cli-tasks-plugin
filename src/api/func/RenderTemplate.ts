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
const Handlebars = require("handlebars");
import * as fs from "fs";
const mkdirp = require("mkdirp");
import * as path from "path";
import BaseFunc from "./BaseFunc";

Handlebars.registerHelper("toLowerCase", (str: string) => {
    return str.toLowerCase();
});

Handlebars.registerHelper("toUpperCase", (str: string) => {
    return str.toUpperCase();
});

export default class RenderTemplate extends BaseFunc {
    protected async exec(params: IFuncParameters): Promise<any> {
        const source = fs.readFileSync(params.action.args.templatePath).toString();
        const template = Handlebars.compile(source, { noEscape: true });
        const result = template(params.action.args.data);
        if (params.action.args.renderedPath) {
            mkdirp.sync(path.dirname(params.action.args.renderedPath));
            fs.writeFileSync(params.action.args.renderedPath, result);
        }
        return result;
    }
}
