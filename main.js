require([
  "esri/Map",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/widgets/Expand",
  "esri/widgets/Measurement",
  "esri/widgets/BasemapGallery",
  "esri/geometry/Polygon",
  "esri/Graphic",
  "esri/geometry/Point",
  "esri/widgets/Print",
  "esri/widgets/FeatureTable"
], function(Map, MapView, SceneView, Expand, Measurement, BasemapGallery, Polygon, Graphic, Point, Print, FeatureTable) {

  let data = []; // Global variable for fetched properties
  // After creating view, add:


  // Mapping from property_t values to corresponding leaf checkbox IDs
  const propertyMapping = {
      "Qeyri-yaşayış binası": "nonResidentialBuildings",
      "Qeyri-yaşayış sahəsi": "nonResidentialPremises",
      "Mənzil": "apartmentsLayer",
      "Çoxmərtəbəli yaşayış bina": "residentialGroup",
      "Fərdi yaşayış evi": "singleFamilyHouses",
      "Bağ evi": "singleFamilyHouses",
      "Torpaq sahəsi": "landsSubLayer",
      "Əmlak kompleksi": "propertyCompoundsSubLayer",
      "Otel": "hotelsSubLayer"
  };

  const subcategoryColors = {
  "Building": { color: [128, 0, 0, 0.7], outline: "#800000" },
  "Land": { color: [102, 51, 0, 0.5], outline: "#663300" },
  "Mixed use": { color: [16, 48, 94, 0.6], outline: "#10305e" },
  "Office": { color: [66, 135, 245, 0.7], outline: "#4287f5" },
  "Parking Building": { color: [102, 0, 204, 0.7], outline: "#6600cc" },
  "Parking space": { color: [189, 189, 189, 0.7], outline: "#bdbdbd" },
  "Residential": { color: [215, 25, 28, 0.6], outline: "#d7191c" },
  "Single Family Houses": { color: [128, 0, 64, 0.7], outline: "#800040" },
  "Street Retail": { color: [41, 98, 255, 0.7], outline: "#2962ff" },
  "Unit": { color: [107, 142, 35, 0.7], outline: "#6b8e23" },
  "Warehouse": { color: [18, 165, 133, 0.7], outline: "#0f6f59" },
  "Hotel": { color: [0, 255, 255, 1], outline: "#00ffff" }, // Neon Cyan,
  "Apartments": { color: [153, 50, 204, 0.7], outline: "#9932cc" },
  "Cip": {color: [67,69,11,1], outline: "#ffffff" },
  "Pitstop": { color: [70, 130, 180, 0.7], outline: "#4682b4" },
  "Foton": { color: [255, 105, 180, 0.7], outline: "#ff69b4" },   // Hot Pink
  "Top": { color: [0, 191, 255, 0.7], outline: "#00bfff" }        // Deep Sky Blue
};

const propertyTypeColors = {
  "Əmlak kompleksi": { color: "#dc4b00cc", outline: "#dc4b00ff" },
  "Qeyri-yaşayış binası": { color: "#3c6ccc80", outline: "#3c6cccff" },
  "Çoxmərtəbəli yaşayış bina": { color: "#d9dc00cc", outline: "#d9dc00ff" },
  "Torpaq sahəsi": { color: "#8B4513cc", outline: "#8B4513ff" },
  "Fərdi yaşayış evi": { color: "#1a9641cc", outline: "#1a9641ff" },
  "Qeyri-yaşayış sahəsi": { color: "#d99f00cc", outline: "#d99f00ff" },
  "Mənzil": { color: "#4db478cc", outline: "#4db478ff" }
};


  // Create the map
  const map = new Map({
    basemap: "streets-navigation-vector"
  });

  // Create the map view
  const view = new MapView({
    container: "viewDiv", 
    map: map,
    center: [49.85, 40.37], 
    zoom: 12
  });


  const sceneView = new SceneView({
    container: null,
    map: map,
    center: [49.85, 40.37],
    zoom: 6
  });

  let activeView = view;
  const measurement = new Measurement();


  window.view = view;
  window.Polygon = Polygon;
  window.Point = Point;
  
  fetch("http://localhost:5010/grouped-layers")
  .then(res => res.json())
  .then(buildGroupedLayerList)
  .catch(err => console.error("Failed to load grouped layers", err));

  // Create Basemap Gallery widget
  let basemapGallery = new BasemapGallery({ view: activeView });
  let basemapExpand = new Expand({ view: activeView, content: basemapGallery });
  activeView.ui.add(basemapExpand, "top-right");


function buildGroupedLayerList(groupedData) {
  const container = document.getElementById("groupedLayerList");
  container.innerHTML = "";

  groupedData.forEach(group => {
    const ownerId = `owner-${group.owner.replace(/\s+/g, "_")}`;
    const ownerDiv = document.createElement("div");
    ownerDiv.className = "layer-item";

    const ownerToggle = document.createElement("span");
    ownerToggle.className = "toggle-btn";
    ownerToggle.textContent = "▶";
    ownerToggle.onclick = e => toggleNested(`cat-${ownerId}`, ownerToggle, e);

    const ownerCheckbox = document.createElement("input");
    ownerCheckbox.type = "checkbox";
    ownerCheckbox.id = ownerId;
    ownerCheckbox.dataset.owner = group.owner; // ✅ Add this line

    const ownerLabel = document.createElement("label");
    ownerLabel.htmlFor = ownerId;
    ownerLabel.textContent = group.owner;

    const categoryContainer = document.createElement("div");
    categoryContainer.className = "nested";
    categoryContainer.id = `cat-${ownerId}`;

    group.categories.forEach(cat => {
      const catId = `cat-${ownerId}-${cat.category.replace(/\s+/g, "_")}`;
      const catDiv = document.createElement("div");
      catDiv.className = "layer-item";

      const catToggle = document.createElement("span");
      catToggle.className = "toggle-btn";
      catToggle.textContent = "▶";
      catToggle.onclick = e => toggleNested(`sub-${catId}`, catToggle, e);

      const catCheckbox = document.createElement("input");
      catCheckbox.type = "checkbox";
      catCheckbox.id = catId;

      const catLabel = document.createElement("label");
      catLabel.htmlFor = catId;
      catLabel.textContent = cat.category;

      const subContainer = document.createElement("div");
      subContainer.className = "nested";
      subContainer.id = `sub-${catId}`;

      cat.subcategories.forEach(sub => {
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

        subCheckbox.addEventListener("change", () => {
          updateMapFromGroupedLayers();

          // Sync parent checkbox state for category
          const allSubCheckboxes = subContainer.querySelectorAll("input[type='checkbox']");
          const allChecked = Array.from(allSubCheckboxes).every(cb => cb.checked);
          const someChecked = Array.from(allSubCheckboxes).some(cb => cb.checked);
          catCheckbox.checked = allChecked;
          catCheckbox.indeterminate = !allChecked && someChecked;

          // Sync parent checkbox state for owner
          const allCatCheckboxes = categoryContainer.querySelectorAll("input[type='checkbox']");
          const allCatChecked = Array.from(allCatCheckboxes).every(cb => cb.checked);
          const someCatChecked = Array.from(allCatCheckboxes).some(cb => cb.checked);
          ownerCheckbox.checked = allCatChecked;
          ownerCheckbox.indeterminate = !allCatChecked && someCatChecked;
        });

        subDiv.appendChild(subCheckbox);
        subDiv.appendChild(subLabel);
        subContainer.appendChild(subDiv);
      });

      catCheckbox.addEventListener("change", () => {
        subContainer.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = catCheckbox.checked);
        catCheckbox.indeterminate = false;
        updateMapFromGroupedLayers();

        // Update owner
        const allCatCheckboxes = categoryContainer.querySelectorAll("input[type='checkbox']");
        const allCatChecked = Array.from(allCatCheckboxes).every(cb => cb.checked);
        const someCatChecked = Array.from(allCatCheckboxes).some(cb => cb.checked);
        ownerCheckbox.checked = allCatChecked;
        ownerCheckbox.indeterminate = !allCatChecked && someCatChecked;
      });

      catDiv.appendChild(catToggle);
      catDiv.appendChild(catCheckbox);
      catDiv.appendChild(catLabel);
      catDiv.appendChild(subContainer);
      categoryContainer.appendChild(catDiv);
    });

    ownerCheckbox.addEventListener("change", () => {
      categoryContainer.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.checked = ownerCheckbox.checked;
        cb.indeterminate = false;
      });
      ownerCheckbox.indeterminate = false;
      updateMapFromGroupedLayers();
    });

    ownerDiv.appendChild(ownerToggle);
    ownerDiv.appendChild(ownerCheckbox);
    ownerDiv.appendChild(ownerLabel);
    container.appendChild(ownerDiv);
    container.appendChild(categoryContainer);
  });
}


////////////////////////////////////////////////////////////////////

function updateMapFromGroupedLayers() {
  const selectedSub = Array.from(document.querySelectorAll('#groupedLayerList input[type="checkbox"]:checked'))
    .filter(cb => cb.dataset.owner && cb.dataset.category && cb.dataset.subcategory)
    .map(cb => ({
      owner: cb.dataset.owner,
      category: cb.dataset.category,
      subcategory: cb.dataset.subcategory
    }));

  if (selectedSub.length === 0) {
    window.view.graphics.removeAll();
    updateCustomTable([]);
    window.allTableData = [];
    return;
  }

  const owners = [...new Set(selectedSub.map(s => s.owner))];
  const categories = [...new Set(selectedSub.map(s => s.category))];
  const subcategories = [...new Set(selectedSub.map(s => s.subcategory))];

  const query = new URLSearchParams();
  query.set('owner', owners.join(','));
  query.set('category', categories.join(','));
  query.set('subcategory', subcategories.join(','));

  fetch(`http://localhost:5010/properties?${query.toString()}`)
    .then(res => res.json())
    .then(filtered => {
      window.view.graphics.removeAll();
      renderProperties(filtered);
      updateCustomTable(filtered);
      window.allTableData = filtered;
    })
    .catch(err => console.error("Failed to update map for grouped layers", err));
}



////////////////////////////////////////////////////////////////////


  let print = new Print({
    view: activeView,
    printServiceUrl: "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
  });
  view.ui.add(print, "top-right");

  print.domNode.style.display = "none";  // This hides the print widget by default
  // Print ikonuna tıklanma hadisəsi əlavə etmək
// Get the anchor element (adjust the id if needed)
const printIcon = document.getElementById("printIcon");

if (printIcon) {
  printIcon.addEventListener("click", (event) => {
    event.preventDefault(); // Prevent page refresh

    // Toggle the Print widget's container visibility
    const printContainer = print.domNode;
    if (printContainer.style.display === "none" || printContainer.style.display === "") {
      printContainer.style.display = "block"; // Show it
    } else {
      printContainer.style.display = "none"; // Hide it
    }
  });
}

// --- New Event Handlers for View Switching and Measurement Tools ---

const switchButton = document.getElementById("switch-btn");
const distanceButton = document.getElementById("distance");
const areaButton = document.getElementById("area");
const clearButton = document.getElementById("clear");
const measureIcon = document.getElementById("measureIcon");
const measurementResults = document.getElementById("measurementResults");
const resultsContent = document.getElementById("resultsContent");

// Switch view between 2D and 3D
switchButton.addEventListener("click", () => {
  switchView();
});

// Set measurement tools
distanceButton.addEventListener("click", () => {
  distanceMeasurement();
});
areaButton.addEventListener("click", () => {
  areaMeasurement();
});
clearButton.addEventListener("click", () => {
  clearMeasurements();
  // Clear the measurement results panel as well
  resultsContent.innerHTML = "";
});

// Toggle measurement results panel on clicking measureIcon
measureIcon.addEventListener("click", (event) => {
  event.preventDefault();
  // Toggle visibility of the measurement results panel
  if (measurementResults.style.display === "none" || measurementResults.style.display === "") {
    // For demonstration, assume we show the current active tool and a placeholder result.
    resultsContent.innerHTML = `<p>Active Tool: ${measurement.activeTool || "None"}</p>`;
    measurementResults.style.display = "block";
  } else {
    measurementResults.style.display = "none";
  }
});

// Initialize view setup
loadView();

function loadView() {
  activeView.set({ container: "viewDiv" });
  activeView.ui.add(measurement, "bottom-right");
  measurement.view = activeView;
}

// Switch view function
function switchView() {
  // Clone the current viewpoint
  const viewpoint = activeView.viewpoint.clone();
  const viewType = activeView.type.toUpperCase();
  const latitude = activeView.center.latitude;
  const scaleConversionFactor = Math.cos((latitude * Math.PI) / 180.0);
  if (viewType === "3D") {
    viewpoint.scale /= scaleConversionFactor;
  } else {
    viewpoint.scale *= scaleConversionFactor;
  }
  clearMeasurements();
  activeView.container = null;
  activeView = null;
  // Toggle between MapView and SceneView:
  // If current view is 2D, switch to 3D (sceneView), otherwise switch back to 2D (view)
  activeView = viewType === "2D" ? sceneView : view;
  activeView.set({
    container: "viewDiv",
    viewpoint: viewpoint
  });
  if (basemapGallery) basemapGallery.destroy();
  if (basemapExpand) basemapExpand.destroy();
  basemapGallery = new BasemapGallery({ view: activeView });
  basemapExpand = new Expand({ view: activeView, content: basemapGallery });
  activeView.ui.add(basemapExpand, "top-right");
  activeView.ui.add(measurement, "bottom-right");
  measurement.view = activeView;

    // Update the switch button's value based on the new active view
    switchButton.value = activeView.type.toUpperCase();
}



function distanceMeasurement() {
  const type = activeView.type;
  measurement.activeTool = type.toUpperCase() === "2D" ? "distance" : "direct-line";
  distanceButton.classList.add("active");
  areaButton.classList.remove("active");
  // Optionally update measurement results panel if visible
  if (measurementResults.style.display === "block") {
    resultsContent.innerHTML = `<p>Measuring Distance...</p>`;
  }
}

function areaMeasurement() {
  measurement.activeTool = "area";
  distanceButton.classList.remove("active");
  areaButton.classList.add("active");
  if (measurementResults.style.display === "block") {
    resultsContent.innerHTML = `<p>Measuring Area...</p>`;
  }
}

function clearMeasurements() {
  distanceButton.classList.remove("active");
  areaButton.classList.remove("active");
  measurement.clear();
}




  
  // Function to render properties on the map
function renderProperties(properties) {
  activeView.graphics.removeAll();

  properties.forEach(property => {
    let graphic;

    // Helper to get color scheme
    const getColorScheme = (property) => {
      if (property.subcategory && subcategoryColors[property.subcategory]) {
        return {
          color: subcategoryColors[property.subcategory].color,
          outline: {
            color: subcategoryColors[property.subcategory].outline,
            width: 1.5
          }
        };
      } else if (property.property_type && propertyTypeColors[property.property_type]) {
        return {
          color: propertyTypeColors[property.property_type].color,
          outline: {
            color: propertyTypeColors[property.property_type].outline,
            width: 1.5
          }
        };
      }
      return {
        color: [255, 165, 0, 0.6],
        outline: {
          color: "black",
          width: 1
        }
      };
    };

    const style = getColorScheme(property);

    if (property.geometry_coordinates && property.geometry_coordinates.length > 0) {
      const coordinates = property.geometry_coordinates[0][0];
      const polygon = new Polygon({
        rings: coordinates,
        spatialReference: { wkid: 4326 }
      });

      graphic = new Graphic({
        geometry: polygon,
        attributes: {
          Project: property.project,
          Owner: property.owner,
          Address: property.address,
          Value: property.book_value,
          Subcategory: property.subcategory,
          Use_type: property.property_use_type,
          Special_co: property.special_co,
          Total_area: property.total_area,
          Land_area_: property.land_area
        },
        symbol: {
          type: "simple-fill",
          color: style.color,
          outline: style.outline
        },
        popupTemplate: {
          title: "{Project}",
          content: `
            <b>Owner:</b> {Owner} <br>
            <b>Value:</b> {Value} <br>
            <b>Address:</b> {Address} <br>
            <b>Subcategory:</b> {Subcategory} <br>
            <b>Use Type:</b> {Use_type} <br>
            <b>Special code:</b> {Special_co} <br>
            <b>Total Area:</b> {Total_area} m² <br>
            <b>Land Area:</b> {Land_area_} ha <br>
          `
        }
      });
    } else if (property.coord_point) {
      const [longitude, latitude] = property.coord_point;
      const point = new Point({
        longitude: longitude,
        latitude: latitude
      });

      graphic = new Graphic({
        geometry: point,
        attributes: {
          Project: property.project,
          Owner: property.owner,
          Address: property.address,
          Value: property.book_value,
          Subcategory: property.subcategory,
          Use_type: property.property_use_type,
          Special_co: property.special_co,
          Total_area: property.total_area,
          Land_area_: property.land_area
        },
        symbol: {
          type: "simple-marker",
          color: style.color,
          size: "10px",
          outline: style.outline
        },
        popupTemplate: {
          title: "{Project}",
          content: `
            <b>Owner:</b> {Owner} <br>
            <b>Value:</b> {Value} <br>
            <b>Address:</b> {Address} <br>
            <b>Subcategory:</b> {Subcategory} <br>
            <b>Use Type:</b> {Use_type} <br>
            <b>Special code:</b> {Special_co} <br>
            <b>Total Area:</b> {Total_area} m² <br>
            <b>Land Area:</b> {Land_area_} ha <br>
          `
        }
      });
    }

    if (graphic) {
      activeView.graphics.add(graphic);
    }
  });
}


  window.renderProperties = renderProperties;


  
  // Function to update properties shown on the map based on checked checkboxes
  function updateMapProperties() {
  // 1) Collect which layers are checked
  const checkedCheckboxes = document.querySelectorAll('.layer-list input[type="checkbox"]:checked');
  const checkedIds = Array.from(checkedCheckboxes)
    .map(checkbox => checkbox.id)
    .filter(id => Object.values(propertyMapping).includes(id));

  // Determine the property types corresponding to the checked checkboxes
  const selectedPropertyTypes = Object.keys(propertyMapping).filter(propertyType =>
    checkedIds.includes(propertyMapping[propertyType])
  );
  

  // If no checkbox is selected, clear the map and table
   if (selectedPropertyTypes.length === 0) {
    activeView.graphics.removeAll();
    updateCustomTable([]);
    window.allTableData = [];
    return;
  }

// Build a comma-separated list of selected types and encode it
const typesQuery = encodeURIComponent(selectedPropertyTypes.join(','));

// Fetch data from the backend using the propertyTypes query parameter
fetch(`http://localhost:5010/properties?propertyTypes=${typesQuery}`)
  .then(response => response.json())
  .then(filteredData => {
    // console.log("Data returned from server:", filteredData);
    // Update the map and attribute table with the fetched data
    renderProperties(filteredData);
    // updateCustomTable(filteredData);
    initCustomTable(filteredData);
    window.allTableData = filteredData;
  })
  .catch(error => console.error("Error fetching filtered data:", error));
}

  
  

    // Attach change event listeners to the layer list checkboxes.
    document.querySelectorAll('.layer-list input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener("change", updateMapProperties);
    });


  // Once the view is ready, set up pointer-move:
  view.on("pointer-move", function(evt) {
    // Convert screen coords to map coords
    const point = view.toMap({ x: evt.x, y: evt.y });
    if (point) {
      // Format coordinates to e.g. 6 decimal places
      const lat = point.latitude.toFixed(6);
      const lon = point.longitude.toFixed(6);

      // Update the text in our coordinateDisplay
      document.getElementById("coordinateText").textContent = `Lat: ${lat}, Lon: ${lon}`;
    } else {
      // If the conversion fails for some reason (e.g., pointer is out of map)
      document.getElementById("coordinateText").textContent = "";
    }
  });

  // Fetch all properties from the API but render an empty map initially
  // fetch("http://localhost:5010/properties/")
  //   .then(response => response.json())
  //   .then(fetchedData => {
  //     if (!Array.isArray(fetchedData)) {
  //       console.error("Unexpected API response format", fetchedData);
  //       return;
  //     }
  //     data = fetchedData;
  //     // Render no properties by default
  //     renderProperties(fetchedData);
  //     // updateAttributeTable([]);
  //     // initCustomTable(data);
  //     window.allTableData = fetchedData;
  //     initCustomTable(fetchedData);

  //   })
  //   .catch(error => console.error("Error fetching data:", error));



  // Search functionality (remains unchanged)
  const searchInput = document.getElementById("searchInput");
  const suggestionList = document.getElementById("suggestionList");

  searchInput.addEventListener("input", function (event) {
    const queryText = event.target.value.trim();

    if (queryText.length === 0) {
      suggestionList.style.display = "none";
      return;
    }

    fetch(`http://localhost:5010/properties/search?query=${encodeURIComponent(queryText)}`)
      .then(response => response.json())
      .then(filteredProperties => {
        suggestionList.innerHTML = "";

        if (filteredProperties.length === 0) {
          suggestionList.style.display = "none";
          return;
        }

        suggestionList.style.display = "block";
        suggestionList.style.maxHeight = "300px";
        suggestionList.style.overflowY = "auto";
        suggestionList.style.border = "1px solid #ccc";
        suggestionList.style.background = "white";
        suggestionList.style.position = "absolute";
        suggestionList.style.zIndex = "1000";
        suggestionList.style.width = searchInput.offsetWidth + "px";
        suggestionList.style.listStyle = "none";
        suggestionList.style.padding = "5px";
        suggestionList.style.margin = "0";

        filteredProperties.forEach(property => {
          const listItem = document.createElement("li");
          listItem.textContent = `${property.special_co} - ${property.street}`;
          listItem.style.padding = "8px";
          listItem.style.cursor = "pointer";
          listItem.style.borderBottom = "1px solid #ddd";
          listItem.style.transition = "background 0.2s";

          listItem.addEventListener("mouseenter", () => listItem.style.background = "#f0f0f0");
          listItem.addEventListener("mouseleave", () => listItem.style.background = "white");

          listItem.addEventListener("click", () => {
            const matchingGraphic = view.graphics.items.find(g => g.attributes.Special_co === property.special_co);

            if (matchingGraphic) {
              view.goTo({ target: matchingGraphic.geometry, zoom: 16 })
                .catch(error => console.error("Error zooming to feature:", error));
            }

            suggestionList.style.display = "none";
            searchInput.value = "";
          });

          suggestionList.appendChild(listItem);
        });
      })
      .catch(error => console.error("Error fetching search results:", error));
  });

  // Hide suggestion list when clicking outside
  document.addEventListener("click", (event) => {
    if (!searchInput.contains(event.target) && !suggestionList.contains(event.target)) {
      suggestionList.style.display = "none";
    }
  });

  // Toggle Basemap Gallery
  const mapIcon = document.getElementById("mapIcon");
  if (mapIcon) {
    mapIcon.addEventListener("click", (event) => {
      event.preventDefault();
      basemapExpand.expanded = !basemapExpand.expanded;
    });
  }

});


window.toggleLayerGroup = function(event) {
  event.preventDefault();

  const grouped = document.getElementById("groupedLayerList");
  const staticList = document.getElementById("staticLayerList");

  document.querySelectorAll('.layer-list input[type="checkbox"]').forEach(cb => cb.checked = false);
  window.view.graphics.removeAll();
  updateCustomTable([]);
  window.allTableData = [];

  if (grouped.style.display === "none" || grouped.style.display === "") {
    grouped.style.display = "block";
    staticList.style.display = "none";
  } else {
    grouped.style.display = "none";
    staticList.style.display = "block";
  }
};

window.toggleNested = function(containerId, arrowEl, event) {
  event.stopPropagation();
  const container = document.getElementById(containerId);
  if (!container) return;

  if (container.style.display === "none" || container.style.display === "") {
    container.style.display = "block";
    if (arrowEl) arrowEl.textContent = "▼";
  } else {
    container.style.display = "none";
    if (arrowEl) arrowEl.textContent = "▶";
  }
};


document.addEventListener("DOMContentLoaded", function () {
  const panel = document.getElementById("colorInfoPanel");
  const content = document.getElementById("colorInfoContent");
  const trigger = document.querySelector(".color-info");

  const subcategoryColors = {
    "Building": { color: [128, 0, 0, 0.7], outline: "#800000" },
    "Land": { color: [102, 51, 0, 0.5], outline: "#663300" },
    "Mixed use": { color: [16, 48, 94, 0.6], outline: "#10305e" },
    "Office": { color: [66, 135, 245, 0.7], outline: "#4287f5" },
    "Parking Building": { color: [102, 0, 204, 0.7], outline: "#6600cc" },
    "Parking space": { color: [189, 189, 189, 0.7], outline: "#bdbdbd" },
    "Residential": { color: [215, 25, 28, 0.6], outline: "#d7191c" },
    "Single Family Houses": { color: [128, 0, 64, 0.7], outline: "#800040" },
    "Street Retail": { color: [41, 98, 255, 0.7], outline: "#2962ff" },
    "Unit": { color: [107, 142, 35, 0.7], outline: "#6b8e23" },
    "Warehouse": { color: [18, 165, 133, 0.7], outline: "#0f6f59" },
    "Hotel": { color: [0, 255, 255, 1], outline: "#00ffff" },
    "Apartments": { color: [153, 50, 204, 0.7], outline: "#9932cc" },
    "Cip": {color: [67,69,11,1], outline: "#ffffff" },
    "Pitstop": { color: [70, 130, 180, 0.7], outline: "#4682b4" },
    "Foton": { color: [255, 105, 180, 0.7], outline: "#ff69b4" },   // Hot Pink
    "Top": { color: [0, 191, 255, 0.7], outline: "#00bfff" }        // Deep Sky Blue
  };

  function rgbaArrayToCss(rgba) {
    const [r, g, b, a] = rgba;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function generateColorList() {
    content.innerHTML = ""; // Clear previous
    Object.entries(subcategoryColors).forEach(([key, val]) => {
      const line = document.createElement("div");
      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.marginBottom = "6px";

      const circle = document.createElement("div");
      circle.style.width = "14px";
      circle.style.height = "14px";
      circle.style.borderRadius = "50%";
      circle.style.marginRight = "10px";
      circle.style.border = "1px solid #aaa";
      circle.style.backgroundColor = rgbaArrayToCss(val.color);

      const label = document.createElement("span");
      label.textContent = key;
      label.style.fontSize = "13px";

      line.appendChild(circle);
      line.appendChild(label);
      content.appendChild(line);
    });
  }

  if (trigger) {
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      if (panel.style.display === "none" || panel.style.display === "") {
        generateColorList();
        panel.style.display = "block";
      } else {
        panel.style.display = "none";
      }
    });
  }
});
