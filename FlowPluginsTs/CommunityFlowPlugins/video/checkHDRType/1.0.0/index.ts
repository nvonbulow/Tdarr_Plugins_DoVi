import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = (): IpluginDetails => ({
  name: 'Check HDR type',
  description: 'Check HDR standard used by the video',
  style: {
    borderColor: 'orange',
  },
  tags: 'video',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faQuestion',
  inputs: [],
  outputs: [
    {
      number: 1,
      tooltip: 'File is Dolby Vision',
    },
    {
      number: 2,
      tooltip: 'File is HDR10+',
    },
    {
      number: 3,
      tooltip: 'File is HDR10',
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  let outputNum = 3;

  if (args.inputFileObj?.mediaInfo?.track) {
    args.inputFileObj.mediaInfo.track.forEach((stream) => {
      if (stream['@type'].toLowerCase() === 'video') {
        if (stream.hasOwnProperty('HDR_Format')) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          if (/Dolby Vision/.test(stream.HDR_Format)) {
            outputNum = 1;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          } else if (/HDR10\+/.test(stream.HDR_Format)) {
            outputNum = 2;
          }
        }
      }
    });
  } else {
    throw new Error('File is not HDR.');
  }

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: outputNum,
    variables: args.variables,
  };
};
export {
  details,
  plugin,
};
