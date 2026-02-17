(function () {
  const config = window.AppConfig || {};
  const API_BASE = config.api?.base || "https://api.example.com";

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, evt, cb, opts) => el && el.addEventListener(evt, cb, opts);
  const off = (el, evt, cb, opts) => el && el.removeEventListener(evt, cb, opts);

  const debounce = (fn, delay = config.searchDebounceDelay || 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), delay);
    };
  };

  let searchAbort;
  function abortableFetch(url, options = {}) {
    if (options.tag === "search") {
      if (searchAbort) searchAbort.abort();
      searchAbort = new AbortController();
      options.signal = searchAbort.signal;
    }
    return fetch(url, options);
  }

  function handleError(error, context = "Əməliyyat") {
    if (error.name === 'AbortError') return;
    console.error(`${context} xətası:`, error);
  }

  async function safeFetch(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      handleError(error, `API sorğusu (${url})`);
      throw error;
    }
  }

  const subcategoryColors = config.colors?.subcategory || {};
  const propertyTypeColors = config.colors?.propertyType || {};
  const LOCAL_DATA_URL = "./data.json";
  const LOCAL_DATA_MODE = true;
  let localData = [];
  let localDataLoaded = false;
  let imageIndex = null;
  let imageIndexLoaded = false;

  function parseCoordPoint(value) {
    if (!value) return null;
    if (Array.isArray(value) && value.length === 2) return value.map(Number);
    if (typeof value !== "string") return null;
    const nums = value.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 2) return null;
    const lon = Number(nums[0]);
    const lat = Number(nums[1]);
    if (Number.isNaN(lon) || Number.isNaN(lat)) return null;
    return [lon, lat];
  }

  function parseGeometryCoordinates(value) {
    if (!value) return null;
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return null;
    const nums = value.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 6) return null;
    const coords = [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      const lon = Number(nums[i]);
      const lat = Number(nums[i + 1]);
      if (Number.isNaN(lon) || Number.isNaN(lat)) continue;
      coords.push([lon, lat]);
    }
    if (coords.length < 3) return null;
    return [coords];
  }

  function normalizeDataItem(item) {
    const normalized = { ...item };
    normalized.coord_point = parseCoordPoint(item.coord_point);
    normalized.geometry_coordinates = parseGeometryCoordinates(item.geometry_coordinates);
    return normalized;
  }

  async function loadLocalData() {
    if (localDataLoaded) return localData;
    const data = await safeFetch(LOCAL_DATA_URL, { cache: "no-store" });
    localData = Array.isArray(data) ? data.map(normalizeDataItem) : [];
    localDataLoaded = true;
    window.localData = localData;
    return localData;
  }

  async function loadImageIndex() {
    if (imageIndexLoaded) return imageIndex || {};
    try {
      imageIndex = await safeFetch("./property_images/index.json", { cache: "no-store" });
    } catch (e) {
      imageIndex = {};
    }
    imageIndexLoaded = true;
    return imageIndex || {};
  }

  let esri = null;
  let map = null;
  let view = null;
  let sceneView = null;
  let activeView = null;
  let measurement = null;
  let basemapGallery = null;
  let basemapExpand = null;
  let printWidget = null;
  let selectedLayer = null;

  let $searchInput,
    $suggestList,
    $switchBtn,
    $distanceBtn,
    $areaBtn,
    $clearBtn,
    $measureIcon,
    $measurePanel,
    $measureResults,
    $mapIcon,
    $printIcon,
    $groupedList,
    $staticList;

  const handlers = [];
  const layerFilters = {
    nonResidentialLayer: { category: "Park" },
    nonResidentialBuildings: { category: "Park", subcategory: "Urban Park" },
    nonResidentialPremises: { category: "Park", subcategory: "Panoramic Park" },
    residentialLayer: { category: "Historical Place" },
    apartmentsLayer: { category: "Historical Place", subcategory: "Medieval Architecture" },
    residentialGroup: { category: "Historical Place", subcategory: "Religious Historical Site" },
    singleFamilyHouses: { category: "Historical Place", subcategory: "Heritage Urban Area" },
    landsLayer: { category: "Cultural Building" },
    landsSubLayer: { category: "Cultural Building", subcategory: "Museum" },
    performingArtsVenues: { category: "Cultural Building", subcategory: "Performing Arts Venue" },
    culturalMemorialCenters: { category: "Cultural Building", subcategory: "Cultural & Memorial Center" },
    propertyCompoundsLayer: { category: "Governmental Building" },
    propertyCompoundsSubLayer: { category: "Governmental Building", subcategory: "Executive Authority" },
    ministries: { category: "Governmental Building", subcategory: "Ministry" },
    judicialInstitutions: { category: "Governmental Building", subcategory: "Judicial Institution" }
  };

  function cacheDom() {
    $searchInput = qs("#searchInput");
    $suggestList = qs("#suggestionList");
    $switchBtn = qs("#switch-btn");
    $distanceBtn = qs("#distance");
    $areaBtn = qs("#area");
    $clearBtn = qs("#clear");
    $measureIcon = qs("#measureIcon");
    $measurePanel = qs("#measurementResults");
    $measureResults = qs("#resultsContent");
    $mapIcon = qs("#mapIcon");
    $printIcon = qs("#printIcon");
    $groupedList = qs("#groupedLayerList");
    $staticList = qs("#staticLayerList");

    $colorIcon = qs("#colorIcon");
    $colorInfoPanel = qs("#colorInfoPanel");
    $colorInfoContent = qs("#colorInfoContent");
  }

  function init() {
    if (init.initialized) return;
    init.initialized = true;

    if (!(window.Auth && window.Auth.isAuthenticated())) {
      init.initialized = false;
      return;
    }

    require(
      [
        "esri/Map",
        "esri/views/MapView",
        "esri/views/SceneView",
        "esri/layers/GraphicsLayer",
        "esri/widgets/Expand",
        "esri/widgets/Measurement",
        "esri/widgets/BasemapGallery",
        "esri/geometry/Polygon",
        "esri/Graphic",
        "esri/geometry/Point",
        "esri/widgets/Print"
      ],
      function (
        Map,
        MapView,
        SceneView,
        GraphicsLayer,
        Expand,
        Measurement,
        BasemapGallery,
        Polygon,
        Graphic,
        Point,
        Print
      ) {
        esri = {
          Map,
          MapView,
          SceneView,
          GraphicsLayer,
          Expand,
          Measurement,
          BasemapGallery,
          Polygon,
          Graphic,
          Point,
          Print
        };

        window.Esri = esri;
        window.Polygon = Polygon;
        window.Point = Point;
        window.Graphic = Graphic;

        cacheDom();
        setupMap();
        wireUI();
        preloadGroups();

        setTimeout(() => {
          selectAllLayersOnLoad();
        }, 1000);
      }
    );
  }

  function closeAllPanels(except) {
    const layerList = document.querySelector(".layer-list");
    const measurePanel = document.getElementById("measurementResults");
    const colorPanel = document.getElementById("colorInfoPanel");

    const buttonPanels = ["color", "print", "basemap", "measure"];
    const isButton = buttonPanels.includes(except);

    if (layerList && except !== "layers" && except !== "table") {
      layerList.classList.remove("show");
      layerList.style.display = "none";
    }

    if (measurePanel && except !== "measure") {
      if (isButton || except === "map-popup" || except === "layers") {
        measurePanel.style.display = "none";
      }
    }

    if (colorPanel && except !== "color") {
      if (isButton || except === "map-popup" || except === "layers") {
        colorPanel.style.display = "none";
      }
    }

    if (window.basemapExpand && except !== "basemap") {
      if (isButton || except === "map-popup" || except === "layers") {
        window.basemapExpand.expanded = false;
      }
    }

    if (window.printWidget && window.printWidget.domNode && except !== "print") {
      if (isButton || except === "map-popup" || except === "layers") {
        window.printWidget.domNode.style.display = "none";
      }
    }

    if (except !== "map-popup") {
      closeMapPopups();
    }
  }

  function closeMapPopups() {
    try {
      if (window.activeView && window.activeView.popup) {
        window.activeView.popup.visible = false;
      }
      if (window.view && window.view.popup) {
        window.view.popup.visible = false;
      }
      if (window.sceneView && window.sceneView.popup) {
        window.sceneView.popup.visible = false;
      }
    } catch (err) {}
  }

  window.closeAllPanels = closeAllPanels;

  function setupMap() {
    map = new esri.Map({ basemap: "streets-navigation-vector" });

    view = new esri.MapView({
      container: "map",
      map,
      center: [49.85, 40.37],
      zoom: 12,
      popup: {
        dockEnabled: false,
        dockOptions: {
          buttonEnabled: false
        },
        collapseEnabled: false,
        maxInlineActions: 3
      }
    });

    // Try to create SceneView for 3D support
    try {
      sceneView = new esri.SceneView({
        container: null,
        map,
        center: [49.85, 40.37],
        zoom: 6,
        popup: {
          dockEnabled: false,
          dockOptions: {
            buttonEnabled: false
          },
          collapseEnabled: false,
          maxInlineActions: 3
        }
      });
    } catch (err) {
      console.warn("SceneView creation error:", err?.message);
      sceneView = null;
    }

    activeView = view;
    window.activeView = activeView;

    measurement = new esri.Measurement({ view: activeView });
    activeView.ui.add(measurement, "bottom-left");

    basemapGallery = new esri.BasemapGallery({ view: activeView });
    basemapExpand = new esri.Expand({ view: activeView, content: basemapGallery });
    activeView.ui.add(basemapExpand, "top-right");

    window.basemapExpand = basemapExpand;

    printWidget = new esri.Print({
      view: activeView,
      printServiceUrl:
        "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
    });
    activeView.ui.add(printWidget, "top-right");
    printWidget.domNode.style.display = "none";

    window.printWidget = printWidget;

    selectedLayer = new esri.GraphicsLayer({ id: "selectedLayer" });
    map.add(selectedLayer);
    window.selectedLayer = selectedLayer;

    window.highlightSelectedProperty = function (property) {
      if (!selectedLayer) return;
      selectedLayer.removeAll();

      // Only highlight the selected property without changing colors of other objects
      if (activeView && activeView.graphics) {
        activeView.graphics.forEach((graphic) => {
          const prop = graphic.attributes;
          if (prop) {
            const specialCoInt = property.special_co ? Math.floor(parseFloat(property.special_co)) : property.special_co;
            if (prop.Special_co === specialCoInt) {
              if (graphic.geometry.type === "polygon") {
                graphic.symbol = {
                  type: "simple-fill",
                  color: [144, 238, 144, 0.6],
                  outline: {
                    color: [34, 139, 34, 1],
                    width: 5
                  }
                };
              } else if (graphic.geometry.type === "point") {
                graphic.symbol = {
                  type: "simple-marker",
                  size: 20,
                  color: [144, 238, 144, 0.9],
                  outline: {
                    color: [34, 139, 34, 1],
                    width: 4
                  }
                };
              }
            }
          }
        });
      }

      let blinkCount = 0;
      const blinkInterval = setInterval(() => {
        if (blinkCount >= 6) {
          clearInterval(blinkInterval);
          return;
        }

        if (blinkCount % 2 === 0) {
          selectedLayer.opacity = 0.3;
        } else {
          selectedLayer.opacity = 1;
        }

        blinkCount++;
      }, 200);
    };

    window.getOptimalZoomForProperty = function(property) {
      let target = null;
      let zoom = 18;

      if (property.geometry_coordinates && property.geometry_coordinates.length > 0) {
        // Handle multipolygon coordinates properly
        const coords = property.geometry_coordinates;
        let rings = [];

        // Check if this is a multipolygon (4 levels deep) or polygon (3 levels deep)
        if (coords[0] && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
          // This is a multipolygon: [[[[lon, lat], ...]], ...]
          // Use the first polygon's rings to calculate extent
          const firstPolygon = coords[0];
          if (Array.isArray(firstPolygon)) {
            rings = firstPolygon
              .filter(ring => Array.isArray(ring) && ring.length > 0)
              .map(ring => ring.filter(coord => Array.isArray(coord) && coord.length === 2 && coord[0] !== null && coord[1] !== null))
              .filter(ring => ring.length > 2);
          }
        } else if (coords[0] && Array.isArray(coords[0][0])) {
          // This is a polygon: [[[lon, lat], ...]]
          rings = coords
            .map(ring => ring.filter(coord => Array.isArray(coord) && coord.length === 2 && coord[0] !== null && coord[1] !== null))
            .filter(ring => ring.length > 2);
        } else {
          // Fallback: assume it's a single ring
          const cleanedCoords = coords.filter(coord => Array.isArray(coord) && coord.length === 2 && coord[0] !== null && coord[1] !== null);
          if (cleanedCoords.length > 2) {
            rings = [cleanedCoords];
          }
        }

        if (rings.length > 0) {
          const polygon = new esri.Polygon({
            rings: rings,
            spatialReference: { wkid: 4326 }
          });

          target = polygon.extent;

          const width = target.width;
          const height = target.height;
          const maxDimension = Math.max(width, height);

          if (maxDimension > 0.1) {
            zoom = null;
          } else if (maxDimension > 0.05) {
            zoom = 13;
          } else if (maxDimension > 0.01) {
            zoom = 15;
          } else if (maxDimension > 0.005) {
            zoom = 16;
          } else {
            zoom = 17;
          }
        }
      } else if (property.coord_point) {
        const [longitude, latitude] = property.coord_point;
        target = new esri.Point({
          longitude,
          latitude,
          spatialReference: { wkid: 4326 }
        });
        zoom = 18;
      }

      return { target, zoom };
    };

    const pointerMoveHandler = activeView.on("pointer-move", (evt) => {
      const p = activeView.toMap({ x: evt.x, y: evt.y });
      const el = qs("#coordinateText");
      if (p && el) el.textContent = `Lat: ${p.latitude.toFixed(6)}, Lon: ${p.longitude.toFixed(6)}`;
    });
    handlers.push(() => pointerMoveHandler.remove());

    // Listen for popup visibility changes on the view
    const popupVisibleHandler = activeView.on("popup-visible-change", (event) => {
      if (event.visible && window.closeAllPanels) {
        window.closeAllPanels("map-popup");
      }
    });
    handlers.push(() => popupVisibleHandler.remove());
  }
  function renderColorLegend() {
    if (!$colorInfoContent) return;

    $colorInfoContent.innerHTML = "";

    Object.entries(subcategoryColors).forEach(([name, cfg]) => {
      const row = document.createElement("div");
      row.className = "color-legend-item";

      const swatch = document.createElement("span");
      swatch.className = "color-legend-swatch";

      if (Array.isArray(cfg.color)) {
        const [r, g, b, a] = cfg.color;
        swatch.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
      } else {
        swatch.style.backgroundColor = cfg.color;
      }

      const label = document.createElement("span");
      // "null" açarını daha anlaşıqlı şəkildə göstər
      label.textContent = name === "null" ? "Boş/Təyin Edilməmiş" : name;

      row.appendChild(swatch);
      row.appendChild(label);
      $colorInfoContent.appendChild(row);
    });
  }


  function wireUI() {
    on($switchBtn, "click", switchView);
    handlers.push(() => off($switchBtn, "click", switchView));

    on($distanceBtn, "click", distanceMeasurement);
    on($areaBtn, "click", areaMeasurement);
    on($clearBtn, "click", clearMeasurements);
    handlers.push(() => off($distanceBtn, "click", distanceMeasurement));
    handlers.push(() => off($areaBtn, "click", areaMeasurement));
    handlers.push(() => off($clearBtn, "click", clearMeasurements));

    on($measureIcon, "click", (e) => {
      e.preventDefault();
      if (!$measurePanel) return;

      const isHidden = $measurePanel.style.display === "none" || !$measurePanel.style.display;

      if (isHidden) {
        if (window.closeAllPanels) window.closeAllPanels("measure");
        $measureResults.innerHTML = `<p>Active Tool: ${measurement.activeTool || "None"}</p>`;
        $measurePanel.style.display = "block";
      } else {
        $measurePanel.style.display = "none";
      }
    });
    handlers.push(() => off($measureIcon, "click", () => { }));

    on($colorIcon, "click", (e) => {
      e.preventDefault();
      if (!$colorInfoPanel) return;

      const isHidden =
        $colorInfoPanel.style.display === "none" || !$colorInfoPanel.style.display;

      if (isHidden) {
        if (window.closeAllPanels) window.closeAllPanels("color");
        renderColorLegend();
        $colorInfoPanel.style.display = "block";
      } else {
        $colorInfoPanel.style.display = "none";
      }
    });
    handlers.push(() => off($colorIcon, "click", () => { }));

    on($mapIcon, "click", (e) => {
      e.preventDefault();
      if (!basemapExpand) return;

      const willOpen = !basemapExpand.expanded;
      if (willOpen && window.closeAllPanels) window.closeAllPanels("basemap");
      basemapExpand.expanded = willOpen;
    });
    handlers.push(() => off($mapIcon, "click", () => { }));

    on($printIcon, "click", (e) => {
      e.preventDefault();
      if (!printWidget || !printWidget.domNode) return;

      const n = printWidget.domNode;
      const willShow = n.style.display === "none" || !n.style.display;
      if (willShow && window.closeAllPanels) window.closeAllPanels("print");
      n.style.display = willShow ? "block" : "none";
    });
    handlers.push(() => off($printIcon, "click", () => { }));

    // NOTE: Checkbox change listeners removed to prevent duplicate API calls
    // The toggleCheckbox() function in controls.js already calls updateMapProperties()
    // Adding change event listeners here would cause the API to be called twice

    window.toggleLayerGroup = function (event) {
      event.preventDefault();
      if (!$groupedList || !$staticList) return;

      qsa(".layer-list input[type='checkbox']").forEach((cb) => (cb.checked = false));
      activeView.graphics.removeAll();
      if (window.updateCustomTable) window.updateCustomTable([]);
      window.allTableData = [];

      const groupedVisible = $groupedList.style.display === "block";
      $groupedList.style.display = groupedVisible ? "none" : "block";
      $staticList.style.display = groupedVisible ? "block" : "none";
    };

    window.toggleNested = function (containerId, arrowEl, event) {
      event.stopPropagation();
      const c = qs(`#${containerId}`);
      if (!c) return;
      const shown = c.style.display === "block";
      c.style.display = shown ? "none" : "block";
      if (arrowEl) arrowEl.textContent = shown ? "▶" : "▼";
    };

    if ($searchInput && $suggestList) {
      const doSearch = debounce((text) => {
        if (!text) {
          $suggestList.style.display = "none";
          return;
        }
        loadLocalData()
          .then((data) => {
            const q = text.toLowerCase();
            const list = data.filter((item) => {
              const title = (item.title || item.title_by_document || item.project || "").toString().toLowerCase();
              const address = (item.address || "").toString().toLowerCase();
              const category = (item.category || "").toString().toLowerCase();
              const subcategory = (item.subcategory || "").toString().toLowerCase();
              return (
                title.includes(q) ||
                address.includes(q) ||
                category.includes(q) ||
                subcategory.includes(q)
              );
            });
            renderSuggestions(list.slice(0, 20));
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              handleError(err, 'Axtarış');
            }
          });
      }, 250);

      const onSearchInput = (e) => doSearch(e.target.value.trim());
      on($searchInput, "input", onSearchInput);
      handlers.push(() => off($searchInput, "input", onSearchInput));
    }

    const outsideClick = (e) => {
      if (!$suggestList || !$searchInput) return;
      if (!$searchInput.contains(e.target) && !$suggestList.contains(e.target)) {
        $suggestList.style.display = "none";
      }
    };
    on(document, "click", outsideClick);
    handlers.push(() => off(document, "click", outsideClick));

    const staticCheckboxes = qsa(".layer-list input[type='checkbox']");
    staticCheckboxes.forEach((cb) => {
      cb.checked = true;
    });

    loadLocalData().then(() => updateMapProperties());
  }

  function renderSuggestions(items) {
    const list = $suggestList;
    const input = $searchInput;
    if (!list || !input) return;

    list.innerHTML = "";
    if (!Array.isArray(items) || items.length === 0) {
      list.style.display = "none";
      return;
    }

    Object.assign(list.style, {
      display: "block",
      maxHeight: "300px",
      overflowY: "auto",
      border: "1px solid #ccc",
      background: "white",
      position: "absolute",
      zIndex: "1000",
      width: input.offsetWidth + "px",
      listStyle: "none",
      padding: "5px",
      margin: "0"
    });

    items.forEach((property) => {
      const li = document.createElement("li");

      // Handle null values: use title_by_document as fallback
      const specialCo = property.special_co ?? "";
      const title = property.title || property.title_by_document || property.project || "Untitled";
      const address = property.address || "";

      li.textContent = `${specialCo} - ${title}${address ? ` (${address})` : ""}`;
      Object.assign(li.style, {
        padding: "8px",
        cursor: "pointer",
        borderBottom: "1px solid #ddd",
        transition: "background 0.2s"
      });
      on(li, "mouseenter", () => (li.style.background = "#f0f0f0"));
      on(li, "mouseleave", () => (li.style.background = "white"));
      on(li, "click", () => {
        if (typeof window.highlightSelectedProperty === "function") {
          window.highlightSelectedProperty(property);
        }

        if (typeof window.getOptimalZoomForProperty === "function") {
          const { target, zoom } = window.getOptimalZoomForProperty(property);

          if (target) {
            const goToOptions = zoom ? { target, zoom } : { target };
            activeView.goTo(goToOptions).catch(() => { });
          }
        }

        list.style.display = "none";
        input.value = "";
      });
      list.appendChild(li);
    });
  }

  function selectAllLayersOnLoad() {
    const allCheckboxes = qsa('.layer-list input[type="checkbox"]');
    allCheckboxes.forEach(cb => {
      if (!cb.checked) {
        cb.checked = true;
      }
    });

    loadLocalData().then(() => updateMapProperties());
  }

  function preloadGroups() {
    if (LOCAL_DATA_MODE) {
      buildGroupedLayerList([]);
      return;
    }
  }

  // window-a əlavə et ki, handleFilterChange-dən çağırıla bilsin
  window.preloadGroups = preloadGroups;

  function buildGroupedLayerList(groupedData) {
    const container = qs("#groupedLayerList");
    if (!container) {
      console.error('groupedLayerList container tapılmadı');
      return;
    }

    container.innerHTML = "";

    groupedData.forEach((group, idx) => {
      const ownerId = `owner-${group.owner.replace(/\s+/g, "_")}`;
      const ownerDiv = document.createElement("div");
      ownerDiv.className = "layer-item";

      const ownerToggle = document.createElement("span");
      ownerToggle.className = "toggle-btn";
      ownerToggle.textContent = "▶";
      ownerToggle.onclick = (e) => window.toggleNested(`cat-${ownerId}`, ownerToggle, e);

      const ownerCheckbox = document.createElement("input");
      ownerCheckbox.type = "checkbox";
      ownerCheckbox.id = ownerId;
      ownerCheckbox.dataset.owner = group.owner;

      const ownerLabel = document.createElement("label");
      ownerLabel.htmlFor = ownerId;
      ownerLabel.textContent = group.owner;

      const categoryContainer = document.createElement("div");
      categoryContainer.className = "nested";
      categoryContainer.id = `cat-${ownerId}`;

      // Categories array-i mövcud olub olmadığını yoxla
      const categories = group.categories || [];

      categories.forEach((cat) => {
        const catId = `cat-${ownerId}-${cat.category.replace(/\s+/g, "_")}`;
        const catDiv = document.createElement("div");
        catDiv.className = "layer-item";

        const catToggle = document.createElement("span");
        catToggle.className = "toggle-btn";
        catToggle.textContent = "▶";
        catToggle.onclick = (e) => window.toggleNested(`sub-${catId}`, catToggle, e);

        const catCheckbox = document.createElement("input");
        catCheckbox.type = "checkbox";
        catCheckbox.id = catId;
        catCheckbox.dataset.owner = group.owner;
        catCheckbox.dataset.category = cat.category;

        const catLabel = document.createElement("label");
        catLabel.htmlFor = catId;
        catLabel.textContent = cat.category;

        const subContainer = document.createElement("div");
        subContainer.className = "nested";
        subContainer.id = `sub-${catId}`;

        // Subcategories array-i mövcud olub olmadığını yoxla
        const subcategories = cat.subcategories || [];

        subcategories.forEach((sub) => {
          const subId = `${catId}-${sub.replace(/\s+/g, "_")}`;
          const subDiv = document.createElement("div");
          subDiv.className = "layer-item";

          const subCheckbox = document.createElement("input");
          subCheckbox.type = "checkbox";
          subCheckbox.id = subId;
          subCheckbox.dataset.owner = group.owner;
          subCheckbox.dataset.category = cat.category;
          subCheckbox.dataset.subcategory = sub;

          const subLabel = document.createElement("label");
          subLabel.htmlFor = subId;
          subLabel.textContent = sub;

          const onSubChange = () => {
            updateMapFromGroupedLayers();

            const allSub = subContainer.querySelectorAll("input[type='checkbox']");
            const allChecked = Array.from(allSub).every((cb) => cb.checked);
            const someChecked = Array.from(allSub).some((cb) => cb.checked);
            catCheckbox.checked = allChecked;
            catCheckbox.indeterminate = !allChecked && someChecked;

            const allCatCbs = categoryContainer.querySelectorAll(
              "> .layer-item input[type='checkbox']"
            );
            const allCatChecked = Array.from(allCatCbs).every((cb) => cb.checked);
            const someCatChecked = Array.from(allCatCbs).some((cb) => cb.checked);
            ownerCheckbox.checked = allCatChecked;
            ownerCheckbox.indeterminate = !allCatChecked && someCatChecked;
          };

          on(subCheckbox, "change", onSubChange);
          handlers.push(() => off(subCheckbox, "change", onSubChange));

          subDiv.appendChild(subCheckbox);
          subDiv.appendChild(subLabel);
          subContainer.appendChild(subDiv);
        });

        const onCatChange = () => {
          subContainer
            .querySelectorAll("input[type='checkbox']")
            .forEach((cb) => (cb.checked = catCheckbox.checked));
          catCheckbox.indeterminate = false;
          updateMapFromGroupedLayers();

          const allCatCbs = categoryContainer.querySelectorAll(
            "> .layer-item input[type='checkbox']"
          );
          const allCatChecked = Array.from(allCatCbs).every((cb) => cb.checked);
          const someCatChecked = Array.from(allCatCbs).some((cb) => cb.checked);
          ownerCheckbox.checked = allCatChecked;
          ownerCheckbox.indeterminate = !allCatChecked && someCatChecked;
        };
        on(catCheckbox, "change", onCatChange);
        handlers.push(() => off(catCheckbox, "change", onCatChange));

        catDiv.appendChild(catToggle);
        catDiv.appendChild(catCheckbox);
        catDiv.appendChild(catLabel);
        catDiv.appendChild(subContainer);
        categoryContainer.appendChild(catDiv);
      });

      const onOwnerChange = () => {
        ownerCheckbox.indeterminate = false;
        // Propagate owner checkbox state to all child checkboxes
        const allChildCheckboxes = categoryContainer.querySelectorAll('input[type="checkbox"]');
        allChildCheckboxes.forEach((cb) => {
          cb.checked = ownerCheckbox.checked;
        });
        updateMapFromGroupedLayers();
      };
      on(ownerCheckbox, "change", onOwnerChange);
      handlers.push(() => off(ownerCheckbox, "change", onOwnerChange));

      ownerDiv.appendChild(ownerToggle);
      ownerDiv.appendChild(ownerCheckbox);
      ownerDiv.appendChild(ownerLabel);
      container.appendChild(ownerDiv);
      container.appendChild(categoryContainer);
    });
  }

  function updateMapFromGroupedLayers() {
    const checkedBoxes = qsa('#groupedLayerList input[type="checkbox"]:checked');

    const selectedSub = checkedBoxes
      .filter((cb) => cb.dataset.owner && cb.dataset.category && cb.dataset.subcategory)
      .map((cb) => ({
        owner: cb.dataset.owner,
        category: cb.dataset.category,
        subcategory: cb.dataset.subcategory
      }));

    const selectedCat = checkedBoxes
      .filter((cb) => cb.dataset.owner && cb.dataset.category && !cb.dataset.subcategory)
      .map((cb) => ({
        owner: cb.dataset.owner,
        category: cb.dataset.category
      }));

    const selectedOwner = checkedBoxes
      .filter((cb) => cb.dataset.owner && !cb.dataset.category && !cb.dataset.subcategory)
      .map((cb) => ({
        owner: cb.dataset.owner
      }));

    const allSelected = [...selectedSub, ...selectedCat, ...selectedOwner];
    const owners = [...new Set(allSelected.map((s) => s.owner).filter(Boolean))];
    const categories = [...new Set(allSelected.map((s) => s.category).filter(Boolean))];
    const subcategories = [...new Set(selectedSub.map((s) => s.subcategory).filter(Boolean))];


    // Heç bir şey seçilməyibsə, xəritəni təmizlə
    if (allSelected.length === 0) {
      console.log('Heç bir şey seçilməyib, xəritə təmizlənir');
      if (activeView) activeView.graphics.removeAll();
      if (window.initCustomTable) window.initCustomTable([]);
      window.allTableData = [];
      return;
    }

    const query = new URLSearchParams();

    if (owners.length > 0) {
      query.set("owner", owners.join(","));
    }

    if (categories.length > 0) {
      query.set("category", categories.join(","));
    }

    if (subcategories.length > 0) {
      query.set("subcategory", subcategories.join(","));
    }

    if (window.Loader) window.Loader.show();

    loadLocalData()
      .then((data) => {
        let filteredData = data;
        if (categories.length > 0 || subcategories.length > 0) {
          filteredData = data.filter(item =>
            (subcategories.length > 0 && subcategories.includes(item.subcategory)) ||
            (categories.length > 0 && categories.includes(item.category))
          );
        }

        activeView.graphics.removeAll();
        renderProperties(filteredData);
        if (window.initCustomTable) window.initCustomTable(filteredData);
        window.allTableData = filteredData;

        if (activeView && activeView.graphics && activeView.graphics.length > 0) {
          activeView.graphics.refresh();
        }
      })
      .catch((err) => {
        handleError(err, 'Qruplandırılmış layer məlumatlarının yüklənməsi');
      })
      .finally(() => {
        if (window.Loader) window.Loader.hide();
      });
  }

  // window-a əlavə et ki, checkbox change handlers-dən çağırıla bilsin
  window.updateMapFromGroupedLayers = updateMapFromGroupedLayers;

  function updateMapProperties() {
    const checkedIds = qsa(".layer-list input[type='checkbox']:checked").map((cb) => cb.id);
    const selectedFilters = checkedIds.map((id) => layerFilters[id]).filter(Boolean);

    if (selectedFilters.length === 0) {
      // If only the top-level checkbox is selected, show everything
      if (checkedIds.includes("investmentProperty")) {
        loadLocalData().then((data) => {
          renderProperties(data);
          if (window.initCustomTable) window.initCustomTable(data);
          window.allTableData = data;
        });
        return;
      }

      activeView.graphics.removeAll();
      if (window.updateCustomTable) window.updateCustomTable([]);
      window.allTableData = [];
      return;
    }

    const selectedCategories = new Set(
      selectedFilters.filter((f) => f.category && !f.subcategory).map((f) => f.category)
    );
    const selectedSubcategories = new Set(
      selectedFilters.filter((f) => f.subcategory).map((f) => f.subcategory)
    );

    if (window.Loader) window.Loader.show();

    loadLocalData()
      .then((data) => {
        let filteredData = data;
        if (selectedCategories.size > 0 || selectedSubcategories.size > 0) {
          filteredData = data.filter((item) =>
            (selectedSubcategories.size > 0 && selectedSubcategories.has(item.subcategory)) ||
            (selectedCategories.size > 0 && selectedCategories.has(item.category))
          );
        }

        renderProperties(filteredData);
        if (window.initCustomTable) window.initCustomTable(filteredData);
        window.allTableData = filteredData;

        if (activeView && activeView.graphics && activeView.graphics.length > 0) {
          activeView.graphics.refresh();
        }
      })
      .catch((err) => handleError(err, 'Filtrlənmiş məlumatların yüklənməsi'))
      .finally(() => {
        if (window.Loader) window.Loader.hide();
      });
  }

  /**
   * Property üçün rəng və stil qaytarır
   * @param {Object} property - Property obyekti
   * @returns {Object} Rəng və outline məlumatları
   */
  window.getStyleFor = function getStyleFor(property) {
    // Subcategory əsasında rəng
    const subcategory = property.subcategory ? property.subcategory.trim() : null;
    if (subcategory && subcategoryColors[subcategory]) {
      const sc = subcategoryColors[subcategory];
      return { color: sc.color, outline: { color: sc.outline, width: 1.5 } };
    }

    // Null/boş subcategory üçün rəng
    if (!subcategory && subcategoryColors["null"]) {
      const sc = subcategoryColors["null"];
      return { color: sc.color, outline: { color: sc.outline, width: 1.5 } };
    }

    // Property type əsasında rəng
    const propertyType = property.property_type ? property.property_type.trim() : null;
    if (propertyType && propertyTypeColors[propertyType]) {
      const pt = propertyTypeColors[propertyType];
      return { color: pt.color, outline: { color: pt.outline, width: 1.5 } };
    }

    // Null/boş property_type üçün rəng
    if (!propertyType && propertyTypeColors["null"]) {
      const pt = propertyTypeColors["null"];
      return { color: pt.color, outline: { color: pt.outline, width: 1.5 } };
    }

    // Default rəng
    return { color: [255, 165, 0, 0.6], outline: { color: "black", width: 1 } };
  };

  /**
   * Property-ləri xəritədə göstərir
   * @param {Array} properties - Property massivi
   */
  function renderProperties(properties) {
    if (!activeView) {
      console.error('activeView mövcud deyil!');
      return;
    }

    activeView.graphics.removeAll();

    properties.forEach((p) => {
      let geometry, symbol;

      const style = window.getStyleFor(p);

      // special_co dəyərini integer'a çevir (641.0 → 641)
      const specialCoInt = p.special_co ? Math.floor(parseFloat(p.special_co)) : p.special_co;

      const attributes = {
        Name: p.title || p.title_by_document || p.project,
        Country: p.country,
        Project: p.project || p.title,
        Owner: p.owner,
        Address: p.address,
        Value: p.book_value,
        Subcategory: p.subcategory,
        Use_type: p.property_use_type,
        Special_co: specialCoInt,
        Special_coRaw: p.special_co != null ? String(p.special_co).trim() : "",
        Total_area: p.total_area,
        Land_area_: p.land_area,
        BuildingId: p.id || specialCoInt, // Resim API'si üçün building ID
        // Additional fields for Tab 2
        title_by_document: p.title_by_document,
        property_type: p.property_type,
        category: p.category,
        region: p.region,
        city: p.city,
        street: p.street,
        valuation_category: p.valuation_category,
        lease_status: p.lease_status,
        nolease_reason: p.nolease_reason,
        ownership_part: p.ownership_part,
        status_x: p.status_x,
        rent_opera: p.rent_opera,
        legal_property_ownership_type: p.legal_property_ownership_type,
        legal_land_ownership_type: p.legal_land_ownership_type,
        property_ownership_type: p.property_ownership_type,
        land_ownership_type: p.land_ownership_type,
        lease_area: p.lease_area,
        property_registry_no: p.property_registry_no,
        registration_no: p.registration_no,
        serial_no: p.serial_no,
        technical_pasport_registry_no: p.technical_pasport_registry_no,
        registration_date: p.registration_date,
        property_use_classification: p.property_use_classification,
        land_lease_start_date: p.land_lease_start_date,
        land_lease_end_date: p.land_lease_end_date,
        lease_duration: p.lease_duration,
        monthly_rent: p.monthly_rent,
        lessor_party: p.lessor_party,
        attachment_title_deed: p.attachment_title_deed,
        attachment_technical_pasport: p.attachment_technical_pasport,
        attachemnt_other: p.attachemnt_other,
        coordinate_technical_pasport: p.coordinate_technical_pasport,
        prior_year_valuation_results_2023: p.prior_year_valuation_results_2023,
        current_year_valuation_results_2024: p.current_year_valuation_results_2024,
        variance: p.variance,
        valuation_method: p.valuation_method,
        note: p.note,
        land_area_m2: p.land_area_m2,
        tenant_business_activity: p.tenant_business_activity,
        portfolio_entry_date: p.portfolio_entry_date,
        strategic_recommendation: p.strategic_recommendation,
        recommended_designation: p.recommended_designation,
        priority_period: p.priority_period,
        phase: p.phase,
        status: p.status,
        year: p.year,
        quarter: p.quarter,
        additional_notes: p.additional_notes,
        type: p.type
      };

      // Popup template - 2 tab ilə
      const popupTemplate = {
        title: "{Name}",
        content: [
          {
            type: "custom",
            outFields: ["*"],
            creator: function(event) {
              const attrs = event.graphic.attributes;
              const container = document.createElement("div");
              container.style.cssText = "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0;";

              // Tab container - sticky (scroll olanda qalır)
              const tabsContainer = document.createElement("div");
              tabsContainer.className = "popup-tabs-container";
              tabsContainer.style.cssText = "position: sticky; top: 0; z-index: 100; background: #f5f5f5;";

              // Tab 1 button
              const tab1Btn = document.createElement("button");
              tab1Btn.type = "button";
              tab1Btn.className = "popup-tab-btn active";
              tab1Btn.textContent = "Esas Məlumatlar";
              tab1Btn.setAttribute("data-tab", "1");
              tab1Btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                switchPopupTab(1, e);
              });

              // Tab 2 button
              const tab2Btn = document.createElement("button");
              tab2Btn.type = "button";
              tab2Btn.className = "popup-tab-btn";
              tab2Btn.textContent = "Əlavə Məlumatlar";
              tab2Btn.setAttribute("data-tab", "2");
              tab2Btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                switchPopupTab(2, e);
              });

              tabsContainer.appendChild(tab1Btn);
              tabsContainer.appendChild(tab2Btn);

              // Tabları container-in əvvəlinə əlavə et (header-content altında)
              container.appendChild(tabsContainer);

              // Tab 1 content - Esas Məlumatlar (əvvəlki dizayn ilə)
              const tab1Content = document.createElement("div");
              tab1Content.className = "popup-tab-content active";
              tab1Content.id = "popupTab1";

              // Helper function to check if value exists and is not empty
              const hasValue = (val) => val !== null && val !== undefined && val !== "" && val !== "null";

              // Helper function to create a field box (əvvəlki rəngli box-lar)
              const createFieldBox = (label, value, gradientClass) => {
                if (!hasValue(value)) return null;
                const div = document.createElement("div");
                div.className = `popup-field-box ${gradientClass}`;
                div.innerHTML = `
                  <div class="popup-field-box-label">${label}</div>
                  <div class="popup-field-box-value">${value}</div>
                `;
                return div;
              };

              // Helper function to create a full-width field
              const createFullWidthField = (label, value, bgColor, textColor, borderColor) => {
                if (!hasValue(value)) return null;
                const div = document.createElement("div");
                div.className = "popup-full-width-field";
                div.style.background = bgColor;
                div.style.borderLeftColor = borderColor;
                div.innerHTML = `
                  <div class="popup-full-width-field-label" style="color: ${textColor};">${label}</div>
                  <div class="popup-full-width-field-value" style="color: ${textColor};">${value}</div>
                `;
                return div;
              };

              // Row 1: Owner and Code
              const row1 = document.createElement("div");
              row1.className = "popup-row";
              const ownerBox = createFieldBox("Name", attrs.Name, "gradient-purple");
              const codeBox = createFieldBox("Code", attrs.Special_co, "gradient-pink");
              if (ownerBox) row1.appendChild(ownerBox);
              if (codeBox) row1.appendChild(codeBox);
              if (row1.children.length > 0) tab1Content.appendChild(row1);

              // Row 2: Value and Category
              const row2 = document.createElement("div");
              row2.className = "popup-row";
              const valueBox = createFieldBox("Value", attrs.Value, "gradient-cyan");
              const categoryBox = createFieldBox("Category", attrs.Subcategory, "gradient-green");
              if (valueBox) row2.appendChild(valueBox);
              if (categoryBox) row2.appendChild(categoryBox);
              if (row2.children.length > 0) tab1Content.appendChild(row2);

              // Row 2.5: Project and Title by Document
              const row2_5 = document.createElement("div");
              row2_5.className = "popup-row";
              const projectBox = createFieldBox("Project", attrs.Project, "gradient-coral");
              const titleBox = createFieldBox("Title by Document", attrs.title_by_document, "gradient-peach");
              if (projectBox) row2_5.appendChild(projectBox);
              if (titleBox) row2_5.appendChild(titleBox);
              if (row2_5.children.length > 0) tab1Content.appendChild(row2_5);

              // Address
              const addressField = createFullWidthField("Address", attrs.Address, "#f8f9fa", "#333", "#0045ad");
              if (addressField) tab1Content.appendChild(addressField);

              // Use Type
              const useTypeField = createFullWidthField("Use Type", attrs.Use_type, "#fff3cd", "#856404", "#ffc107");
              if (useTypeField) tab1Content.appendChild(useTypeField);

              // Row 3: Total Area and Land Area
              const row3 = document.createElement("div");
              row3.className = "popup-row";
              const totalAreaBox = createFieldBox("Total Area", hasValue(attrs.Total_area) ? `${attrs.Total_area} m²` : null, "gradient-coral");
              const landAreaBox = createFieldBox("Land Area", hasValue(attrs.Land_area_) ? `${attrs.Land_area_} ha` : null, "gradient-teal");
              if (totalAreaBox) row3.appendChild(totalAreaBox);
              if (landAreaBox) row3.appendChild(landAreaBox);
              if (row3.children.length > 0) tab1Content.appendChild(row3);

              // Şəkillər - Tab 1-ə əlavə et
              const buildingId = attrs.BuildingId;
              const imageKey = (attrs.Special_coRaw || "").trim() || String(attrs.Special_co || "").trim();

              const renderImageGrid = (images, basePath) => {
                if (!images || images.length === 0) {
                  return "<p style='color: #999; font-size: 12px; text-align: center; padding: 15px; margin: 0;'>📷 Şəkil yoxdur</p>";
                }
                const grid = document.createElement("div");
                grid.style.cssText = "display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;";

                images.forEach((img, imgIndex) => {
                  const imgWrapper = document.createElement("div");
                  imgWrapper.style.cssText = "position: relative; overflow: hidden; border-radius: 6px; background: #f0f0f0;";

                  const imgEl = document.createElement("img");
                  imgEl.src = `${basePath}/${img}`;
                  imgEl.alt = img;
                  imgEl.style.cssText = "width: 100%; height: 120px; object-fit: cover; cursor: pointer; transition: transform 0.2s;";
                  imgEl.title = img;

                  imgEl.onmouseover = () => imgEl.style.transform = "scale(1.05)";
                  imgEl.onmouseout = () => imgEl.style.transform = "scale(1)";

                  imgEl.onclick = (e) => {
                    e.stopPropagation();
                    let currentIndex = imgIndex;

                    const modal = document.createElement("div");
                    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10000;";

                    const container = document.createElement("div");
                    container.style.cssText = "position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;";

                    const modalImg = document.createElement("img");
                    modalImg.style.cssText = "max-width: 85%; max-height: 85%; border-radius: 8px; object-fit: contain;";

                    const infoDiv = document.createElement("div");
                    infoDiv.style.cssText = "position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 10px 20px; border-radius: 6px; font-size: 14px; white-space: nowrap;";

                    const updateImage = (index) => {
                      if (index >= 0 && index < images.length) {
                        currentIndex = index;
                        modalImg.src = `${basePath}/${images[index]}`;
                        infoDiv.textContent = `${currentIndex + 1} / ${images.length}`;
                      }
                    };

                    const prevBtn = document.createElement("button");
                    prevBtn.textContent = "❮";
                    prevBtn.style.cssText = "position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.3); border: none; color: white; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 24px; transition: background 0.2s; z-index: 10001;";
                    prevBtn.onmouseover = () => prevBtn.style.background = "rgba(255,255,255,0.5)";
                    prevBtn.onmouseout = () => prevBtn.style.background = "rgba(255,255,255,0.3)";
                    prevBtn.onclick = () => updateImage(currentIndex - 1);

                    const nextBtn = document.createElement("button");
                    nextBtn.textContent = "❯";
                    nextBtn.style.cssText = "position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.3); border: none; color: white; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 24px; transition: background 0.2s; z-index: 10001;";
                    nextBtn.onmouseover = () => nextBtn.style.background = "rgba(255,255,255,0.5)";
                    nextBtn.onmouseout = () => nextBtn.style.background = "rgba(255,255,255,0.3)";
                    nextBtn.onclick = () => updateImage(currentIndex + 1);

                    const closeBtn = document.createElement("button");
                    closeBtn.textContent = "✕";
                    closeBtn.style.cssText = "position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.3); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 24px; font-weight: bold; transition: background 0.2s; z-index: 10001;";
                    closeBtn.onmouseover = () => closeBtn.style.background = "rgba(255,255,255,0.5)";
                    closeBtn.onmouseout = () => closeBtn.style.background = "rgba(255,255,255,0.3)";
                    closeBtn.onclick = () => modal.remove();

                    const handleKeyPress = (e) => {
                      if (e.key === "ArrowLeft") updateImage(currentIndex - 1);
                      if (e.key === "ArrowRight") updateImage(currentIndex + 1);
                      if (e.key === "Escape") modal.remove();
                    };
                    document.addEventListener("keydown", handleKeyPress);

                    const originalRemove = modal.remove.bind(modal);
                    modal.remove = function() {
                      document.removeEventListener("keydown", handleKeyPress);
                      originalRemove();
                    };

                    container.appendChild(prevBtn);
                    container.appendChild(modalImg);
                    container.appendChild(nextBtn);
                    container.appendChild(infoDiv);
                    container.appendChild(closeBtn);
                    modal.appendChild(container);
                    modal.onclick = (e) => e.target === modal && modal.remove();
                    document.body.appendChild(modal);

                    updateImage(currentIndex);
                  };

                  imgWrapper.appendChild(imgEl);
                  grid.appendChild(imgWrapper);
                });

                return grid;
              };

              const imagesDiv = document.createElement("div");
              imagesDiv.innerHTML = "<p style='color: #666; font-size: 12px; text-align: center; padding: 10px;'>⏳ Şəkillər yüklənir...</p>";
              tab1Content.appendChild(imagesDiv);

              if (LOCAL_DATA_MODE) {
                loadImageIndex()
                  .then((idx) => {
                    imagesDiv.innerHTML = "";
                    const files = (idx && imageKey && idx[imageKey]) ? idx[imageKey] : [];
                    const gridOrMsg = renderImageGrid(files, `./property_images/${imageKey}`);
                    if (typeof gridOrMsg === "string") {
                      imagesDiv.innerHTML = gridOrMsg;
                    } else {
                      imagesDiv.appendChild(gridOrMsg);
                    }
                  })
                  .catch(() => {
                    imagesDiv.innerHTML = "<p style='color: #999; font-size: 12px; text-align: center; padding: 15px; margin: 0;'>📷 Şəkil yoxdur</p>";
                  });
              } else if (buildingId) {
                fetch(`${API_BASE}/images/${buildingId}`)
                  .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                  })
                  .then(data => {
                    imagesDiv.innerHTML = "";
                    const files = (data && data.images) ? data.images.map(i => i.filename || i.url) : [];
                    const gridOrMsg = renderImageGrid(files, API_BASE);
                    if (typeof gridOrMsg === "string") {
                      imagesDiv.innerHTML = gridOrMsg;
                    } else {
                      imagesDiv.appendChild(gridOrMsg);
                    }
                  })
                  .catch(() => {
                    imagesDiv.innerHTML = "<p style='color: #999; font-size: 12px; text-align: center; padding: 15px; margin: 0;'>📷 Şəkil yoxdur</p>";
                  });
              } else {
                imagesDiv.innerHTML = "<p style='color: #999; font-size: 12px; text-align: center; padding: 15px; margin: 0;'>📷 Şəkil yoxdur</p>";
              }

              container.appendChild(tab1Content);

              // Tab 2 content - Əlavə Məlumatlar
              const tab2Content = document.createElement("div");
              tab2Content.className = "popup-tab-content";
              tab2Content.id = "popupTab2";

              const additionalFieldsGrid = document.createElement("div");
              additionalFieldsGrid.className = "popup-fields-grid";

              // Əlavə column-lar (göndərdiyiniz column-lar)
              const additionalFields = [
                'title_by_document', 'property_type', 'category', 'project', 'region', 'city', 'street',
                'valuation_category', 'use_type', 'lease_status', 'nolease_reason', 'ownership_part', 'status_x',
                'rent_opera', 'legal_property_ownership_type', 'legal_land_ownership_type',
                'property_ownership_type', 'land_ownership_type', 'lease_area',
                'property_registry_no', 'registration_no', 'serial_no', 'technical_pasport_registry_no',
                'registration_date', 'property_use_classification', 'land_lease_start_date', 'land_lease_end_date',
                'lease_duration', 'monthly_rent', 'lessor_party',
                'attachment_title_deed', 'attachment_technical_pasport', 'attachemnt_other',
                'coordinate_technical_pasport', 'prior_year_valuation_results_2023', 'current_year_valuation_results_2024',
                'variance', 'valuation_method', 'note', 'land_area_m2', 'tenant_business_activity',
                'portfolio_entry_date', 'strategic_recommendation', 'recommended_designation', 'priority_period', 'phase',
                'status', 'year', 'quarter', 'additional_notes', 'type'
              ];

              let hasAdditionalFields = false;
              additionalFields.forEach(fieldKey => {
                const value = attrs[fieldKey];

                // Boş, null, undefined, və "NaN" dəyərləri keç
                if (value === null || value === undefined || value === '' || String(value).toLowerCase() === 'nan') {
                  return;
                }

                hasAdditionalFields = true;
                const fieldDiv = document.createElement("div");
                fieldDiv.className = "popup-field";

                const labelEl = document.createElement("div");
                labelEl.className = "popup-field-label";
                labelEl.textContent = fieldKey.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                const valueEl = document.createElement("div");
                valueEl.className = "popup-field-value";

                // true/false dəyərləri ikonlarla əvəz et
                let displayValue = value;
                if (typeof value === 'boolean' || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'false') {
                  const isTrue = value === true || String(value).toLowerCase() === 'true';
                  displayValue = isTrue ? '✓ Bəli' : '✗';
                  valueEl.style.color = isTrue ? '#28a745' : '#dc3545';
                  valueEl.style.fontWeight = '600';
                } else {
                  displayValue = String(value);
                }

                valueEl.textContent = displayValue;

                fieldDiv.appendChild(labelEl);
                fieldDiv.appendChild(valueEl);
                additionalFieldsGrid.appendChild(fieldDiv);
              });

              if (!hasAdditionalFields) {
                const noDataMsg = document.createElement("div");
                noDataMsg.style.cssText = "text-align: center; padding: 20px; color: #999; font-size: 13px;";
                noDataMsg.textContent = "Əlavə məlumat yoxdur";
                tab2Content.appendChild(noDataMsg);
              } else {
                tab2Content.appendChild(additionalFieldsGrid);
              }

              container.appendChild(tab2Content);

              return container;
            }
          }
        ]
      };

      if (p.geometry_coordinates && p.geometry_coordinates.length > 0) {
        // Handle multipolygon coordinates properly
        // geometry_coordinates can be:
        // - [[[lon, lat], ...]] for a single polygon
        // - [[[[lon, lat], ...]], [[[lon, lat], ...]]] for a multipolygon
        const coords = p.geometry_coordinates;

        // Check if this is a multipolygon (4 levels deep) or polygon (3 levels deep)
        if (coords[0] && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
          // This is a multipolygon: [[[[lon, lat], ...]], ...]
          // Create a separate graphic for each polygon in the multipolygon
          coords.forEach(polygon => {
            if (Array.isArray(polygon) && polygon.length > 0) {
              // Filter out null values and invalid rings
              const rings = polygon
                .filter(ring => Array.isArray(ring) && ring.length > 0)
                .map(ring => ring.filter(coord => Array.isArray(coord) && coord.length === 2 && coord[0] !== null && coord[1] !== null))
                .filter(ring => ring.length > 2); // Ring must have at least 3 points

              if (rings.length > 0) {
                // Ensure each ring is closed
                rings.forEach(ring => {
                  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
                    ring.push(ring[0]);
                  }
                });

                const polygonGeometry = new esri.Polygon({
                  rings: rings,
                  spatialReference: { wkid: 4326 }
                });
                const g = new esri.Graphic({
                  geometry: polygonGeometry,
                  attributes,
                  symbol: { type: "simple-fill", color: style.color, outline: style.outline },
                  popupTemplate
                });
                activeView.graphics.add(g);
              }
            }
          });
        } else if (coords[0] && Array.isArray(coords[0][0])) {
          // This is a polygon: [[[lon, lat], ...]]
          // Filter out null values
          const rings = coords
            .map(ring => ring.filter(coord => Array.isArray(coord) && coord.length === 2 && coord[0] !== null && coord[1] !== null))
            .filter(ring => ring.length > 2); // Ring must have at least 3 points

          if (rings.length > 0) {
            // Ensure each ring is closed
            rings.forEach(ring => {
              if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
                ring.push(ring[0]);
              }
            });

            geometry = new esri.Polygon({
              rings: rings,
              spatialReference: { wkid: 4326 }
            });
            symbol = { type: "simple-fill", color: style.color, outline: style.outline };
            if (geometry) {
              const g = new esri.Graphic({ geometry, attributes, symbol, popupTemplate });
              activeView.graphics.add(g);
            }
          }
        } else {
          // Fallback: assume it's a single ring
          const cleanedCoords = coords.filter(coord => Array.isArray(coord) && coord.length === 2 && coord[0] !== null && coord[1] !== null);
          if (cleanedCoords.length > 2) {
            const rings = [cleanedCoords];
            // Ensure ring is closed
            if (rings[0][0][0] !== rings[0][rings[0].length - 1][0] || rings[0][0][1] !== rings[0][rings[0].length - 1][1]) {
              rings[0].push(rings[0][0]);
            }

            geometry = new esri.Polygon({
              rings: rings,
              spatialReference: { wkid: 4326 }
            });
            symbol = { type: "simple-fill", color: style.color, outline: style.outline };
            if (geometry) {
              const g = new esri.Graphic({ geometry, attributes, symbol, popupTemplate });
              activeView.graphics.add(g);
            }
          }
        }
      } else if (p.coord_point) {
        const [lon, lat] = p.coord_point;
        geometry = new esri.Point({ longitude: lon, latitude: lat });
        symbol = {
          type: "simple-marker",
          color: style.color,
          size: "10px",
          outline: style.outline
        };
        if (geometry) {
          const g = new esri.Graphic({ geometry, attributes, symbol, popupTemplate });
          activeView.graphics.add(g);
        }
      }
    });
  }

  function distanceMeasurement() {
    const type = activeView.type;
    measurement.activeTool = type.toUpperCase() === "2D" ? "distance" : "direct-line";
    $distanceBtn && $distanceBtn.classList.add("active");
    $areaBtn && $areaBtn.classList.remove("active");
    if ($measurePanel && $measurePanel.style.display === "block") {
      $measureResults.innerHTML = `<p>Measuring Distance...</p>`;
    }
  }

  function areaMeasurement() {
    measurement.activeTool = "area";
    $distanceBtn && $distanceBtn.classList.remove("active");
    $areaBtn && $areaBtn.classList.add("active");
    if ($measurePanel && $measurePanel.style.display === "block") {
      $measureResults.innerHTML = `<p>Measuring Area...</p>`;
    }
  }

  function clearMeasurements() {
    $distanceBtn && $distanceBtn.classList.remove("active");
    $areaBtn && $areaBtn.classList.remove("active");
    measurement.clear();
  }

  function switchView() {
    console.log("switchView called, sceneView:", sceneView, "activeView.type:", activeView?.type);

    if (!sceneView) {
      alert("3D bu cihazda dəstəklənmir.");
      return;
    }

    try {
      const vp = activeView.viewpoint.clone();
      const viewType = activeView.type.toUpperCase();
      console.log("Current view type:", viewType);

      const lat = activeView.center.latitude;
      const factor = Math.cos((lat * Math.PI) / 180.0);
      if (viewType === "3D") vp.scale /= factor;
      else vp.scale *= factor;

      clearMeasurements();

      // Store graphics from current view before switching
      const currentGraphics = [];
      if (activeView.graphics) {
        activeView.graphics.forEach(graphic => {
          currentGraphics.push(graphic);
        });
      }

      activeView.container = null;

      // Switch to the other view: if currently 2D, switch to 3D (sceneView), else switch to 2D (view)
      activeView = viewType === "2D" ? sceneView : view;
      console.log("Switched to view type:", activeView.type);
      activeView.set({ container: "map", viewpoint: vp });
      window.activeView = activeView;

      // Add stored graphics to the new view
      currentGraphics.forEach(graphic => {
        activeView.graphics.add(graphic);
      });

      // Update basemap gallery for new view
      if (basemapGallery) {
        basemapGallery.destroy();
        basemapGallery = null;
      }
      if (basemapExpand) {
        basemapExpand.destroy();
        basemapExpand = null;
      }

      // Wait for view to be ready before creating basemap gallery
      activeView.when(() => {
        try {
          basemapGallery = new esri.BasemapGallery({ view: activeView });
          basemapExpand = new esri.Expand({ view: activeView, content: basemapGallery });
          activeView.ui.add(basemapExpand, "top-right");
          window.basemapExpand = basemapExpand;
        } catch (err) {
          console.warn("Basemap gallery creation error:", err?.message);
        }
      }).catch((err) => {
        console.warn("View ready error:", err?.message);
      });
    } catch (err) {
      console.error("Error in switchView:", err);
      alert("View switch error: " + err.message);
    }

    // Measurement widget-i sol alt küncdə yerləşdir
    activeView.ui.add(measurement, "bottom-left");
    measurement.view = activeView;

    // Map popup açılanda digər panelləri bağla (2D/3D switch sonrası)
    const popupVisibleHandler2 = activeView.on("popup-visible-change", (event) => {
      if (event.visible && window.closeAllPanels) {
        window.closeAllPanels("map-popup");
      }
    });
    handlers.push(() => popupVisibleHandler2.remove());

    if ($switchBtn) {
      $switchBtn.textContent = activeView.type.toUpperCase();
      $switchBtn.value = activeView.type.toUpperCase();
    }
  }

  window.updateMapProperties = updateMapProperties;
  window.renderProperties = renderProperties;

  function destroy() {
    handlers.forEach((fn) => {
      try {
        fn();
      } catch { }
    });
    handlers.length = 0;

    if (window.toggleLayerGroup) delete window.toggleLayerGroup;
    if (window.toggleNested) delete window.toggleNested;

    try {
      activeView && activeView.graphics && activeView.graphics.removeAll();
    } catch { }
    try {
      basemapGallery && basemapGallery.destroy();
    } catch { }
    try {
      basemapExpand && basemapExpand.destroy();
    } catch { }
    try {
      printWidget && printWidget.destroy();
    } catch { }
    try {
      view && view.destroy();
    } catch { }
    try {
      sceneView && sceneView.destroy();
    } catch { }

    esri = null;
    map = null;
    view = null;
    sceneView = null;
    activeView = null;
    measurement = null;
    basemapGallery = null;
    basemapExpand = null;
    printWidget = null;
    selectedLayer = null;

    init.initialized = false;
  }





  /**
   * Switch between popup tabs
   */
  window.switchPopupTab = function(tabNumber, evt) {
    // Clicked button
    const clickedBtn = evt.target;

    // Tab container
    const tabsContainer = clickedBtn.parentElement;
    if (!tabsContainer) return;

    // All buttons
    const buttons = tabsContainer.querySelectorAll('.popup-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');

    // Parent container (popup content)
    let container = tabsContainer.parentElement;
    if (!container) return;

    // Tab content elements
    const tab1 = container.querySelector('#popupTab1');
    const tab2 = container.querySelector('#popupTab2');

    if (tabNumber === 1) {
      if (tab1) tab1.style.display = 'block';
      if (tab2) tab2.style.display = 'none';
    } else if (tabNumber === 2) {
      if (tab1) tab1.style.display = 'none';
      if (tab2) tab2.style.display = 'block';
    }
  };



  document.addEventListener("auth:login", init);
  document.addEventListener("auth:logout", destroy);

  window.addEventListener("DOMContentLoaded", () => {
    if (window.Auth && window.Auth.isAuthenticated()) init();
  });
})();
