let translations = {};
let busData = [];

// Load both JSON files
Promise.all([
  fetch("translations.json").then((response) => response.json()),
  fetch("bus-routes.json").then((response) => response.json()),
])
  .then(([translationsData, busData_raw]) => {
    translations = translationsData;
    busData = busData_raw.buses;
    initializeApp();
  })
  .catch((error) => {
    console.error("Error loading data:", error);
    busData = [];
    translations = {};
  });

let currentLanguage = localStorage.getItem("language") || "bn";

const fromSelect = document.getElementById("fromSelect");
const toSelect = document.getElementById("toSelect");
const searchInput = document.getElementById("searchInput");
const busResults = document.getElementById("busResults");
const themeToggle = document.getElementById("themeToggle");
const languageToggle = document.getElementById("languageToggle");

function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.remove("dark");
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

function updateLanguage() {
  currentLanguage = currentLanguage === "bn" ? "en" : "bn";
  localStorage.setItem("language", currentLanguage);
  languageToggle.textContent = currentLanguage === "bn" ? "EN" : "BN";
  updatePageLanguage();
}

function populateDropdowns() {
  // Clear existing options except the first one
  const fromOptions = fromSelect.querySelectorAll("option");
  const toOptions = toSelect.querySelectorAll("option");

  fromOptions.forEach((opt, i) => {
    if (i > 0) opt.remove();
  });
  toOptions.forEach((opt, i) => {
    if (i > 0) opt.remove();
  });

  // Extract locations based on current language
  const locations = new Set();
  busData.forEach((b) => {
    b.route.forEach((station) => {
      const stationName =
        typeof station === "string"
          ? station
          : currentLanguage === "en"
            ? station.nameEn
            : station.nameBn;
      locations.add(stationName);
    });
  });

  const sortedLocations = [...locations].sort((a, b) =>
    a.localeCompare(b, currentLanguage === "en" ? "en" : "bn"),
  );

  sortedLocations.forEach((l) => {
    const opt1 = document.createElement("option");
    opt1.value = l;
    opt1.textContent = l;
    fromSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = l;
    opt2.textContent = l;
    toSelect.appendChild(opt2);
  });
}

function updatePageLanguage() {
  const t = translations[currentLanguage];

  document.getElementById("headerTitle").textContent = t.headerTitle;
  document.getElementById("headerSubtitle").textContent = t.headerSubtitle;
  document.getElementById("searchLabel").textContent = t.searchLabel;
  document.getElementById("footerText").textContent = t.footerText;

  searchInput.placeholder = t.searchPlaceholder;

  const fromOption = fromSelect.querySelector("option");
  fromOption.textContent = t.fromPlaceholder;

  const toOption = toSelect.querySelector("option");
  toOption.textContent = t.toPlaceholder;

  populateDropdowns();
  filterBuses();
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
});

languageToggle.addEventListener("click", updateLanguage);

function swapFromTo() {
  // Get the wrapper elements
  const fromWrapper = document.querySelector(".select-from-wrapper");
  const toWrapper = document.querySelector(".select-to-wrapper");
  const swapButton = document.getElementById("swapBtn");
  const selectGroup = fromWrapper?.parentNode;
  
  if (fromWrapper && toWrapper && swapButton && selectGroup) {
    // Store the current values
    const fromValue = fromSelect.value;
    const toValue = toSelect.value;
    
    // Reorder DOM: swap the positions of the wrappers
    // Result: [toWrapper, button, fromWrapper]
    selectGroup.insertBefore(toWrapper, fromWrapper);
    selectGroup.appendChild(fromWrapper);
    
    // Swap the class names to match the new layout
    fromWrapper.classList.remove("select-from-wrapper");
    fromWrapper.classList.add("select-to-wrapper");
    toWrapper.classList.remove("select-to-wrapper");
    toWrapper.classList.add("select-from-wrapper");
    
    // Swap the values in the select elements
    fromSelect.value = toValue;
    toSelect.value = fromValue;
  }
  
  filterBuses();
}

const swapBtn = document.getElementById("swapBtn");
if (swapBtn) {
  swapBtn.addEventListener("click", swapFromTo);
}

function initializeApp() {
  initTheme();
  languageToggle.textContent = currentLanguage === "bn" ? "EN" : "BN";
  populateDropdowns();
  updatePageLanguage();

  fromSelect.addEventListener("change", filterBuses);
  toSelect.addEventListener("change", filterBuses);
  searchInput.addEventListener("keyup", filterBuses);
}

function getBusType(bus) {
  return bus.type === "brtc" ? "BRTC" : translations[currentLanguage].service;
}

function highlightRoute(route, from, to) {
  return route
    .map((station, idx) => {
      // Get station name based on current language and format
      let stationName, stationDisplay;
      if (typeof station === "string") {
        stationName = station;
        stationDisplay = station;
      } else {
        stationName =
          currentLanguage === "en" ? station.nameEn : station.nameBn;
        stationDisplay =
          currentLanguage === "en" ? station.nameEn : station.nameBn;
      }

      let html = `<span class="route-station">`;
      if (stationName === from || stationName === to) {
        html += `<span class="highlight">${stationDisplay}</span>`;
      } else {
        html += stationDisplay;
      }
      html += "</span>";
      if (idx < route.length - 1) html += " → ";
      return html;
    })
    .join("");
}

function filterBuses() {
  const from = fromSelect.value;
  const to = toSelect.value;
  const query = searchInput.value.toLowerCase();

  const filtered = busData.filter((bus) => {
    // Build search text - handle both old and new route formats
    let routeText = "";
    bus.route.forEach((station) => {
      if (typeof station === "string") {
        routeText += station + " ";
      } else {
        routeText += station.nameEn + " " + station.nameBn + " ";
      }
    });

    const busText = (
      bus.nameEn +
      " " +
      bus.nameBn +
      " " +
      routeText
    ).toLowerCase();
    if (query && !busText.includes(query)) return false;

    // Check if from/to stations exist in route - using current language
    const routeStations = bus.route.map((s) => {
      if (typeof s === "string") return s;
      return currentLanguage === "en" ? s.nameEn : s.nameBn;
    });
    if (from && !routeStations.includes(from)) return false;
    if (to && !routeStations.includes(to)) return false;
    if (from && to) {
      const fromIdx = routeStations.indexOf(from);
      const toIdx = routeStations.indexOf(to);
      if (fromIdx >= toIdx) return false;
    }
    return true;
  });

  renderResults(filtered);
}

function renderResults(list) {
  const t = translations[currentLanguage];
  busResults.innerHTML = "";

  if (!list.length) {
    busResults.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><div class="empty-title">${t.busNotFound}</div><div class="empty-text">${t.searchAgain}</div></div>`;
    return;
  }

  busResults.innerHTML = `<div class="results-header"><div class="results-count"><i class="fas fa-check-circle"></i> ${t.busFound}: ${list.length} ${t.busCount}</div></div>`;

  list.forEach((bus) => {
    const busName = currentLanguage === "en" ? bus.nameEn : bus.nameBn;
    const typeClass = bus.type === "brtc" ? "brtc" : "";
    const busType = getBusType(bus);
    const route = highlightRoute(bus.route, fromSelect.value, toSelect.value);
    busResults.innerHTML += `<div class="bus-card"><div class="bus-header"><div class="bus-name-wrapper"><i class="fas fa-shuttle-van bus-icon"></i><h3 class="bus-name">${busName}</h3></div><span class="bus-type-badge ${typeClass}">${busType}</span></div><div class="bus-route"><div class="route-icon"><i class="fas fa-map-marker-alt"></i></div><div class="route-stations">${route}</div></div></div>`;
  });
  document.getElementById("time-year").textContent = new Date().getFullYear();
}

