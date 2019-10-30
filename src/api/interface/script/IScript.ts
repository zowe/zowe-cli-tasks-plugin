import { IScriptParameters } from "./IScriptParameters";

export interface IScript {
    run(params: IScriptParameters): Promise<any>;
}
