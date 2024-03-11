"use strict";
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
/* eslint-disable no-param-reassign */
var details = function () { return ({
    name: 'Extract Streams',
    description: "\n  Extract raw HEVC and srt streams from file\n\n  Make sure that the video stream is the last stream, otherwise the plugin will fail!\n  Use the reorder streams plugin before this.\n  ",
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
}); };
exports.details = details;
var getOuputStreamIndex = function (streams, stream) {
    var index = -1;
    for (var idx = 0; idx < streams.length; idx += 1) {
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
var plugin = function (args) {
    var lib = require('../../../../../methods/lib')();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    var subtitle_languages = String(args.inputs.subtitle_languages).trim().split(',');
    args.variables.ffmpegCommand.container = 'hevc';
    args.variables.ffmpegCommand.shouldProcess = true;
    var subs_dir = "".concat(args.workDir, "/sub_streams");
    var streams = args.variables.ffmpegCommand.streams;
    streams.forEach(function (stream) {
        var _a;
        var index = getOuputStreamIndex(streams, stream);
        if (stream.codec_type === 'subtitle') {
            var dir = subs_dir;
            var lang = ((_a = stream.tags) === null || _a === void 0 ? void 0 : _a.language) ? stream.tags.language : 'und';
            var format = stream.codec_name.toLowerCase();
            // Ignore all subtitle formats that can't be converted to srt easily
            if ((format !== 'ass' && format !== 'subrip' && format !== 'srt')
                || (subtitle_languages.length !== 0 && !subtitle_languages.includes(lang))) {
                stream.removed = true;
            }
            else {
                // Add supported flags to subtitle file names to retain them
                // eslint-disable-next-line no-prototype-builtins
                if (stream.hasOwnProperty('disposition')) {
                    var def = stream.disposition.default === 1 ? '.default' : '';
                    var forced = stream.disposition.forced === 1 ? '.forced' : '';
                    var sdh = stream.disposition.hearing_impaired === 1 ? '.sdh' : '';
                    lang = "".concat(lang).concat(def).concat(forced).concat(sdh);
                }
                args.deps.fsextra.ensureDirSync(dir);
                stream.outputArgs.push('-c:s:0');
                if (format === 'ass') {
                    stream.outputArgs.push('srt');
                }
                else if (format === 'subrip' || format === 'srt') {
                    stream.outputArgs.push('copy');
                }
                stream.outputArgs.push("".concat(dir, "/").concat(index, ".").concat(lang, ".srt"));
            }
        }
        else if (stream.codec_type === 'video') {
            stream.outputArgs.push('-c:v');
            stream.outputArgs.push('copy');
            stream.outputArgs.push('-bsf:v');
            stream.outputArgs.push('hevc_mp4toannexb');
        }
        else {
            stream.removed = true;
        }
    });
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: args.variables,
    };
};
exports.plugin = plugin;
