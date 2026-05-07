const CONFIG = {
  perPage: 10,
  slideInterval: 5000, // 5 seconds per slide
};

async function fetchAiringAnime() {
  const query = `
    query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
            media(status: RELEASING, type: ANIME, sort: TRENDING_DESC) {
                id
                title { romaji english }
                bannerImage
                coverImage { extraLarge }
            }
        }
    }
    `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { page: 1, perPage: CONFIG.perPage },
      }),
    });
    const data = await response.json();
    return data.data.Page.media;
  } catch (error) {
    console.error("AniList Fetch Error:", error);
    return [];
  }
}

function injectRequiredStyles() {
  const style = document.createElement("style");
  style.textContent = `
        .x-ero { position: relative;
  height: min(68vh, 560px);
  overflow: hidden;
  border-radius: 12px;}
        .slidx { display: flex; transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1); height: 100%; }
        .zero { min-width: 100%; height: 100%; background-size: cover; background-position: center; position: relative; }
        .overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)); }
        .x-ero-content { position: absolute; bottom: 40px; left: 40px; color: white; z-index: 10; pointer-events: none; }
        .x-ero-hud {position: absolute;
      top: 18px;
      left: 18px;
      color: #fff;
      display: flex;
      gap: 12px;
      align-items: center;}
    `;
  document.head.appendChild(style);
}

async function initShowcase() {
  const slidx = document.getElementById("slidx");
  const titleEl = document.querySelector(".x-ero-content h1");
  const metaEl = document.querySelector(".x-ero-content .meta");

  if (!slidx) return;

  // 1. Ensure basic layout styles exist
  injectRequiredStyles();

  // 2. Get Data
  const animeList = await fetchAiringAnime();
  if (animeList.length === 0) return;

  // 3. Build Slides
  slidx.innerHTML = "";
  animeList.forEach((anime) => {
    const img = anime.bannerImage || anime.coverImage.extraLarge;
    const slide = document.createElement("div");
    slide.className = "zero";
    slide.style.backgroundImage = `url("${img}")`;

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    slide.appendChild(overlay);
    slidx.appendChild(slide);
  });

  // 4. Simple Slider Logic
  let currentIndex = 0;

  function updateText(index) {
    const anime = animeList[index];
    if (titleEl)
      titleEl.textContent = (
        anime.title.english || anime.title.romaji
      ).toUpperCase();
    if (metaEl) metaEl.textContent = `Airing Now • ${anime.title.romaji}`;
  }

  function goToSlide(index) {
    currentIndex = index;
    slidx.style.transform = `translateX(-${index * 100}%)`;
    updateText(index);
  }

  // Start Auto-play
  updateText(0);
  setInterval(() => {
    let next = (currentIndex + 1) % animeList.length;
    goToSlide(next);
  }, CONFIG.slideInterval);
}

// Run
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShowcase);
} else {
  initShowcase();
}
