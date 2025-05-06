export declare const hianimeToAnilist: (id: number) => Promise<{
    hianimeMatch: void | {
        id: string;
        title: string;
        similarity: number;
    } | null;
} | null>;
export declare const searchNScrapeEPs: (searchTitle: Title) => Promise<void | {
    id: string;
    title: string;
    similarity: number;
} | null>;
