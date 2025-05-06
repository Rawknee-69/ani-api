"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const axios_1 = __importDefault(require("axios"));
const constant_1 = require("./constant");
exports.client = axios_1.default.create({
    timeout: 20000,
    headers: {
        "Accept-Encoding": "gzip",
        ...constant_1.REQ_HEADERS
    }
});
//# sourceMappingURL=client.js.map