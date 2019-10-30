import { IScript } from "../api/interface/script/IScript";
import { IScriptParameters } from "../api/interface/script/IScriptParameters";

export default class GetIPLVol implements IScript {
    public async run(params: IScriptParameters): Promise<any> {
        const volRegex = /VOLUME\((.*)\)/g;
        const matches = volRegex.exec(params.args.dIPLOutput);
        return matches[1];
    }
}
