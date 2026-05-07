const JIKAN_API_BASE = "https://api.jikan.moe/v4";
const ANILIST_API_URL = "https://graphql.anilist.co";
const KITSU_API_BASE = "https://kitsu.io/api/edge";

// AniList GraphQL Queries
const ANILIST_QUERIES = {
  trending: `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: TRENDING_DESC) {
            id title { romaji english } coverImage { large }
            averageScore episodes format status seasonYear
          }
        }
      }
    `,
  popular: `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: POPULARITY_DESC) {
            id title { romaji english } coverImage { large }
            averageScore episodes format status seasonYear
          }
        }
      }
    `,
  movie: `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC) {
            id title { romaji english } coverImage { large }
            averageScore episodes format status seasonYear
          }
        }
      }
    `,
  topten: `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: SCORE_DESC) {
            id title { romaji english } coverImage { large }
            averageScore episodes format status seasonYear
          }
        }
      }
    `,
  mostviewed: `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: FAVOURITES_DESC) {
            id title { romaji english } coverImage { large }
            averageScore episodes format status seasonYear
          }
        }
      }
    `,
  upcoming: `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
            id title { romaji english } coverImage { large }
            averageScore episodes format status seasonYear
          }
        }
      }
    `,
};

// Section Configuration
const SECTIONS = [
  {
    id: "trendingGrid",
    api: "anilist",
    query: "trending",
    params: { perPage: 12 },
  },
  {
    id: "popularGrid",
    api: "anilist",
    query: "popular",
    params: { perPage: 20 },
  },
  { id: "moviesGrid", api: "anilist", query: "movie", params: { perPage: 10 } },
  {
    id: "topTenGrid",
    api: "anilist",
    query: "topten",
    params: { perPage: 10 },
  },
  {
    id: "mostViewedGrid",
    api: "anilist",
    query: "mostviewed",
    params: { perPage: 10 },
  },
  {
    id: "upcomingGrid",
    api: "anilist",
    query: "upcoming",
    params: { perPage: 10 },
  },
];

// Rate limiter — waits between requests to avoid 429 errors
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function init() {
  initCursor();

  for (const section of SECTIONS) {
    await fetchAndRender(section);
    await delay(400); // Stagger requests
  }

  await delay(400);
  fetchRecommendations(); // This will still use Jikan for now
}

async function fetchAndRender(section) {
  const grid = document.getElementById(section.id);
  if (!grid) return;

  try {
    let data;
    if (section.api === "anilist") {
      const response = await fetch(ANILIST_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: ANILIST_QUERIES[section.query],
          variables: { page: 1, ...section.params },
        }),
      });
      if (!response.ok) {
        throw new Error(`AniList HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      data = result.data.Page.media;
    } else if (section.api === "kitsu") {
      const response = await fetch(
        `${KITSU_API_BASE}${section.endpoint}?${section.params}`,
      );
      if (!response.ok) {
        throw new Error(`Kitsu HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      data = result.data.map((item) => ({
        // Normalize Kitsu data
        mal_id: item.id, // Kitsu uses 'id' for its own ID, mapping to mal_id for consistency
        title: {
          romaji: item.attributes.canonicalTitle,
          english: item.attributes.titles.en || item.attributes.canonicalTitle,
        },
        images: {
          webp: { large_image_url: item.attributes.posterImage.large },
        },
        score: item.attributes.averageRating
          ? parseFloat(item.attributes.averageRating).toFixed(2)
          : "N/A",
        type: item.attributes.showType,
        status: item.attributes.status,
        episodes: item.attributes.episodeCount,
        year: new Date(item.attributes.startDate).getFullYear(),
      }));
    } else {
      // Default to Jikan
      const response = await fetch(
        `${JIKAN_API_BASE}${section.endpoint}?${section.params}`,
      );
      if (!response.ok) {
        throw new Error(`Jikan HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      data = result.data;
    }
    renderCards(grid, data, section.id === "trendingGrid");
  } catch (error) {
    console.error(`Error loading ${section.id}:`, error);
    grid.innerHTML = `<div class="loader">Error loading content for ${section.id}.</div>`;
  }
}

async function fetchRecommendations() {
  const grid = document.getElementById("relatedGrid");
  if (!grid) return;

  try {
    // Currently using Jikan for recommendations as it's readily available.
    // This can be extended to use AniList or Kitsu recommendations if needed.
    const response = await fetch(`${JIKAN_API_BASE}/recommendations/anime`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const animeList = data.data.slice(0, 10).map((item) => item.entry[0]);
    renderCards(grid, animeList, false);
  } catch (error) {
    console.error("Error loading recommendations:", error);
    grid.innerHTML = `<div class="loader">Error loading recommendations.</div>`;
  }
}

function renderCards(container, list, isTrendingSlider) {
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = `<div class="loader">No content found.</div>`;
    return;
  }

  list.forEach((anime, index) => {
    const card = document.createElement("article");
    card.style.opacity = "0";
    // Use mal_id for Jikan and Kitsu, and id for AniList. Normalize to mal_id for description page.
    const animeId = anime.mal_id || anime.id;
    card.onclick = () =>
      (window.location.href = `description-page.html?id=${animeId}`);

    // Normalize title and image URL for consistent rendering
    const title = anime.title.english || anime.title.romaji || anime.title;
    const imageUrl =
      anime.images?.webp?.large_image_url ||
      anime.coverImage?.large ||
      anime.coverImage?.extraLarge;
    const score = anime.score || anime.averageScore || "N/A";
    const type = anime.type || "TV";
    const episodes = anime.episodes || "?";
    const yearOrStatus = anime.year || anime.status || "";

    if (isTrendingSlider) {
      card.className = "trend-item";
      card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" loading="lazy">
        <h3 class="titlex" title="${title}">${title}</h3>`;
    } else {
      card.className = "card";
      card.innerHTML = `
        <div class="poster">
          <img src="${imageUrl}" alt="${title}" loading="lazy">
        </div>
        <div class="info">
          <div class="title" title="${title}">${title}</div>
          <div class="subtitle">
            <span>${type}</span>
            <span>${yearOrStatus}</span>
          </div>
          <div class="badges">
            <div class="badge active">EP: ${episodes}</div>
            <div class="badge">SUB</div>
          </div>
        </div>`;
    }

    container.appendChild(card);

    if (window.gsap) {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay: index * 0.05,
        ease: "power2.out",
      });
    } else {
      card.style.opacity = "1";
    }
  });
}

function initCursor() {
  const cursor = document.querySelector(".cursor");
  if (cursor) {
    document.addEventListener("mousemove", (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
