"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION_FILE = exports.SERVICE_NAME = void 0;
const path_1 = __importDefault(require("path"));
const paths_1 = require("./paths");
exports.SERVICE_NAME = 'tenant-agent';
// Version file stored alongside binaries
exports.VERSION_FILE = path_1.default.join(paths_1.BIN_DIR, 'VERSION');
//# sourceMappingURL=service.js.map