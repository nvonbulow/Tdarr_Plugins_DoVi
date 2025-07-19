import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

const details = (): IpluginDetails => ({
  name: 'Parse file with Radarr or Sonarr',
  description: 'Get info about existing media from *arr, write it to arr.json for later use in workdir.',
  style: {
    borderColor: 'green',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faQuestion',
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

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const arr = String(args.inputs.arr).toLowerCase();
  const arr_api_key = String(args.inputs.arr_api_key);
  const arr_host = String(args.inputs.arr_host).trim();

  const { meta } = args.inputFileObj;
  const arrHost = arr_host.endsWith('/') ? arr_host.slice(0, -1) : arr_host;

  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': arr_api_key,
    Accept: 'application/json',
  };

  let arrInfo: IArrInfo;

  if (arr === 'radarr') {
    try {
      let res = await args.deps.axios.get(
        `${arrHost}/api/v3/parse?title=${encodeURIComponent(meta?.FileName || '')}`,
        { headers },
      );
      arrInfo = { fileId: res.data.movie.id, originalPath: args.originalLibraryFile._id };
      args.jobLog(`Got movieId from Radarr: ${arrInfo.fileId}`);

      res = await args.deps.axios.get(
        `${arrHost}/api/v3/movie/${arrInfo.fileId}`,
        { headers },
      );

      args.jobLog('Movie info from Radarr:');
      args.jobLog(JSON.stringify(res.data));

      arrInfo.originalPath = res.data.movieFile.path ? res.data.movieFile.path : args.originalLibraryFile._id;
      arrInfo.releaseGroup = res.data.movieFile.releaseGroup;
      arrInfo.sceneName = res.data.movieFile.sceneName;

      args.deps.fsextra.writeJsonSync(`${args.workDir}/arr.json`, arrInfo);
    } catch (error) {
      if (args.deps.axios.isAxiosError(error)) {
        args.jobLog('Error calling Radarr...');
        args.jobLog(JSON.stringify(error));
      } else {
        throw error;
      }
    }
  } else if (arr === 'sonarr') {
    try {
      let res = await args.deps.axios.get(
        `${arrHost}/api/v3/parse?title=${encodeURIComponent(meta?.FileName || '')}`,
        { headers },
      );
      arrInfo = {
        fileId: res.data.episodes[0].id,
        originalPath: args.originalLibraryFile._id,
      };
      args.jobLog(`Got fileId from Sonarr: ${arrInfo.fileId}`);

      res = await args.deps.axios.get(
        `${arrHost}/api/v3/episode/${arrInfo.fileId}`,
        { headers },
      );

      args.jobLog('Episode info from Sonarr:');
      args.jobLog(JSON.stringify(res.data));

      arrInfo.originalPath = res.data.episodeFile.path ? res.data.episodeFile.path : args.originalLibraryFile._id;
      arrInfo.releaseGroup = res.data.episodeFile.releaseGroup;
      arrInfo.sceneName = res.data.episodeFile.sceneName;

      args.deps.fsextra.writeJsonSync(`${args.workDir}/arr.json`, arrInfo);
    } catch (error) {
      if (args.deps.axios.isAxiosError(error)) {
        args.jobLog('Error calling Sonarr...');
        args.jobLog(JSON.stringify(error));
      } else {
        throw error;
      }
    }
  } else {
    args.jobLog('No arr specified in plugin inputs.');
  }

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
