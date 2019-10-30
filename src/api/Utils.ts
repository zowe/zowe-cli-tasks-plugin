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

import * as lodash from "lodash";

export default class Utils {
    /**
     * Traverse an input object (deep traversal) and for each property that
     * is of type "string", invoke "resolve" to attempt resolution of any
     * ${<var>} style syntax.
     * @param object The object to traverse.
     * @param substitutions The substitution values (keyword value).
     * @param propertyPrefix Prefix of the property to substitute in the text
     *                       (e.g. ${extracted.<propname>}).
     */
    public static traverse(object: any, substitutions: any, propertyPrefix = "") {
        Object.keys(object).forEach((value) => {
            if (Array.isArray(object[value])) {
                // tslint:disable-next-line: prefer-for-of
                for (let x = 0; x < object[value].length; x++) {
                    if (typeof object[value][x] === "object") {
                        Utils.traverse(object[value][x], substitutions, propertyPrefix);
                    } else {
                        Utils.resolve(object[value], x, substitutions, propertyPrefix);
                    }
                }
                return;
            }
            if (object[value] !== null && typeof object[value] === "object") {
                Utils.traverse(object[value], substitutions, propertyPrefix);
                return;
            }
            if (typeof object[value] === "string") {
                Utils.resolve(object, value, substitutions, propertyPrefix);
            }
        });
    }

    /**
     * Given an object and its property, attempt to find instances of
     * ${<propname>}. If instances of ${<propname>} are located, attempt to
     * resolve <propname> based on the keyword/value properties of the
     * "substitutions".
     * @param object The object that contains "property".
     * @param property The property of the "object"
     * @param substitutions The keyword/value substitutions to replace
     *                      ${<propname>}
     * @param propertyPrefix Prefix of the property to substitute in the text
     *                       (e.g. ${extracted.<propname>})
     */
    public static resolve(object: any, property: any, substitutions: any, propertyPrefix = "") {
        // If the property is a string we can attempt resolution, otherwise
        // we can skip this property
        if (typeof object[property] === "string") {

            // Given the string, iterate with regex to find all matches of the
            // substitution syntax "${var}"
            const str: string = object[property];

            // Assign the property to itself to later manipulation
            object[property] = str;

            // Regex is matching on ${<varname>}
            const reg = /\${[^}]+}/g;
            let result;
            // tslint:disable-next-line: no-conditional-assignment
            while ((result = reg.exec(str)) !== null) {

                // Get the property name from the match and get the value for
                // property from the substitution values.
                const propName: string = result[0].replace(`\$\{${propertyPrefix}`, "").replace("}", "");
                const value = lodash.get(substitutions, propName);

                // If the value is non-null/undefined substitute the value
                // either into the string OR directly to the property itself.
                if (value != null) {
                    if (typeof value === "string") {
                        object[property] = object[property].replace(`\$\{${propertyPrefix}${propName}\}`, value);
                    } else {
                        object[property] = value;
                    }
                }
            }
        }
    }
}
