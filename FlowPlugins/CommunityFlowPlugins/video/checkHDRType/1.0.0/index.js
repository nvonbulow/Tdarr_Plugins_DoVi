"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
var details = function () { return ({
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
        {
            number: 4,
            tooltip: 'File is not HDR',
        },
    ],
}); };
exports.details = details;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) {
    var _a, _b, _c, _d;
    var lib = require('../../../../../methods/lib')();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    var outputNum = 4;
    if (Array.isArray((_b = (_a = args === null || args === void 0 ? void 0 : args.inputFileObj) === null || _a === void 0 ? void 0 : _a.ffProbeData) === null || _b === void 0 ? void 0 : _b.streams)) {
        for (var i = 0; i < args.inputFileObj.ffProbeData.streams.length; i += 1) {
            var stream = args.inputFileObj.ffProbeData.streams[i];
            if (stream.codec_type === 'video'
                && stream.color_transfer === 'smpte2084'
                && stream.color_primaries === 'bt2020'
                && stream.color_range === 'tv') {
                outputNum = 3;
            }
        }
    }
    else {
        throw new Error('File has no stream data');
    }
    if ((_d = (_c = args.inputFileObj) === null || _c === void 0 ? void 0 : _c.mediaInfo) === null || _d === void 0 ? void 0 : _d.track) {
        args.inputFileObj.mediaInfo.track.forEach(function (stream) {
            if (stream['@type'].toLowerCase() === 'video') {
                if (stream.hasOwnProperty('HDR_Format')) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    if (/Dolby Vision/.test(stream.HDR_Format)) {
                        outputNum = 1;
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                    }
                    else if (/HDR10\+/.test(stream.HDR_Format)) {
                        outputNum = 2;
                    }
                }
            }
        });
    }
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: outputNum,
        variables: args.variables,
    };
};
exports.plugin = plugin;
