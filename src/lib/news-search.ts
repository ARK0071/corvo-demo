export interface NewsResult {
  title: string;
  url: string;
  description: string;
  date: string;
}

export async function searchMarketNews(
  query: string,
  count: number = 5
): Promise<NewsResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(count),
      freshness: "pm", // past month
    });

    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const results = data.web?.results ?? [];

    return results.slice(0, count).map(
      (r: { title?: string; url?: string; description?: string; age?: string }) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        description: r.description ?? "",
        date: r.age ?? "",
      })
    );
  } catch {
    return [];
  }
}
