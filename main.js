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
  
  // Create Basemap Gallery widget
  let basemapGallery = new BasemapGallery({ view: activeView });
  let basemapExpand = new Expand({ view: activeView, content: basemapGallery });
  activeView.ui.add(basemapExpand, "top-right");




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
  
      // Create a polygon graphic if geometry_coordinates exists
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
            Street: property.street,
            Special_co: property.special_co,
            Total_area: property.total_area,
            Land_area_: property.land_area
          },
          symbol: {
            type: "simple-fill",
            color: [255, 165, 0, 0.6],
            outline: { color: "black", width: 1 }
          },
          popupTemplate: {
            title: "{Project}",
            content: `
              <b>Owner:</b> {Owner} <br>
              <b>Address:</b> {Street} <br>
              <b>Special code:</b> {Special_co} <br>
              <b>Total Area:</b> {Total_area} m² <br>
              <b>Land Area:</b> {Land_area_} ha <br>
            `
          }
        });
      }
      // Otherwise, if there is a point geometry
      else if (property.coord_point) {
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
            Street: property.street,
            Special_co: property.special_co,
            Total_area: property.total_area,
            Land_area_: property.land_area
          },
          symbol: {
            type: "simple-marker",
            color: [0, 0, 255],
            size: "10px"
          },
          popupTemplate: {
            title: "{Project}",
            content: `
              <b>Owner:</b> {Owner} <br>
              <b>Address:</b> {Street} <br>
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
