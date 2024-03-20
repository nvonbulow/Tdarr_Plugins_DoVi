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
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var details = function () { return ({
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
}); };
exports.details = details;
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, arr, arr_api_key, arr_host, retry_delay, retry_limit, outputNum, arrHost, headers, endpoint, fileField, arrInfo, tries, outputPath, res, fileKey, error_1, path_mapping_from, path_mapping_to;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                arr = String(args.inputs.arr).toLowerCase();
                arr_api_key = String(args.inputs.arr_api_key);
                arr_host = String(args.inputs.arr_host).trim();
                retry_delay = Number(args.inputs.retry_delay);
                retry_limit = Number(args.inputs.retry_limit);
                outputNum = 2;
                arrHost = arr_host.endsWith('/') ? arr_host.slice(0, -1) : arr_host;
                headers = {
                    'Content-Type': 'application/json',
                    'X-Api-Key': arr_api_key,
                    Accept: 'application/json',
                };
                endpoint = '';
                fileField = '';
                arrInfo = args.deps.fsextra.readJsonSync("".concat(args.workDir, "/arr.json"), { throws: false });
                if (arr === 'radarr' && arrInfo !== null) {
                    endpoint = '/api/v3/movie/';
                    fileField = 'movieFile';
                }
                else if (arr === 'sonarr' && arrInfo !== null) {
                    endpoint = '/api/v3/episode/';
                    fileField = 'episodeFile';
                }
                else {
                    args.jobLog('No arr specified in plugin inputs.');
                    return [2 /*return*/, {
                            outputFileObj: {
                                _id: args.inputFileObj._id,
                            },
                            outputNumber: outputNum,
                            variables: args.variables,
                        }];
                }
                tries = 0;
                outputPath = arrInfo.originalPath;
                _a.label = 1;
            case 1:
                if (!(outputPath === arrInfo.originalPath && tries < retry_limit)) return [3 /*break*/, 9];
                /* eslint-disable no-await-in-loop */
                tries += 1;
                _a.label = 2;
            case 2:
                _a.trys.push([2, 7, , 8]);
                return [4 /*yield*/, args.deps.axios.get("".concat(arrHost).concat(endpoint).concat(arrInfo.fileId), { headers: headers })];
            case 3:
                res = _a.sent();
                fileKey = fileField;
                if (!(!res.data.hasFile || res.data[fileKey].path === outputPath)) return [3 /*break*/, 5];
                args.jobLog('File not imported yet, waiting...');
                return [4 /*yield*/, new Promise(function (f) { return setTimeout(f, retry_delay * 1000); })];
            case 4:
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                outputPath = res.data[fileKey].path;
                outputNum = 1;
                args.jobLog("File imported as ".concat(outputPath));
                _a.label = 6;
            case 6: return [3 /*break*/, 8];
            case 7:
                error_1 = _a.sent();
                if (args.deps.axios.isAxiosError(error_1)) {
                    args.jobLog("Error calling ".concat(arr, "..."));
                    args.jobLog(JSON.stringify(error_1));
                }
                else {
                    throw error_1;
                }
                return [3 /*break*/, 8];
            case 8: return [3 /*break*/, 1];
            case 9:
                path_mapping_from = String(args.inputs.path_mapping_from);
                path_mapping_to = String(args.inputs.path_mapping_to);
                if (path_mapping_from !== '' && path_mapping_to !== '') {
                    outputPath = outputPath.replace(path_mapping_from, path_mapping_to);
                }
                return [2 /*return*/, {
                        outputFileObj: {
                            _id: outputPath,
                        },
                        outputNumber: outputNum,
                        variables: args.variables,
                    }];
        }
    });
}); };
exports.plugin = plugin;
