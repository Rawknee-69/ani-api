import { client } from "../../utils/client";
import { ANILIST_BASEURL, ANIME_QUERY } from "../../utils/constant";
import match from "string-similarity-js";
import { load } from "cheerio";
const HIANIME_BASEURL = "https://hianimez.to";

export const hianimeToAnilist = async (id: number) => {
  try {
    let info;

    const resp = await client.post<any, { data: { data: AnilistAnime } }>(
      ANILIST_BASEURL,
      {
        query: ANIME_QUERY,
        variables: {
          id,
        },
      }
    );
    const data = resp.data.data.Media;

    const matchedTitle = await searchNScrapeEPs(data.title);

    info = {
      hianimeMatch: matchedTitle, // instead of episodesList
    };

    return info;
  } catch (err: any) {
    console.error(err);
    return null;
  }
};

// search with title in hianime and call ep scraping func
export const searchNScrapeEPs = async (searchTitle: Title) => {
  try {
    const resp = await client.get(
      `${HIANIME_BASEURL}/search?keyword=${searchTitle.english}`
    );
    if (!resp) return console.log("No response from hianime !");
    const $ = load(resp.data);
    let similarTitles: { id: string; title: string; similarity: number }[] = [];
    
    $(".film_list-wrap > .flw-item .film-detail .film-name a")
      .map((i, el) => {
        const title = $(el).text();
        const id = $(el).attr("href")!.split("/").pop()?.split("?")[0] ?? "";
        const similarity = Number(
          (
            match(
              title.replace(/[\,\:]/g, ""),
              searchTitle.english || searchTitle.native
            ) * 10
          ).toFixed(2)
        );
        similarTitles.push({ id, title, similarity });
      })
      .get();

    similarTitles.sort((a, b) => b.similarity - a.similarity);

    const pick =
      (searchTitle.english.match(/\Season(.+?)\d/) &&
        similarTitles[0]?.title.match(/\Season(.+?)\d/)) ||
      (!searchTitle.english.match(/\Season(.+?)\d/) &&
        !similarTitles[0]?.title.match(/\Season(.+?)\d/))
        ? similarTitles[0]
        : similarTitles[1];

    console.log("Chosen title:", pick?.title, "ID:", pick?.id);

    return pick;
  } catch (err) {
    console.error(err);
    return null;
  }
};
