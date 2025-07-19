"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var fs_1 = require("fs");
var fileUtils_1 = require("../../../../FlowHelpers/1.0.0/fileUtils");
var normJoinPath_1 = __importDefault(require("../../../../FlowHelpers/1.0.0/normJoinPath"));
var fileMoveOrCopy_1 = __importDefault(require("../../../../FlowHelpers/1.0.0/fileMoveOrCopy"));
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
var details = function () { return ({
    name: 'Move Folder Content to Blachole',
    description: 'Copy or move folder content to blackhole folder.',
    style: {
        borderColor: 'green',
    },
    tags: '',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: 'faArrowRight',
    inputs: [
        {
            label: 'Output Directory',
            name: 'outputDirectory',
            type: 'string',
            defaultValue: '{{{args.userVariables.library.blackholeFolder}}}',
            inputUI: {
                type: 'directory',
            },
            tooltip: 'Specify ouput directory',
        },
        {
            label: 'All Files?',
            name: 'allFiles',
            type: 'boolean',
            defaultValue: 'false',
            inputUI: {
                type: 'dropdown',
                options: [
                    'false',
                    'true',
                ],
            },
            tooltip: 'Specify whether to copy/move all files in the directory (excluding the original and working file)',
        },
        {
            label: 'File Extensions',
            name: 'fileExtensions',
            type: 'string',
            defaultValue: 'srt',
            inputUI: {
                type: 'text',
                displayConditions: {
                    logic: 'AND',
                    sets: [
                        {
                            logic: 'AND',
                            inputs: [
                                {
                                    name: 'allFiles',
                                    value: 'false',
                                    condition: '===',
                                },
                            ],
                        },
                    ],
                },
            },
            tooltip: 'Specify a comma separated list of file extensions to copy/move',
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, allFiles, outputFileName, arrInfo, outputDirectory, filesInDir, subsDir, fileExtensions, subFiles, i, originalLibraryFolder, originalSubFiles, i;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                allFiles = args.inputs.allFiles;
                outputFileName = (0, fileUtils_1.getFileName)(args.inputFileObj._id);
                arrInfo = args.deps.fsextra.readJsonSync("".concat(args.workDir, "/arr.json"), { throws: false });
                if (arrInfo !== null) {
                    // If scene name is available name the file using that
                    if (arrInfo.sceneName !== undefined) {
                        outputFileName = arrInfo.sceneName;
                    }
                    else {
                        outputFileName = (0, fileUtils_1.getFileName)(arrInfo.originalPath);
                    }
                    // Set the release group to TDARR
                    if (!arrInfo.releaseGroup || outputFileName.indexOf(arrInfo.releaseGroup) === -1) {
                        outputFileName = outputFileName.concat('-[TDARR]');
                    }
                    else {
                        outputFileName = outputFileName.replace(arrInfo.releaseGroup, '[TDARR]');
                    }
                }
                outputDirectory = "".concat(args.inputs.outputDirectory, "/").concat(outputFileName);
                args.deps.fsextra.ensureDirSync(outputDirectory);
                filesInDir = [{
                        source: args.inputFileObj._id,
                        destination: (0, normJoinPath_1.default)({
                            upath: args.deps.upath,
                            paths: [
                                outputDirectory,
                                outputFileName.concat('.', (0, fileUtils_1.getContainer)(args.inputFileObj._id)),
                            ],
                        }),
                    }];
                subsDir = "".concat(args.workDir, "/sub_streams");
                fileExtensions = String(args.inputs.fileExtensions).split(',').map(function (row) { return row.trim(); });
                if (!args.deps.fsextra.pathExistsSync(subsDir)) return [3 /*break*/, 2];
                return [4 /*yield*/, fs_1.promises.readdir(subsDir)];
            case 1:
                subFiles = (_a.sent())
                    .map(function (row) { return ({
                    source: "".concat(subsDir, "/").concat(row),
                    destination: (0, normJoinPath_1.default)({
                        upath: args.deps.upath,
                        paths: [
                            outputDirectory,
                            row,
                        ],
                    }),
                }); });
                if (!allFiles) {
                    subFiles = subFiles.filter(function (row) { return fileExtensions.includes((0, fileUtils_1.getContainer)(row.source)); });
                }
                filesInDir.push.apply(filesInDir, subFiles);
                _a.label = 2;
            case 2:
                i = 0;
                _a.label = 3;
            case 3:
                if (!(i < filesInDir.length)) return [3 /*break*/, 6];
                // eslint-disable-next-line no-await-in-loop
                return [4 /*yield*/, (0, fileMoveOrCopy_1.default)({
                        operation: 'move',
                        sourcePath: filesInDir[i].source,
                        destinationPath: filesInDir[i].destination,
                        args: args,
                    })];
            case 4:
                // eslint-disable-next-line no-await-in-loop
                _a.sent();
                _a.label = 5;
            case 5:
                i += 1;
                return [3 /*break*/, 3];
            case 6:
                originalLibraryFolder = (0, fileUtils_1.getFileAbosluteDir)(args.originalLibraryFile._id);
                return [4 /*yield*/, fs_1.promises.readdir(originalLibraryFolder)];
            case 7:
                originalSubFiles = (_a.sent())
                    .map(function (row) { return ({
                    source: "".concat(originalLibraryFolder, "/").concat(row),
                    destination: (0, normJoinPath_1.default)({
                        upath: args.deps.upath,
                        paths: [
                            outputDirectory,
                            row,
                        ],
                    }),
                }); })
                    .filter(function (row) { return (0, fileUtils_1.getFileName)(row.source).startsWith((0, fileUtils_1.getFileName)(args.originalLibraryFile._id)); })
                    .filter(function (row) { return (0, fileUtils_1.getContainer)(row.source) === 'srt'; });
                i = 0;
                _a.label = 8;
            case 8:
                if (!(i < originalSubFiles.length)) return [3 /*break*/, 11];
                // eslint-disable-next-line no-await-in-loop
                return [4 /*yield*/, (0, fileMoveOrCopy_1.default)({
                        operation: 'copy',
                        sourcePath: originalSubFiles[i].source,
                        destinationPath: originalSubFiles[i].destination,
                        args: args,
                    })];
            case 9:
                // eslint-disable-next-line no-await-in-loop
                _a.sent();
                _a.label = 10;
            case 10:
                i += 1;
                return [3 /*break*/, 8];
            case 11: return [2 /*return*/, {
                    outputFileObj: {
                        _id: filesInDir[0].destination,
                    },
                    outputNumber: 1,
                    variables: args.variables,
                }];
        }
    });
}); };
exports.plugin = plugin;
