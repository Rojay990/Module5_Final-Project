// AniVerse — search, API sorting, and rating filtering.
const animeRow = document.querySelector(".anime__row");
const searchInput = document.querySelector(".search__bar--input");
const sortSelect = document.querySelector(".anime__filters");
const resultsStatus = document.querySelector(".anime__status");

// What is actually visible after applying the slider.
let renderedList = [];
// Keep the latest API/search/sort results so widening the slider restores hidden anime.
let sourceList = [];
let currentSearch = "";
let currentTitle = "Watch Anime Online Free in HD";
let latestRequest = 0;

const API_URL = "https://kitsu.io/api/edge/anime";
const SORT_OPTIONS = {
  highest__rating: "-averageRating",
  newest: "-startDate",
  oldest: "startDate",
  episodes: "-episodeCount",
};

// An inline placeholder means you do not need to add another image file.
const FALLBACK_POSTER =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">' +
      '<rect width="300" height="450" fill="#201331"/>' +
      '<circle cx="150" cy="185" r="42" fill="none" stroke="#a850ec" stroke-width="4"/>' +
      '<path d="M133 185h34M150 168v34" stroke="#a850ec" stroke-width="4"/>' +
      '<text x="150" y="255" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#ffffff">No poster available</text>' +
    "</svg>",
  );

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTitle(anime) {
  const attributes = anime.attributes ?? {};
  return (
    attributes.titles?.en ||
    attributes.titles?.en_jp ||
    attributes.titles?.ja_jp ||
    attributes.canonicalTitle ||
    "Untitled anime"
  );
}

function getRating(anime) {
  const value = anime.attributes?.averageRating;
  if (value === null || value === undefined || value === "") return null;
  const rating = Number(value);
  return Number.isFinite(rating) ? rating : null;
}

function setStatus(message) {
  resultsStatus.textContent = message;
}

// One API function handles home, title searches, and server-side sorting.
async function loadAnime() {
  const requestId = ++latestRequest;
  const params = new URLSearchParams();
  params.set("page[limit]", currentSearch ? "6" : "20");
  if (currentSearch) params.set("filter[text]", currentSearch);
  const sortValue = SORT_OPTIONS[sortSelect.value];
  if (sortValue) params.set("sort", sortValue);

  setStatus("Loading anime...");
  try {
    const response = await fetch(`${API_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Kitsu returned HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.data)) throw new Error("Unexpected API response");
    if (requestId !== latestRequest) return; // Ignore older requests finishing late.
    renderHtml(data.data, currentTitle);
  } catch (error) {
    if (requestId !== latestRequest) return;
    console.error("Could not load anime:", error);
    setStatus("Unable to load anime right now. Please try again.");
  }
}

function renderAnime() {
  currentSearch = "";
  searchInput.value = "";
  sortSelect.value = "";
  currentTitle = "Watch Anime Online Free in HD";
  loadAnime();
}

function searchAnime(event) {
  event.preventDefault();
  currentSearch = searchInput.value.trim();
  currentTitle = currentSearch
    ? `Search results for "${currentSearch}"`
    : "Watch Anime Online Free in HD";
  loadAnime();
}

function filterAnime() {
  // Search and sort remain compatible: the request keeps currentSearch.
  loadAnime();
}

// renderHtml creates the current cards, then applies the slider to these results.
function renderHtml(array, title = "Watch Anime Online Free in HD") {
  sourceList = [...array];
  currentTitle = title;

  const cards = sourceList.map((anime, index) => {
    const attributes = anime.attributes ?? {};
    const titleText = getTitle(anime);
    const poster = attributes.posterImage?.large || FALLBACK_POSTER;
    const rating = getRating(anime);
    const episodeCount = attributes.episodeCount ?? "N/A";
    const duration = attributes.episodeLength == null
      ? "N/A"
      : `${attributes.episodeLength} mins`;

    return `
      <div class="anime__display" data-anime-index="${index}">
        <figure class="anime__img--wrapper">
          <img src="${escapeHtml(poster)}" alt="${escapeHtml(titleText)} poster"
               class="anime__img" loading="lazy" />
          <span class="anime__rating"><i class="fa fa-star" aria-hidden="true"></i>
            ${rating ?? "N/A"}
          </span>
          <span class="anime__sub">SUB</span>
          <p class="anime__episode--count">${escapeHtml(episodeCount)}</p>
        </figure>
        <div class="anime__description">
          <h4 class="anime__title">${escapeHtml(titleText)}</h4>
          <h4 class="anime__release--year">${escapeHtml(attributes.startDate?.slice(0, 4) || "N/A")}</h4>
          <div class="description__count">
            <h4 class="anime__duration">${escapeHtml(duration)}</h4>
            <i class="fa-solid fa-circle" aria-hidden="true"></i>
            <p class="episode--count">${escapeHtml(episodeCount)} eps</p>
          </div>
        </div>
      </div>`;
  }).join("");

  animeRow.innerHTML = `
    <h2 class="section__header">${escapeHtml(currentTitle)}</h2>
    ${cards}
    <p class="anime__empty" hidden>No anime match this rating range.</p>
  `;
  applyRatingFilter();
}

const minRange = document.querySelector(".rating-range__min");
const maxRange = document.querySelector(".rating-range__max");
const rangeProgress = document.querySelector(".rating-range__progress");
const rangeValue = document.querySelector(".rating-range__value");
const minGap = 1;

function applyRatingFilter() {
  const minimum = Number(minRange.value);
  const maximum = Number(maxRange.value);
  const fullRange = minimum === 0 && maximum === 100;
  const visible = [];
  const cards = animeRow.querySelectorAll(".anime__display");

  sourceList.forEach((anime, index) => {
    const rating = getRating(anime);
    // At 0–100 show everything, including entries without a rating.
    const show = fullRange || (rating !== null && rating >= minimum && rating <= maximum);
    if (cards[index]) cards[index].hidden = !show;
    if (show) visible.push(anime);
  });

  renderedList = visible; // Always exactly the anime displayed on screen.
  const emptyMessage = animeRow.querySelector(".anime__empty");
  if (emptyMessage) {
    emptyMessage.hidden = visible.length > 0;
    emptyMessage.textContent = sourceList.length
      ? "No anime match this rating range. Try widening the slider."
      : "No anime found. Try another search.";
  }
  setStatus(`Showing ${renderedList.length} of ${sourceList.length} loaded anime`);
}

function updateRange(event) {
  let minValue = Number(minRange.value);
  let maxValue = Number(maxRange.value);

  if (event.target === minRange) {
    minValue = Math.min(minValue, maxValue - minGap);
    minRange.value = minValue;
  } else if (event.target === maxRange) {
    maxValue = Math.max(maxValue, minValue + minGap);
    maxRange.value = maxValue;
  }

  rangeValue.textContent = `${minValue} - ${maxValue}`;
  rangeProgress.style.left = `${minValue}%`;
  rangeProgress.style.right = `${100 - maxValue}%`;
  applyRatingFilter();
}

// Whichever handle has keyboard focus/pointer focus stays reachable when close.
function prioritizeThumb(event) {
  minRange.style.zIndex = event.currentTarget === minRange ? "5" : "3";
  maxRange.style.zIndex = event.currentTarget === maxRange ? "5" : "4";
}
for (const range of [minRange, maxRange]) {
  range.addEventListener("input", updateRange);
  range.addEventListener("focus", prioritizeThumb);
  range.addEventListener("pointerdown", prioritizeThumb);
}

// The initial range is 0–100: the page should start with every loaded anime.
rangeValue.textContent = `${minRange.value} - ${maxRange.value}`;
rangeProgress.style.left = `${minRange.value}%`;
rangeProgress.style.right = `${100 - Number(maxRange.value)}%`;
renderAnime();
