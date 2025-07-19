import { promises as fs } from 'fs';
import {
  getFileAbosluteDir, getContainer, getFileName,
} from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';
import normJoinPath from '../../../../FlowHelpers/1.0.0/normJoinPath';
import fileMoveOrCopy from '../../../../FlowHelpers/1.0.0/fileMoveOrCopy';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = (): IpluginDetails => ({
  name: 'Move Folder Content to Blachole',
  description: 'Copy or move folder content to blackhole folder.',
  style: {
    borderColor: 'green',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faArrowRight',
  inputs: [
    {
      label: 'Output Directory',
      name: 'outputDirectory',
      type: 'string',
      defaultValue: '{{{args.userVariables.library.blackholeFolder}}}',
      inputUI: {
        type: 'directory',
      },
      tooltip: 'Specify ouput directory',
    },
    {
      label: 'All Files?',
      name: 'allFiles',
      type: 'boolean',
      defaultValue: 'false',
      inputUI: {
        type: 'dropdown',
        options: [
          'false',
          'true',
        ],
      },
      tooltip: 'Specify whether to copy/move all files in the directory (excluding the original and working file)',
    },
    {
      label: 'File Extensions',
      name: 'fileExtensions',
      type: 'string',
      defaultValue: 'srt',
      inputUI: {
        type: 'text',
        displayConditions: {
          logic: 'AND',
          sets: [
            {
              logic: 'AND',
              inputs: [
                {
                  name: 'allFiles',
                  value: 'false',
                  condition: '===',
                },
              ],
            },
          ],
        },
      },
      tooltip: 'Specify a comma separated list of file extensions to copy/move',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

interface IArrInfo {
  fileId: string,
  originalPath: string,
  releaseGroup?: string,
  sceneName?: string,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const {
    allFiles,
  } = args.inputs;

  let outputFileName = getFileName(args.inputFileObj._id);

  // If there's info available from *arr, then parse the file and use that info for naming
  const arrInfo: IArrInfo | null = args.deps.fsextra.readJsonSync(`${args.workDir}/arr.json`, { throws: false });
  if (arrInfo !== null) {
    // If scene name is available name the file using that
    if (arrInfo.sceneName !== undefined) {
      outputFileName = arrInfo.sceneName;
    } else {
      outputFileName = getFileName(arrInfo.originalPath);
    }
    // Set the release group to TDARR
    if (!arrInfo.releaseGroup || outputFileName.indexOf(arrInfo.releaseGroup) === -1) {
      outputFileName = outputFileName.concat('-[TDARR]');
    } else {
      outputFileName = outputFileName.replace(arrInfo.releaseGroup, '[TDARR]');
    }
  }

  const outputDirectory = `${args.inputs.outputDirectory}/${outputFileName}`;
  args.deps.fsextra.ensureDirSync(outputDirectory);

  const filesInDir = [{
    source: args.inputFileObj._id,
    destination: normJoinPath({
      upath: args.deps.upath,
      paths: [
        outputDirectory,
        outputFileName.concat('.', getContainer(args.inputFileObj._id)),
      ],
    }),
  }];

  // Grab extracted subtitle files
  const subsDir = `${args.workDir}/sub_streams`;
  const fileExtensions = String(args.inputs.fileExtensions).split(',').map((row) => row.trim());
  if (args.deps.fsextra.pathExistsSync(subsDir)) {
    let subFiles = (await fs.readdir(subsDir))
      .map((row) => ({
        source: `${subsDir}/${row}`,
        destination: normJoinPath({
          upath: args.deps.upath,
          paths: [
            outputDirectory,
            row,
          ],
        }),
      }));

    if (!allFiles) {
      subFiles = subFiles.filter((row) => fileExtensions.includes(getContainer(row.source)));
    }
    filesInDir.push(...subFiles);
  }

  // Move the video file and extracted subtitles
  for (let i = 0; i < filesInDir.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await fileMoveOrCopy({
      operation: 'move',
      sourcePath: filesInDir[i].source,
      destinationPath: filesInDir[i].destination,
      args,
    });
  }

  // Copy original srt files matching the original file
  // This is important if the input file was MP4, thus only had external subtitles
  const originalLibraryFolder = getFileAbosluteDir(args.originalLibraryFile._id);
  const originalSubFiles = (await fs.readdir(originalLibraryFolder))
    .map((row) => ({
      source: `${originalLibraryFolder}/${row}`,
      destination: normJoinPath({
        upath: args.deps.upath,
        paths: [
          outputDirectory,
          row,
        ],
      }),
    }))
    .filter((row) => getFileName(row.source).startsWith(getFileName(args.originalLibraryFile._id)))
    .filter((row) => getContainer(row.source) === 'srt');

  for (let i = 0; i < originalSubFiles.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await fileMoveOrCopy({
      operation: 'copy',
      sourcePath: originalSubFiles[i].source,
      destinationPath: originalSubFiles[i].destination,
      args,
    });
  }

  return {
    outputFileObj: {
      _id: filesInDir[0].destination,
    },
    outputNumber: 1,
    variables: args.variables,
  };
};
export {
  details,
  plugin,
};
