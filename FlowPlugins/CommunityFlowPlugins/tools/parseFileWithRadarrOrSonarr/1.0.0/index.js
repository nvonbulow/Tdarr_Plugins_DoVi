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
}); };
exports.details = details;
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, arr, arr_api_key, arr_host, meta, arrHost, headers, arrInfo, res, error_1, res, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                arr = String(args.inputs.arr).toLowerCase();
                arr_api_key = String(args.inputs.arr_api_key);
                arr_host = String(args.inputs.arr_host).trim();
                meta = args.inputFileObj.meta;
                arrHost = arr_host.endsWith('/') ? arr_host.slice(0, -1) : arr_host;
                headers = {
                    'Content-Type': 'application/json',
                    'X-Api-Key': arr_api_key,
                    Accept: 'application/json',
                };
                if (!(arr === 'radarr')) return [3 /*break*/, 6];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, args.deps.axios.get("".concat(arrHost, "/api/v3/parse?title=").concat(encodeURIComponent((meta === null || meta === void 0 ? void 0 : meta.FileName) || '')), { headers: headers })];
            case 2:
                res = _a.sent();
                arrInfo = { fileId: res.data.movie.id, originalPath: args.originalLibraryFile._id };
                args.jobLog("Got movieId from Radarr: ".concat(arrInfo.fileId));
                return [4 /*yield*/, args.deps.axios.get("".concat(arrHost, "/api/v3/movie/").concat(arrInfo.fileId), { headers: headers })];
            case 3:
                res = _a.sent();
                args.jobLog('Movie info from Radarr:');
                args.jobLog(JSON.stringify(res.data));
                arrInfo.originalPath = res.data.movieFile.path ? res.data.movieFile.path : args.originalLibraryFile._id;
                arrInfo.releaseGroup = res.data.movieFile.releaseGroup;
                arrInfo.sceneName = res.data.movieFile.sceneName;
                args.deps.fsextra.writeJsonSync("".concat(args.workDir, "/arr.json"), arrInfo);
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                if (args.deps.axios.isAxiosError(error_1)) {
                    args.jobLog('Error calling Radarr...');
                    args.jobLog(JSON.stringify(error_1));
                }
                else {
                    throw error_1;
                }
                return [3 /*break*/, 5];
            case 5: return [3 /*break*/, 13];
            case 6:
                if (!(arr === 'sonarr')) return [3 /*break*/, 12];
                _a.label = 7;
            case 7:
                _a.trys.push([7, 10, , 11]);
                return [4 /*yield*/, args.deps.axios.get("".concat(arrHost, "/api/v3/parse?title=").concat(encodeURIComponent((meta === null || meta === void 0 ? void 0 : meta.FileName) || '')), { headers: headers })];
            case 8:
                res = _a.sent();
                arrInfo = {
                    fileId: res.data.episodes[0].id,
                    originalPath: args.originalLibraryFile._id,
                };
                args.jobLog("Got fileId from Sonarr: ".concat(arrInfo.fileId));
                return [4 /*yield*/, args.deps.axios.get("".concat(arrHost, "/api/v3/episode/").concat(arrInfo.fileId), { headers: headers })];
            case 9:
                res = _a.sent();
                args.jobLog('Episode info from Sonarr:');
                args.jobLog(JSON.stringify(res.data));
                arrInfo.originalPath = res.data.episodeFile.path ? res.data.episodeFile.path : args.originalLibraryFile._id;
                arrInfo.releaseGroup = res.data.episodeFile.releaseGroup;
                arrInfo.sceneName = res.data.episodeFile.sceneName;
                args.deps.fsextra.writeJsonSync("".concat(args.workDir, "/arr.json"), arrInfo);
                return [3 /*break*/, 11];
            case 10:
                error_2 = _a.sent();
                if (args.deps.axios.isAxiosError(error_2)) {
                    args.jobLog('Error calling Sonarr...');
                    args.jobLog(JSON.stringify(error_2));
                }
                else {
                    throw error_2;
                }
                return [3 /*break*/, 11];
            case 11: return [3 /*break*/, 13];
            case 12:
                args.jobLog('No arr specified in plugin inputs.');
                _a.label = 13;
            case 13: return [2 /*return*/, {
                    outputFileObj: args.inputFileObj,
                    outputNumber: 1,
                    variables: args.variables,
                }];
        }
    });
}); };
exports.plugin = plugin;
