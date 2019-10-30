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

import { IFunc } from "./interface/func/IFunc";
import UploadDirToUSS from "./func/uploadDirToUSS";
import UploadGlobToUSS from "./func/UploadGlobToUSS";
import UploadGlobToPds from "./func/UploadGlobToPds";
import UploadFileToDataset from "./func/UploadFileToDataset";
import DownloadUSSDir from "./func/DownloadUSSDir";
import DownloadUSSFile from "./func/DownloadUSSFile";
import DownloadDataset from "./func/DownloadDataset";
import DownloadMembers from "./func/DownloadMembers";
import WaitForJobStatus from "./func/WaitForJobStatus";
import RenderTemplate from "./func/RenderTemplate";
import Mkdirp from "./func/Mkdirp";
import DatasetExists from "./func/DatasetExists";
import ZfsMounted from "./func/ZfsMounted";
import SubmitJob from "./func/SubmitJob";

export default class Functions {
    public static readonly BuiltIn: Map<string, IFunc> =
    new Map([
        ["uploadDirToUSS", new UploadDirToUSS() as IFunc],
        ["uploadGlobToUSS", new UploadGlobToUSS()],
        ["uploadGlobToPds", new UploadGlobToPds()],
        ["uploadFileToDataset", new UploadFileToDataset()],
        ["downloadUSSDir", new DownloadUSSDir()],
        ["downloadUSSFile", new DownloadUSSFile()],
        ["downloadDataset", new DownloadDataset()],
        ["downloadMembers", new DownloadMembers()],
        ["waitForJobStatus", new WaitForJobStatus()],
        ["renderTemplate", new RenderTemplate()],
        ["mkdirp", new Mkdirp()],
        ["datasetExists", new DatasetExists()],
        ["zfsMounted", new ZfsMounted()],
        ["submitJob", new SubmitJob()],
    ]);
}
