const API_BASE = "https://api.jikan.moe/v4";

const SECTIONS = [
  { id: "trendingGrid", endpoint: "/seasons/now", params: "limit=12" },
  {
    id: "popularGrid",
    endpoint: "/top/anime",
    params: "filter=bypopularity&limit=20",
  },
  {
    id: "moviesGrid",
    endpoint: "/anime",
    params: "type=movie&order_by=score&sort=desc&limit=10",
  },
  { id: "topTenGrid", endpoint: "/top/anime", params: "limit=10" },
  {
    id: "mostViewedGrid",
    endpoint: "/top/anime",
    params: "filter=favorite&limit=10",
  },
  {
    id: "upcomingGrid",
    endpoint: "/seasons/upcoming",
    params: "limit=10",
  },
];
// ✅ FIX 1: Rate limiter — waits between requests to avoid 429 errors from Jikan
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function init() {
  initCursor();

  // ✅ FIX 2: Stagger requests with 400ms delay to respect Jikan's rate limit (3 req/sec)
  for (const section of SECTIONS) {
    await fetchAndRender(section);
    await delay(400);
  }

  await delay(400);
  fetchRecommendations();
}

async function fetchAndRender(section) {
  const grid = document.getElementById(section.id);
  if (!grid) return; // ✅ FIX 3: Guard if element doesn't exist in DOM

  try {
    const response = await fetch(
      `${API_BASE}${section.endpoint}?${section.params}`,
    );

    // ✅ FIX 4: Handle non-ok HTTP responses (e.g. 429 rate limit, 500 server error)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    renderCards(grid, data.data, section.id === "trendingGrid");
  } catch (error) {
    console.error(`Error loading ${section.id}:`, error);
    grid.innerHTML = `<div class="loader">Error loading content for ${section.id}.</div>`;
  }
}

async function fetchRecommendations() {
  const grid = document.getElementById("relatedGrid");
  if (!grid) return; // ✅ FIX 3: Guard if element doesn't exist

  try {
    // ✅ FIX 5: Removed unsupported `limit` param from recommendations endpoint
    const response = await fetch(`${API_BASE}/recommendations/anime`);

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
    card.onclick = () =>
      (window.location.href = `description-page.html?id=${anime.mal_id}`);

    if (isTrendingSlider) {
      card.className = "trend-item";
      card.innerHTML = `
        <img src="${anime.images.webp.large_image_url}" alt="${anime.title}" loading="lazy">
        <h3 class="titlex" title="${anime.title}">${anime.title}</h3>`;
    } else {
      card.className = "card";
      card.innerHTML = `
        <div class="poster">
                        <img src="${anime.images.webp.large_image_url}" alt="${anime.title}" loading="lazy">
                    </div>
                    <div class="info">
                        <div class="title" title="${anime.title}">${anime.title}</div>
                        <div class="subtitle">
                            <span>${anime.type || "TV"}</span>
                            <span>${anime.year || anime.status || ""}</span>
                        </div>
                         <div class="badges">
                            <div class="badge active">EP: ${anime.episodes || "?"}</div>
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
