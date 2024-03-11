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
    ],
}); };
exports.details = details;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) {
    var _a, _b;
    var lib = require('../../../../../methods/lib')();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
    args.inputs = lib.loadDefaultValues(args.inputs, details);
    var outputNum = 3;
    if ((_b = (_a = args.inputFileObj) === null || _a === void 0 ? void 0 : _a.mediaInfo) === null || _b === void 0 ? void 0 : _b.track) {
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
    else {
        throw new Error('File is not HDR.');
    }
    return {
        outputFileObj: args.inputFileObj,
        outputNumber: outputNum,
        variables: args.variables,
    };
};
exports.plugin = plugin;
