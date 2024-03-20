import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

const details = (): IpluginDetails => ({
  name: 'Wait for rename from Radarr or Sonarr',
  description: 'Wait for *arr to rename file with previous file id and use that file name.',
  style: {
    borderColor: 'green',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faClock',
  inputs: [
    {
      label: 'Arr',
      name: 'arr',
      type: 'string',
      defaultValue: 'radarr',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Specify which arr to use',
    },
    {
      label: 'Arr API key',
      name: 'arr_api_key',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Input your arr api key here',
    },
    {
      label: 'Arr host',
      name: 'arr_host',
      type: 'string',
      defaultValue: 'http://192.168.1.1:7878',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Input your arr host here.'
      + '\\nExample:\\n'
      + 'http://192.168.1.1:7878\\n'
      + 'http://192.168.1.1:8989\\n'
      + 'https://radarr.domain.com\\n'
      + 'https://sonarr.domain.com\\n',
    },
    {
      label: 'Retry limit',
      name: 'retry_limit',
      type: 'number',
      defaultValue: '5',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Number of times to try getting updated path',
    },
    {
      label: 'Retry delay',
      name: 'retry_delay',
      type: 'number',
      defaultValue: '60',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Time to wait in seconds between tries',
    },
    {
      label: 'Path mapping from (remote path)',
      name: 'path_mapping_from',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Path mapping for the final path. Replace this part of the path from *arr',
    },
    {
      label: 'Path mapping to (local path)',
      name: 'path_mapping_to',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Path mapping for the final path. Replacement for part of the path from *arr',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'File imported successfully',
    },
    {
      number: 2,
      tooltip: 'File not imported',
    },
  ],
});

interface IArrInfo {
  fileId: string,
  originalPath: string,
  releaseGroup?: string,
  sceneName?: string,
}

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const arr = String(args.inputs.arr).toLowerCase();
  const arr_api_key = String(args.inputs.arr_api_key);
  const arr_host = String(args.inputs.arr_host).trim();
  const retry_delay = Number(args.inputs.retry_delay);
  const retry_limit = Number(args.inputs.retry_limit);

  let outputNum = 2;

  const arrHost = arr_host.endsWith('/') ? arr_host.slice(0, -1) : arr_host;

  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': arr_api_key,
    Accept: 'application/json',
  };
  let endpoint = '';
  let fileField = '';

  const arrInfo: IArrInfo | null = args.deps.fsextra.readJsonSync(`${args.workDir}/arr.json`, { throws: false });

  if (arr === 'radarr' && arrInfo !== null) {
    endpoint = '/api/v3/movie/';
    fileField = 'movieFile';
  } else if (arr === 'sonarr' && arrInfo !== null) {
    endpoint = '/api/v3/episode/';
    fileField = 'episodeFile';
  } else {
    args.jobLog('No arr specified in plugin inputs.');
    return {
      outputFileObj: {
        _id: args.inputFileObj._id,
      },
      outputNumber: outputNum,
      variables: args.variables,
    };
  }

  let tries = 0;
  let outputPath = arrInfo.originalPath;

  while (outputPath === arrInfo.originalPath && tries < retry_limit) {
    /* eslint-disable no-await-in-loop */
    tries += 1;
    try {
      const res = await args.deps.axios.get(
        `${arrHost}${endpoint}${arrInfo.fileId}`,
        { headers },
      );
      const fileKey = fileField as keyof typeof res.data;
      if (!res.data.hasFile || res.data[fileKey].path === outputPath) {
        args.jobLog('File not imported yet, waiting...');
        await new Promise((f) => setTimeout(f, retry_delay * 1000));
      } else {
        outputPath = res.data[fileKey].path;
        outputNum = 1;
        args.jobLog(`File imported as ${outputPath}`);
      }
    } catch (error) {
      if (args.deps.axios.isAxiosError(error)) {
        args.jobLog(`Error calling ${arr}...`);
        args.jobLog(JSON.stringify(error));
      } else {
        throw error;
      }
    }
    /* eslint-enable no-await-in-loop */
  }

  const path_mapping_from = String(args.inputs.path_mapping_from);
  const path_mapping_to = String(args.inputs.path_mapping_to);
  if (path_mapping_from !== '' && path_mapping_to !== '') {
    outputPath = outputPath.replace(path_mapping_from, path_mapping_to);
  }

  return {
    outputFileObj: {
      _id: outputPath,
    },
    outputNumber: outputNum,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
