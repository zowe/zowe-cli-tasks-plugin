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

import * as path from "path";
import * as fs from "fs";
const JSYaml = require("js-yaml");
import { IConfig } from "./interface/config/IConfig";
import ConfigException from "./exception/ConfigException";
import { IInputs } from "./interface/config/IInputs";
import * as readline from "readline";
import { Writable } from "stream";
import { INamedTask } from "./interface/task/INamedTask";
import { IInput } from "./interface/config/IInput";
import { IUserConfigProperties } from "./interface/config/IUserConfigProperties";
import Utils from "./Utils";
import { ILoadConfig } from "./interface/config/ILoadConfig";
import { ILoadedConfig } from "./interface/config/ILoadedConfig";

export default class Config {
    public static readonly DefaultConfigFile: string = "zowe-tasks.yml";
    public static readonly DefaultUserConfigFile: string = "zowe-tasks-user.yml";
    public static readonly EnvPrefix = "ZOWE_TASKS";

    /**
     * Load the configuration file and optionally the user configuration file.
     * The result is a complete IConfig object available.
     * @param configPath The  yaml file path.
     * @param userConfigPath The user config yaml file path.
     */
    public static async load(options?: ILoadConfig): Promise<Config> {

        // Validate and ensure the options are correct/defaulted
        let opts: ILoadConfig = options;
        if (opts == null) {
            opts = {};
        }

        // Create an instance
        const newConfig = new Config(opts);

        // Load the configuration yaml file
        const config: ILoadedConfig = newConfig.loadYaml(newConfig.configPath);
        if (config.global == null) {
            config.global = {};
        }

        // The default always task precedence
        if (fs.existsSync(Config.DefaultUserConfigFile) &&
            newConfig.userConfigPaths.indexOf(Config.DefaultUserConfigFile) < 0) {
            newConfig.userConfigPaths.unshift(Config.DefaultUserConfigFile);
        }

        // console.log(newConfig.userConfigPaths);

        // Load the user configuration files and the precedence is the order
        // that they appear in the array (i.e. index 0 has the highest).
        let userConfig = {};
        for (const ucp of newConfig.userConfigPaths) {
            if (fs.existsSync(ucp)) {
                userConfig = { ...newConfig.loadYaml(ucp), ...userConfig };
            }
        }
        newConfig.userConfig = userConfig;

        // Traverse over the inputs section with the user input to allow
        // customization of the user inputs from user config.
        if (config.input != null) {
            Utils.traverse(config.input, newConfig.userConfig);
        }

        // If specified, gather input from various sources
        if (config.input != null) {
            newConfig.loadedInputs = await newConfig.gatherInput(config.input);
        } else {
            newConfig.loadedInputs = {};
        }

        // Fill in the rest of the configuration variables from various sources
        Utils.traverse(config, newConfig.userConfig);
        Utils.traverse(config, newConfig.loadedInputs);
        Utils.traverse(config, config.global);

        // Merge the user config with the loaded inputs
        newConfig.userConfig = { ...newConfig.userConfig, ...newConfig.loadedInputs };
        config.user = newConfig.userConfig;

        // Set the loaded config for next access
        newConfig.loadedConfig = config;

        return newConfig;
    }

    private configPath: string;
    private userConfigPaths: string[];
    private loadedConfig: IConfig;
    private loadedInputs: { [key: string]: any };
    private userConfig: IUserConfigProperties;

    private constructor(options: ILoadConfig) {
        this.configPath = options.configPath || path.join(process.cwd(), Config.DefaultConfigFile);
        this.userConfigPaths = options.userConfigPaths || [];
    }

    /**
     * Returns the loaded config
     */
    public get config(): ILoadedConfig {
        return this.loadedConfig;
    }

    /**
     * Builds the full set of tasks in the loaded config file.
     */
    public get tasks(): INamedTask[] {
        const tsks: INamedTask[] = [];

        // Get all tasks from the main list
        Object.keys(this.loadedConfig.tasks).forEach((tsk) => {
            tsks.push({
                name: tsk,
                task: this.loadedConfig.tasks[tsk]
            });
        });

        // Get all helper tasks
        if (this.loadedConfig.helpers != null && this.loadedConfig.helpers.tasks != null) {
            Object.keys(this.loadedConfig.helpers.tasks).forEach((tsk) => {
                tsks.push({
                    name: tsk,
                    task: this.loadedConfig.helpers.tasks[tsk]
                });
            });
        }

        return tsks;
    }

    /**
     * Get the file path of the configuration file used
     */
    public get path(): string {
        return this.configPath;
    }

    /**
     * Gather user input from various sources (prompt, env, or user config file)
     * @param inputs The various inputs and their sources
     * @param userConfig The use configuration to check if values are specified.
     */
    private async gatherInput(inputs: IInputs): Promise<{ [key: string]: any }> {
        const loadedInputs: any = {};

        // Create a mutable stdout
        const mutableStdout: any = new Writable({
            write(chunk, encoding, callback) {
                if (!(this as any).muted) {
                    process.stdout.write(chunk, encoding);
                }
                callback();
            }
        });
        mutableStdout.muted = false;

        // Create an rl for prompting
        const rl = readline.createInterface({
            input: process.stdin,
            output: mutableStdout,
            terminal: true
        });

        // Iterate over the input keys and gather from various sources
        for (const input of Object.keys(inputs)) {
            const userIn: IInput = inputs[input];
            let supplied: boolean = false;
            for (const source of userIn.sources) {
                if (typeof source !== "string") {
                    throw new ConfigException(`Input "${input}" source must be "prompt, env, or user".`);
                }
                let value;
                switch (source) {

                    // If user was specified, check if the user config has the
                    // value specified and if so, break the loop. The value
                    // is filled in later during config loading.
                    case "user": {
                        if (this.userConfig != null) {
                            const uc = this.userConfig[input];
                            if (uc != null) {
                                if (typeof uc === "string") {
                                    if ((uc.trim() !== "") || (uc.trim() === "" && userIn.allowBlank)) {
                                        supplied = true;
                                    }
                                } else {
                                    supplied = true;
                                }
                            }
                        }
                        break;
                    }

                    // Prompt the user for the value
                    case "prompt": {
                        const desc = `${(userIn.desc != null) ? `${userIn.desc}` : "Specify value for"}`;
                        const question = `${desc} "${input}"${(userIn.mask) ? " (masked)" : ""}: `;
                        const answer = await this.ask(rl, question, mutableStdout, userIn.mask || false);
                        value = this.processInputValue(answer, userIn);
                        if (value != null) {
                            loadedInputs[input] = value;
                            supplied = true;
                        }

                        // Add a blank line to keep correct spacing
                        if (userIn.mask) {
                            process.stdout.write("\n");
                        }
                        break;
                    }

                    // Check the ENV var "ZOWE_TASKS_VAR_<varname>"
                    case "env": {
                        value = this.processInputValue(process.env[`${Config.EnvPrefix}_${input.toUpperCase()}`], userIn);
                        if (value != null) {
                            loadedInputs[input] = value;
                            supplied = true;
                        }
                        break;
                    }
                }

                // If the value was found, break from the loop
                if (supplied) {
                    break;
                }
            }

            // If it was not supplied by this time, throw an error.
            if (!supplied) {
                rl.close();
                const srcStrs: string[] = [];
                userIn.sources.forEach((src) => {
                    srcStrs.push(src);
                });
                throw new ConfigException(`No value supplied for "${input}" from "${srcStrs.toString()}".`);
            }
        }

        // Close the rl
        rl.close();
        return loadedInputs;
    }

    /**
     * Process the input value and return either a string, number, or boolean
     * value.
     * @param value The value that was inputted as a string.
     * @param input The input parameters.
     */
    private processInputValue(value: string, input: IInput): string | number | boolean {
        let processedValue;
        if (value != null) {
            if (value.trim() === "" && input.allowBlank) {
                processedValue = "";
            } else {
                if (value[0] === "\"" && value[value.length - 1] === "\"") {
                    processedValue = value.substr(1, value.length - 2);
                } else if (!isNaN(parseInt(value, 10))) {
                    processedValue = parseInt(value, 10);
                } else if (value === "true" || value === "false") {
                    // tslint:disable-next-line: triple-equals
                    processedValue = (value == "true");
                } else {
                    processedValue = value;
                }
            }
        }
        return processedValue;
    }

    /**
     * Ask the user a question and obtain a response.
     * @param rl The readline interface object that was previously created.
     * @param question The question to ask.
     */
    private ask(rl: readline.ReadLine, question: string, mutableStdout: any, mute = false): Promise<string> {
        return new Promise<string>((answered) => {
            mutableStdout.muted = false;
            rl.question(question, (answer: string) => {
                answered((answer == null || answer.trim() === "") ? "" : answer);
            });
            mutableStdout.muted = mute;
        });
    }

    /**
     * Load a yaml file into an object.
     * @param filePath The full path to the yaml file.
     */
    private loadYaml(filePath: string): any {
        let config;
        try {
            config = JSYaml.safeLoad(fs.readFileSync(filePath, "utf8"));
        } catch (e) {
            throw new ConfigException(`Unable to load Yaml config file "${filePath}":\n${e.message}`);
        }
        return config;
    }
}
