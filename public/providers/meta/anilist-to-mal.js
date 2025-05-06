"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNScrapeEPs = exports.hianimeToAnilist = void 0;
const client_1 = require("../../utils/client");
const constant_1 = require("../../utils/constant");
const string_similarity_js_1 = __importDefault(require("string-similarity-js"));
const cheerio_1 = require("cheerio");
const HIANIME_BASEURL = "https://hianimez.to";
const hianimeToAnilist = async (id) => {
    try {
        let info;
        const resp = await client_1.client.post(constant_1.ANILIST_BASEURL, {
            query: constant_1.ANIME_QUERY,
            variables: {
                id,
            },
        });
        const data = resp.data.data.Media;
        const matchedTitle = await (0, exports.searchNScrapeEPs)(data.title);
        info = {
            hianimeMatch: matchedTitle, // instead of episodesList
        };
        return info;
    }
    catch (err) {
        console.error(err);
        return null;
    }
};
exports.hianimeToAnilist = hianimeToAnilist;
// search with title in hianime and call ep scraping func
const searchNScrapeEPs = async (searchTitle) => {
    var _a, _b;
    try {
        const resp = await client_1.client.get(`${HIANIME_BASEURL}/search?keyword=${searchTitle.english}`);
        if (!resp)
            return console.log("No response from hianime !");
        const $ = (0, cheerio_1.load)(resp.data);
        let similarTitles = [];
        $(".film_list-wrap > .flw-item .film-detail .film-name a")
            .map((i, el) => {
            var _a, _b;
            const title = $(el).text();
            const id = (_b = (_a = $(el).attr("href").split("/").pop()) === null || _a === void 0 ? void 0 : _a.split("?")[0]) !== null && _b !== void 0 ? _b : "";
            const similarity = Number(((0, string_similarity_js_1.default)(title.replace(/[\,\:]/g, ""), searchTitle.english || searchTitle.native) * 10).toFixed(2));
            similarTitles.push({ id, title, similarity });
        })
            .get();
        similarTitles.sort((a, b) => b.similarity - a.similarity);
        const pick = (searchTitle.english.match(/\Season(.+?)\d/) &&
            ((_a = similarTitles[0]) === null || _a === void 0 ? void 0 : _a.title.match(/\Season(.+?)\d/))) ||
            (!searchTitle.english.match(/\Season(.+?)\d/) &&
                !((_b = similarTitles[0]) === null || _b === void 0 ? void 0 : _b.title.match(/\Season(.+?)\d/)))
            ? similarTitles[0]
            : similarTitles[1];
        console.log("Chosen title:", pick === null || pick === void 0 ? void 0 : pick.title, "ID:", pick === null || pick === void 0 ? void 0 : pick.id);
        return pick;
    }
    catch (err) {
        console.error(err);
        return null;
    }
};
exports.searchNScrapeEPs = searchNScrapeEPs;
//# sourceMappingURL=anilist-to-mal.js.map