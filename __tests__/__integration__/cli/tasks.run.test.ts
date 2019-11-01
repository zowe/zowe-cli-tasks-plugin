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

import { TestEnvironment } from "../../__src__/environment/TestEnvironment";
import { ITestEnvironment } from "../../__src__/environment/doc/response/ITestEnvironment";
import { runCliScript } from "../../__src__/TestUtils";
import * as fs from "fs";

import * as path from "path";
const dirs = (p: any) => fs.readdirSync(p).filter((f) => fs.statSync(path.join(p, f)).isDirectory());

let TEST_ENVIRONMENT: ITestEnvironment;
describe("run tasks command", () => {
    beforeAll(async () => {
        TEST_ENVIRONMENT = await TestEnvironment.setUp({
            testName: "run_tasks_command",
            installPlugin: true,
            skipProperties: true
        });
    });

    afterAll(async () => {
        await TestEnvironment.cleanUp(TEST_ENVIRONMENT);
    });

    it("should be able to substitute values from ENV and global in desc and scripts", () => {
        const yml = path.join(TEST_ENVIRONMENT.workingDir, "zowe-tasks-substitution.yml");
        fs.copyFileSync(path.join(__dirname, "__yaml__", "zowe-tasks-substitution.yml"), yml);
        const output = runCliScript(path.join(__dirname, "__scripts__", "zowe-tasks-substitution.sh"),
            TEST_ENVIRONMENT, [yml]);
        expect(output.stdout.toString()).toMatchSnapshot();
        expect(output.status).toBe(0);
    });

    it("should be able to run a CLI command", () => {
        const yml = path.join(TEST_ENVIRONMENT.workingDir, "zowe-tasks-run-cli.yml");
        fs.copyFileSync(path.join(__dirname, "__yaml__", "zowe-tasks-run-cli.yml"), yml);
        const output = runCliScript(path.join(__dirname, "__scripts__", "zowe-tasks-run-cli.sh"),
            TEST_ENVIRONMENT, [yml]);
        expect(output.stdout.toString()).toMatchSnapshot();
        expect(output.status).toBe(0);
        const dateTimeDir = dirs(path.join(TEST_ENVIRONMENT.workingDir, "zowe-tasks-out-run-cli"));
        const outputLogPath = path.join(TEST_ENVIRONMENT.workingDir,
            "zowe-tasks-out-run-cli",
            dateTimeDir[0],
            "task_sequence_1_run-zowe-cli",
            "action_sequence_2_runCommand",
            "3_runCommand.action.output.txt");
        const logContents = fs.readFileSync(outputLogPath).toString();
        const json = JSON.parse(logContents);
        expect(json.success).toBe(true);
        expect(json.stdout).toContain("\nInstalled plugins: \n\n -- pluginName: @zowe/tasks-for-zowe-cli");
    });

    it("should give stdout and stderr if an exec command fails", () => {
        fs.copyFileSync(path.join(__dirname, "__yaml__", "zowe-tasks.yml"),
            path.join(TEST_ENVIRONMENT.workingDir, "zowe-tasks.yml"));
        const output = runCliScript(path.join(__dirname, "__scripts__", "run_tasks.sh"), TEST_ENVIRONMENT,
            [path.join(__dirname, "__scripts__", "stdout_and_stderr.sh")]);
        expect(output.stderr.toString()).toContain("Failed to exec command:");
        expect(output.stderr.toString()).toContain("Hello stderr!");
        expect(output.stderr.toString()).toContain("Command Stdout:");
        expect(output.stderr.toString()).toContain("Hello stdout!");
        expect(output.stderr.toString()).toContain("Command failed with exit code \"1\"");
        expect(output.stderr.toString()).toContain("The action in progress was \"execCommand\".");
        expect(output.status).toBe(1);
    });
});
