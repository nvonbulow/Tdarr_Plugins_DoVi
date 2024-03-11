import { promises as fs } from 'fs';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';
import { CLI } from '../../../../FlowHelpers/1.0.0/cliUtils';
import { getFileName, getPluginWorkDir } from '../../../../FlowHelpers/1.0.0/fileUtils';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = (): IpluginDetails => ({
  name: 'Package DoVi mp4',
  description: 'Package HEVC stream with injected DoVi RPU in mp4',
  style: {
    borderColor: 'orange',
  },
  tags: 'video',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: '',
  inputs: [],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const outputFilePath = `${getPluginWorkDir(args)}/${getFileName(args.originalLibraryFile._id)}.rpu.hevc.mp4`;
  const cliArgs: string[] = [
    '-add', `${args.inputFileObj.file}:dvp=8.1:xps_inband:hdr=none`,
    '-tmp', `${getPluginWorkDir(args)}/tmp`,
    '-brand', 'mp42isom',
    '-ab', 'dby1',
    '-no-iod',
    '-enable', '1',
    `${outputFilePath}`,
  ];
  const spawnArgs = cliArgs.map((row) => row.trim()).filter((row) => row !== '');

  const cli = new CLI({
    cli: '/usr/local/bin/MP4Box',
    spawnArgs,
    spawnOpts: {},
    jobLog: args.jobLog,
    outputFilePath,
    inputFileObj: args.inputFileObj,
    logFullCliOutput: args.logFullCliOutput,
    updateWorker: args.updateWorker,
  });
  const res = await cli.runCli();

  if (res.cliExitCode !== 0) {
    args.jobLog('Packaging stream into mp4 failed');
    throw new Error('MP4Box failed');
  }

  args.logOutcome('tSuc');

  return {
    outputFileObj: {
      _id: outputFilePath,
    },
    outputNumber: 1,
    variables: args.variables,
  };
};
export {
  details,
  plugin,
};
