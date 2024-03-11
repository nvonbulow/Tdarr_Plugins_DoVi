/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */

import {
  IffmpegCommandStream,
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

/* eslint-disable no-param-reassign */
const details = ():IpluginDetails => ({
  name: 'Extract Streams',
  description: `
  Extract raw HEVC and srt streams from file

  Make sure that the video stream is the last stream, otherwise the plugin will fail!
  Use the reorder streams plugin before this.
  `,
  style: {
    borderColor: '#6efefc',
  },
  tags: 'video',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: '',
  inputs: [
    {
      label: 'Subtitle languages',
      name: 'subtitle_languages',
      type: 'string',
      defaultValue: 'eng,hun',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Specify subtitle languages to keep using comma seperated list e.g. eng,hun',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

const getOuputStreamIndex = (streams: IffmpegCommandStream[], stream: IffmpegCommandStream): number => {
  let index = -1;

  for (let idx = 0; idx < streams.length; idx += 1) {
    if (!stream.removed) {
      index += 1;
    }

    if (streams[idx].index === stream.index) {
      break;
    }
  }

  return index;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (args:IpluginInputArgs):IpluginOutputArgs => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);
  const subtitle_languages = String(args.inputs.subtitle_languages).trim().split(',');

  args.variables.ffmpegCommand.container = 'hevc';
  args.variables.ffmpegCommand.shouldProcess = true;

  const subs_dir = `${args.workDir}/sub_streams`;
  const { streams } = args.variables.ffmpegCommand;

  streams.forEach((stream) => {
    const index = getOuputStreamIndex(streams, stream);
    if (stream.codec_type === 'subtitle') {
      const dir = subs_dir;
      let lang = stream.tags?.language ? stream.tags.language : 'und';
      const format = stream.codec_name.toLowerCase();

      // Ignore all subtitle formats that can't be converted to srt easily
      if (
        (format !== 'ass' && format !== 'subrip' && format !== 'srt')
      || (subtitle_languages.length !== 0 && !subtitle_languages.includes(lang))
      ) {
        stream.removed = true;
      } else {
        // Add supported flags to subtitle file names to retain them
        // eslint-disable-next-line no-prototype-builtins
        if (stream.hasOwnProperty('disposition')) {
          const def = stream.disposition.default === 1 ? '.default' : '';
          const forced = stream.disposition.forced === 1 ? '.forced' : '';
          const sdh = stream.disposition.hearing_impaired === 1 ? '.sdh' : '';
          lang = `${lang}${def}${forced}${sdh}`;
        }

        args.deps.fsextra.ensureDirSync(dir);

        stream.outputArgs.push('-c:s:0');
        if (format === 'ass') {
          stream.outputArgs.push('srt');
        } else if (format === 'subrip' || format === 'srt') {
          stream.outputArgs.push('copy');
        }
        stream.outputArgs.push(`${dir}/${index}.${lang}.srt`);
      }
    } else if (stream.codec_type === 'video') {
      stream.outputArgs.push('-c:v');
      stream.outputArgs.push('copy');
      stream.outputArgs.push('-bsf:v');
      stream.outputArgs.push('hevc_mp4toannexb');
    } else {
      stream.removed = true;
    }
  });

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
