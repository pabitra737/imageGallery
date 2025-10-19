/* script.js
   Modern Image Gallery behavior:
   - dynamic gallery rendering
   - filters, search, sort
   - load more + infinite scroll
   - lightbox (prev/next, keyboard)
   - favorites (localStorage)
   - download, fullscreen, slideshow
   - theme toggle (localStorage)
   - toasts and accessibility niceties
*/

/* ---------------------------
   Sample image data
   (Replace, extend, or load from API)
   --------------------------- */
const IMAGES = [
  // Each object: id, title, description, category, url, date (ISO), popularity (number)
  { id: "1", title: "Misty Forest", description: "Morning mist in evergreen forest.", category: "nature", url: "image/photo1.avif", date: "2024-11-05", popularity: 80 },
  { id: "2", title: "Desert Road", description: "Lonely road through sand dunes.", category: "travel", url: "image/photo2.avif", date: "2025-01-12", popularity: 54 },
  { id: "3", title: "City Sunrise", description: "Sunrise hitting skyscrapers.", category: "architecture", url: "image/photo3.avif", date: "2023-08-21", popularity: 120 },
  { id: "4", title: "Street Food Cart", description: "Spicy evening snacks.", category: "food", url: "image/photo4.avif", date: "2024-02-10", popularity: 63 },
  { id: "5", title: "Mountain Lake", description: "Crystal lake reflection.", category: "nature", url: "image/photo5.avif", date: "2025-03-03", popularity: 145 },
  { id: "6", title: "Vintage Train", description: "Old steam engine at station.", category: "travel", url: "image/photo6.avif", date: "2022-12-01", popularity: 42 },
  { id: "7", title: "Smiling Child", description: "Candid street portrait.", category: "people", url: "image/photo7.avif", date: "2024-06-18", popularity: 99 },
  { id: "8", title: "Blueberry Tart", description: "Fresh dessert close-up.", category: "food", url: "image/photo8.avif", date: "2025-05-02", popularity: 77 },
  { id: "9", title: "Old Bridge", description: "Historic stone bridge.", category: "architecture", url: "image/photo9.avif", date: "2023-10-10", popularity: 58 },
  { id: "10", title: "Coastal Cliffs", description: "Waves crash on cliffs.", category: "nature", url: "image/photo10.avif", date: "2025-07-08", popularity: 200 },
  { id: "11", title: "Neon Alley", description: "Nightlife in the city.", category: "travel", url: "image/photo11.avif", date: "2024-09-09", popularity: 88 },
  { id: "12", title: "Portrait in Window Light", description: "Soft natural light portrait.", category: "people", url: "image/photo12.avif", date: "2023-05-06", popularity: 110 },
  { id: "13", title: "Rooftop Cafe", description: "Coffee with city view.", category: "travel", url: "image/photo13.avif", date: "2025-02-14", popularity: 67 },
  { id: "14", title: "Autumn Path", description: "Leaves on a quiet path.", category: "nature", url: "image/photo14.avif", date: "2022-10-11", popularity: 47 },
  { id: "15", title: "Modern Lobby", description: "Minimal building lobby.", category: "architecture", url: "image/photo15.avif", date: "2025-06-25", popularity: 33 },
  { id: "16", title: "Festival Crowd", description: "Joyful packed crowd.", category: "people", url: "image/photo16.avif", date: "2024-12-30", popularity: 95 },
  { id: "17", title: "Pasta Delight", description: "Creamy pasta close-up.", category: "food", url: "image/photo17.avif", date: "2025-04-15", popularity: 71 },
  { id: "18", title: "Foggy Pier", description: "Pier vanishing into fog.", category: "travel", url: "image/photo18.avif", date: "2021-11-21", popularity: 29 },
  { id: "19", title: "Golden Fields", description: "Harvest fields at dusk.", category: "nature", url: "image/photo19.avif", date: "2024-08-30", popularity: 60 },
  { id: "20", title: "Glass Tower", description: "Reflections on glass facade.", category: "architecture", url: "image/photo20.avif", date: "2025-08-03", popularity: 125 }
];

/* ---------------------------
   App state & constants
   --------------------------- */
const PAGE_SIZE = 8;
let currentPage = 0;
let filteredList = [...IMAGES];
let activeCategory = "all";
let favorites = new Set(JSON.parse(localStorage.getItem("gallery_favorites") || "[]"));
let slideshowInterval = null;
let slideshowDelay = 3000; // ms
let currentIndex = 0; // index within filteredList of lightbox
const DARK_THEME_KEY = "gallery_theme";

/* ---------------------------
   DOM nodes
   --------------------------- */
const galleryEl = document.getElementById("gallery");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const loadingSpinner = document.getElementById("loadingSpinner");
const filterBtns = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxDescription = document.getElementById("lightboxDescription");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const favoriteBtn = document.getElementById("favoriteBtn");
const downloadBtn = document.getElementById("downloadBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const slideshowBtn = document.getElementById("slideshowBtn");
const imageCounter = document.getElementById("imageCounter");
const toastContainer = document.getElementById("toastContainer");
const themeToggle = document.getElementById("themeToggle");

/* ---------------------------
   Initialization
   --------------------------- */
function init() {
  bindUI();
  applyStoredTheme();
  applyFiltersSearchSort(); // prepares filteredList, then renders first page
  renderGalleryPage();
  setupInfiniteScroll();
}

function bindUI() {
  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.filter || "all";
      resetAndRender();
    });
  });

  // Search + debounce
  let searchDeb;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDeb);
    searchDeb = setTimeout(() => resetAndRender(), 220);
  });

  // Sort
  sortSelect.addEventListener("change", () => resetAndRender());

  // Load more
  loadMoreBtn.addEventListener("click", () => renderGalleryPage());

  // Lightbox controls
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", showPrev);
  lightboxNext.addEventListener("click", showNext);
  document.getElementById("lightboxOverlay").addEventListener("click", closeLightbox);

  // Lightbox action buttons
  favoriteBtn.addEventListener("click", toggleFavoriteCurrent);
  downloadBtn.addEventListener("click", downloadCurrentImage);
  fullscreenBtn.addEventListener("click", toggleFullscreen);
  slideshowBtn.addEventListener("click", toggleSlideshow);

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("active")) {
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "Escape") closeLightbox();
      if (e.key === " " && e.target.tagName !== "INPUT") { // space toggles slideshow
        e.preventDefault();
        toggleSlideshow();
      }
    }
  });

  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);
}

function applyStoredTheme() {
  const stored = localStorage.getItem(DARK_THEME_KEY);
  if (stored === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

/* ---------------------------
   Filtering / Searching / Sorting
   --------------------------- */
function applyFiltersSearchSort() {
  const query = (searchInput.value || "").trim().toLowerCase();
  // Filter by category & search
  filteredList = IMAGES.filter(img => {
    const matchesCategory = activeCategory === "all" ? true : img.category === activeCategory;
    const matchesSearch = query === "" ? true : (img.title + " " + img.description + " " + img.category).toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Sort
  const sortBy = sortSelect.value;
  filteredList.sort((a, b) => {
    if (sortBy === "newest") return new Date(b.date) - new Date(a.date);
    if (sortBy === "oldest") return new Date(a.date) - new Date(b.date);
    if (sortBy === "popular") return b.popularity - a.popularity;
    if (sortBy === "name") return a.title.localeCompare(b.title);
    return 0;
  });

  currentPage = 0;
}

/* ---------------------------
   Rendering gallery pages
   --------------------------- */
function resetAndRender() {
  galleryEl.innerHTML = "";
  applyFiltersSearchSort();
  renderGalleryPage(true);
}

function renderGalleryPage(reset = false) {
  // Show spinner for UX
  loadingSpinner.style.display = "flex";
  loadMoreBtn.style.display = "none";

  // Compute slice
  const start = currentPage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filteredList.slice(start, end);

  // Render items
  pageItems.forEach((img, idx) => {
    const itemEl = createGalleryItem(img, start + idx);
    galleryEl.appendChild(itemEl);
  });

  // Hide spinner
  loadingSpinner.style.display = "none";

  // Show "Load more" if more items remain
  if (end < filteredList.length) {
    loadMoreBtn.style.display = "flex";
  } else {
    loadMoreBtn.style.display = "none";
  }

  // Update page cursor
  currentPage++;

  // If nothing rendered
  if (filteredList.length === 0) {
    galleryEl.innerHTML = `<p style="padding:2rem; color:var(--text-muted)">No images found.</p>`;
  }
}

/* Create a gallery item node */
function createGalleryItem(img, indexAbsolute) {
  const wrap = document.createElement("div");
  wrap.className = "gallery-item";
  wrap.tabIndex = 0;
  wrap.setAttribute("role", "button");
  wrap.dataset.index = indexAbsolute;

  // Image element with lazy loading
  const image = document.createElement("img");
  image.loading = "lazy";
  image.alt = img.title;
  image.src = img.url;
  image.decoding = "async";

  // overlay
  const overlay = document.createElement("div");
  overlay.className = "gallery-item-overlay";

  const openBtn = document.createElement("button");
  openBtn.className = "overlay-btn";
  openBtn.title = "Open";
  openBtn.innerHTML = '<i class="fas fa-expand"></i>';
  openBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openLightboxByIndex(indexAbsolute);
  });

  const favBtn = document.createElement("button");
  favBtn.className = "overlay-btn";
  favBtn.title = "Favorite";
  favBtn.innerHTML = favorites.has(img.id) ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(img.id, favBtn);
  });

  overlay.appendChild(openBtn);
  overlay.appendChild(favBtn);

  // info area
  const info = document.createElement("div");
  info.className = "gallery-item-info";
  const t = document.createElement("div");
  t.className = "gallery-item-title";
  t.textContent = img.title;
  const c = document.createElement("div");
  c.className = "gallery-item-category";
  c.textContent = img.category;
  info.appendChild(t);
  info.appendChild(c);

  wrap.appendChild(image);
  wrap.appendChild(overlay);
  wrap.appendChild(info);

  // Click on whole item opens lightbox
  wrap.addEventListener("click", () => openLightboxByIndex(indexAbsolute));
  // keyboard accessible
  wrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") openLightboxByIndex(indexAbsolute);
  });

  return wrap;
}

/* ---------------------------
   Favorites
   --------------------------- */
function persistFavorites() {
  localStorage.setItem("gallery_favorites", JSON.stringify(Array.from(favorites)));
}

function toggleFavorite(imgId, btnNode) {
  if (favorites.has(imgId)) {
    favorites.delete(imgId);
    //showToast("Removed from favorites", "info");
    if (btnNode) btnNode.innerHTML = '<i class="far fa-heart"></i>';
  } else {
    favorites.add(imgId);
    //showToast("Added to favorites", "success");
    if (btnNode) btnNode.innerHTML = '<i class="fas fa-heart"></i>';
  }
  persistFavorites();
  // update lightbox favorite if open
  updateLightboxFavoriteIcon();
}

function toggleFavoriteCurrent() {
  if (!filteredList[currentIndex]) return;
  toggleFavorite(filteredList[currentIndex].id);
  updateLightboxFavoriteIcon();
}

/* ---------------------------
   Lightbox
   --------------------------- */
function openLightboxByIndex(indexAbsolute) {
  // Map absolute index into filteredList: when rendering pages we set data.index = absolute index in filteredList
  if (indexAbsolute < 0 || indexAbsolute >= filteredList.length) return;
  currentIndex = indexAbsolute;
  openLightbox();
}

function openLightbox() {
  updateLightbox();
  lightbox.classList.add("active");
  // focus for keyboard
  lightboxClose.focus();
}

function updateLightbox() {
  const img = filteredList[currentIndex];
  if (!img) return;
  lightboxImage.src = ""; // show loader while setting
  lightboxImage.alt = img.title;
  lightboxTitle.textContent = img.title;
  lightboxDescription.textContent = img.description;
  imageCounter.textContent = `${currentIndex + 1} / ${filteredList.length}`;
  // set src (browsers will show once loaded)
  lightboxImage.src = img.url;
  updateLightboxFavoriteIcon();
}

function updateLightboxFavoriteIcon() {
  const img = filteredList[currentIndex];
  if (!img) return;
  if (favorites.has(img.id)) favoriteBtn.classList.add("active");
  else favoriteBtn.classList.remove("active");
  // update icon inside
  favoriteBtn.innerHTML = favorites.has(img.id) ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
}

function closeLightbox() {
  lightbox.classList.remove("active");
  stopSlideshow();
}

/* Prev / Next */
function showPrev() {
  if (filteredList.length === 0) return;
  currentIndex = (currentIndex - 1 + filteredList.length) % filteredList.length;
  updateLightbox();
}

function showNext() {
  if (filteredList.length === 0) return;
  currentIndex = (currentIndex + 1) % filteredList.length;
  updateLightbox();
}

/* ---------------------------
   Download and Fullscreen
   --------------------------- */
async function downloadCurrentImage() {
  const img = filteredList[currentIndex];
  if (!img) return;
  try {
    // Attempt to fetch blob and trigger download (works cross-origin if server sets CORS; Unsplash does)
    const res = await fetch(img.url);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = (img.title || "image") + ".jpg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Download started", "success");
  } catch (err) {
    // fallback: open image in new tab
    window.open(img.url, "_blank");
    showToast("Opened image in new tab (download may require manual save)", "info");
  }
}

function toggleFullscreen() {
  const container = lightbox.querySelector(".lightbox-content");
  if (!document.fullscreenElement) {
    container.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

/* ---------------------------
   Slideshow
   --------------------------- */
function toggleSlideshow() {
  if (slideshowInterval) stopSlideshow();
  else startSlideshow();
}

function startSlideshow() {
  slideshowBtn.classList.add("active");
  slideshowBtn.innerHTML = '<i class="fas fa-pause"></i>';
  slideshowInterval = setInterval(() => {
    showNext();
  }, slideshowDelay);
  //showToast("Slideshow started", "info");
}

function stopSlideshow() {
  if (!slideshowInterval) return;
  clearInterval(slideshowInterval);
  slideshowInterval = null;
  slideshowBtn.classList.remove("active");
  slideshowBtn.innerHTML = '<i class="fas fa-play"></i>';
  //showToast("Slideshow stopped", "info");
}

/* ---------------------------
   Infinite scroll (IntersectionObserver)
   --------------------------- */
function setupInfiniteScroll() {
  const sentinel = document.createElement("div");
  sentinel.id = "infinite-sentinel";
  sentinel.style.width = "100%";
  sentinel.style.height = "1px";
  document.querySelector(".main .container").appendChild(sentinel);

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && loadMoreBtn.style.display !== "none") {
        renderGalleryPage();
      }
    });
  }, { root: null, threshold: 0.1 });

  io.observe(sentinel);
}

/* ---------------------------
   Theme toggle
   --------------------------- */
function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(DARK_THEME_KEY, "light");
    //showToast("Light mode activated", "info");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(DARK_THEME_KEY, "dark");
    //showToast("Dark mode activated", "info");
  }
  updateThemeButton();
}

/* ---------------------------
   Toasts
   --------------------------- */
function showToast(message = "", type = "info", ms = 3000) {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.setAttribute("role", "status");
  t.setAttribute("aria-live", "polite");
  t.innerHTML = `<div style="flex:1">${message}</div><button aria-label="Dismiss" class="toast-close" style="border:none;background:none;color:inherit;cursor:pointer;padding:0 0.25rem"><i class="fas fa-times"></i></button>`;
  const closeBtn = t.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => t.remove());
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.remove();
  }, ms);
}

/* ---------------------------
   Utilities
   --------------------------- */
window.addEventListener("beforeunload", () => persistFavorites());

/* ---------------------------
   Start app
   --------------------------- */
init();


// DOM nodes for favorites sidebar
const favoritesSidebar = document.getElementById("favoritesSidebar");
const favoritesList = document.getElementById("favoritesList");
const favoritesToggle = document.getElementById("favoritesToggle");
const favoriteCountEl = document.getElementById("favoriteCount");

// Toggle sidebar
favoritesToggle.addEventListener("click", () => {
    favoritesSidebar.classList.toggle("active");
});

// Function to update favorite count on the heart icon
function updateFavoriteCount() {
    favoriteCountEl.textContent = favorites.size;
}

// Render favorites in sidebar and update counter
function renderFavoritesSidebar() {
    favoritesList.innerHTML = ""; // clear
    updateFavoriteCount(); // update counter in real-time

    if (favorites.size === 0) {
        favoritesList.innerHTML = "<p style='color:var(--text-muted)'>No favorites yet.</p>";
        return;
    }

    Array.from(favorites).forEach(imgId => {
        const imgData = IMAGES.find(i => i.id === imgId);
        if (!imgData) return;

        const favItem = document.createElement("div");
        favItem.className = "favorites-item";

        // Image click opens lightbox
        const imgEl = document.createElement("img");
        imgEl.src = imgData.url;
        imgEl.alt = imgData.title;
        imgEl.addEventListener("click", () => {
            const index = filteredList.findIndex(i => i.id === imgData.id);
            openLightboxByIndex(index >= 0 ? index : 0);
        });

        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-favorite";
        removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
        removeBtn.addEventListener("click", () => {
            toggleFavorite(imgData.id); // remove from favorites
            renderFavoritesSidebar(); // update sidebar + counter
            resetAndRender(); // update gallery hearts
        });

        favItem.appendChild(imgEl);
        favItem.appendChild(removeBtn);
        favoritesList.appendChild(favItem);
    });
}

// Toggle favorite status
function toggleFavorite(imgId, btnNode) {
    if (favorites.has(imgId)) {
        favorites.delete(imgId);
        if (btnNode) btnNode.innerHTML = '<i class="far fa-heart"></i>';
    } else {
        favorites.add(imgId);
        if (btnNode) btnNode.innerHTML = '<i class="fas fa-heart"></i>';
    }

    persistFavorites(); // save to localStorage if needed
    updateLightboxFavoriteIcon(); // update lightbox heart if open
    renderFavoritesSidebar(); // update sidebar + counter instantly
}

// Initial render
renderFavoritesSidebar();

