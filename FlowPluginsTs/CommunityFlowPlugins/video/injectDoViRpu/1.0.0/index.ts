import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';
import { CLI } from '../../../../FlowHelpers/1.0.0/cliUtils';
import { getFileName, getPluginWorkDir } from '../../../../FlowHelpers/1.0.0/fileUtils';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = (): IpluginDetails => ({
  name: 'Inject DoVi RPU',
  description: 'Inject Dolby Vision RPU data',
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

  const pluginWorkDir = `${args.workDir}/dovi_tool`;
  args.deps.fsextra.ensureDirSync(pluginWorkDir);

  const rpuFilePath = `${pluginWorkDir}/${getFileName(args.originalLibraryFile._id)}.rpu.bin`;
  const outputFilePath = `${getPluginWorkDir(args)}/${getFileName(args.originalLibraryFile._id)}.rpu.hevc`;
  const cliArgs: string[] = [
    'inject-rpu',
    '-i', `${args.inputFileObj.file}`,
    '--rpu-in', `${rpuFilePath}`,
    '-o', `${outputFilePath}`,
  ];
  const spawnArgs = cliArgs.map((row) => row.trim()).filter((row) => row !== '');

  const cli = new CLI({
    cli: '/usr/local/bin/dovi_tool',
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
    args.jobLog('Injecting DoVi RPU failed');
    throw new Error('dovi_tool failed');
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
