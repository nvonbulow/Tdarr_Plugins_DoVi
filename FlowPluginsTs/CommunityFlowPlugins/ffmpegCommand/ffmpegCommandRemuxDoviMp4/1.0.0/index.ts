import { getContainer } from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
/* eslint-disable no-param-reassign */
const details = () :IpluginDetails => ({
  name: 'Remux DoVi MP4',
  description: `
  If input is MP4, then the video stream from that with other streams from original file into mp4.
  Otherwise the file is an MKV, remux that as is into MP4. Unsupported audio streams are removed in the process.
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
  inputs: [],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (args:IpluginInputArgs):IpluginOutputArgs => {
  const extension = getContainer(args.inputFileObj._id);
  let outputFileId = '';
  let inputArguments : string[] = [];
  const outputArguments = [
    '-dn',
    '-movflags', '+faststart',
    '-copyts',
    '-fps_mode', '0',
    '-muxdelay', '0',
    '-strict', 'unofficial',
  ];
  if (extension === 'mkv') {
    // Only remux the file as it is
    args.variables.ffmpegCommand.streams.forEach((stream) => {
      if (
        stream.codec_type !== 'video'
        && (
          stream.codec_type !== 'audio'
          // Remove truehd and dca audio streams as they are not well supported by ffmpeg in mp4
          || (stream.codec_type === 'audio' && ['dca', 'truehd'].includes(stream.codec_name))
        )
      ) {
        stream.removed = true;
      }
    });
    outputArguments.unshift(...[
      '-map_metadata', '0',
      '-map_metadata:c', '-1',
      '-bsf:v', 'hevc_mp4toannexb',
    ]);
    outputFileId = args.inputFileObj._id;
  } else {
    // Assemble the file from the previously packaed rpu.hevc.mp4 and the original mkv

    // Add the input file to the input arguments
    // This is needed because the output of this will be the original file
    // and tdarr will set that as the last input argument
    inputArguments = [
      '-i', args.inputFileObj._id,
    ];
    const mappingArguments = [
      '-map', '1:a',
    ];

    // Remove truehd and dca audio streams as they are not well supported by ffmpeg in mp4
    if (args.originalLibraryFile.ffProbeData.streams) {
      args.originalLibraryFile.ffProbeData.streams.forEach((stream, index) => {
        if (stream.codec_type === 'audio' && ['dca', 'truehd'].includes(stream.codec_name)) {
          mappingArguments.push(...['-map', `-1:${index}`]);
        }
      });
    }
    // Copy metadata, but leave out chapter names as that creates an additional data stream
    // in mp4 which I found to cause issues during playback in this case.
    // Reference: https://stackoverflow.com/a/60374650
    outputArguments.unshift(...[
      '-c:a', 'copy',
      '-map_metadata', '1',
      '-map_metadata:c', '-1',
    ]);
    outputArguments.unshift(...mappingArguments);
    outputFileId = args.originalLibraryFile._id;
  }

  // The 'title' tag in the stream metadata is not recognized in mp4 containers
  // as a workaround setting the title in the 'handler_name' tag works
  if (args.originalLibraryFile.ffProbeData.streams) {
    let offset = 0;
    args.originalLibraryFile.ffProbeData.streams.forEach((stream, index) => {
      if (stream.codec_type === 'audio' && stream.tags && stream.tags.title) {
        if (stream.codec_type === 'audio' && ['dca', 'truehd'].includes(stream.codec_name)) {
          offset += 1;
        } else {
          outputArguments.push(`-metadata:s:${index - offset}`);
          outputArguments.push(`handler_name=${stream.tags.title}`);
        }
      }
    });
  }

  args.variables.ffmpegCommand.overallInputArguments.push(...inputArguments);
  args.variables.ffmpegCommand.overallOuputArguments.push(...outputArguments);

  return {
    outputFileObj: {
      _id: outputFileId,
    },
    outputNumber: 1,
    variables: args.variables,
  };
};
export {
  details,
  plugin,
};
