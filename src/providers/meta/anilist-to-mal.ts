import { client } from "../../utils/client";
import { ANILIST_BASEURL, ANIME_QUERY } from "../../utils/constant";

export const hianimeToAnilist = async (id: number) => {
    try {
      let infoWithEp;
  
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

      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
}