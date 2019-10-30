import { ILoadedConfig } from "../config/ILoadedConfig";
import { IArgs } from "../config/IArgs";

export interface IScriptParameters {
    config: ILoadedConfig;
    args: IArgs;
}
