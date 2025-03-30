require([
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/Expand",
    "esri/widgets/BasemapGallery",
    "esri/layers/GeoJSONLayer"
  ], function (Map, MapView, Expand, BasemapGallery, GeoJSONLayer) {
  
    // Xəritəni yaratmaq
    const map = new Map({
      basemap: "streets-navigation-vector"
    });
  
    // GeoJSONLayer əlavə etmək
    const url = "/Non_Residental_buildings_1.geojson";
    const geojsonLayer = new GeoJSONLayer({
      url: url,
      copyright: "PMD Group MMC",
      popupTemplate: {
        title: "{Project}",
        content: `
          <b>Owner:</b> {Owner} <br>
          <b>Address:</b> {Street} <br>
          <b>Special code:</b> {Special_co} <br>
          <b>Total Area:</b> {Total_area} m² <br>
          <b>Land Area:</b> {Land_area_} ha <br>
        `
      },
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-fill",
          color: "orange",
          outline: { color: "black", width: 1 }
        }
      }
    });
  
    map.add(geojsonLayer);
  
    // Xəritə görünüşünü yaratmaq
    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [47.5, 40],
      zoom: 6
    });
  
    // BasemapGallery widgetını qurulması
    const basemapGallery = new BasemapGallery({
      view: view
    });
  
    // Expand widgetını yaratmaq
    const basemapExpand = new Expand({
      view: view,
      content: basemapGallery
    });
  
    view.ui.add(basemapExpand, "top-right");
  
    const searchInput = document.getElementById("searchInput");
  const suggestionList = document.getElementById("suggestionList");
  
  let highlight; // Highlight edilmiş obyekt üçün dəyişən
  
  searchInput.addEventListener("input", function (event) {
    const queryText = event.target.value.trim().toLowerCase();
  
    if (queryText.length === 0) {
      suggestionList.style.display = "none";
      return;
    }
  
    const query = geojsonLayer.createQuery();
    query.where = `(LOWER("Owner") LIKE '%${queryText}%' OR LOWER("Street") LIKE '%${queryText}%')`;
  
    geojsonLayer.queryFeatures(query).then(function (result) {
      suggestionList.innerHTML = "";
  
      if (result.features.length === 0) {
        console.warn("No matching features found.");
        suggestionList.style.display = "none";
        return;
      }
  
      result.features.forEach(function (feature) {
        const listItem = document.createElement("li");
        listItem.textContent = `${feature.attributes.Special_co} - ${feature.attributes.Street}`;
        listItem.style.padding = "5px";
        listItem.style.cursor = "pointer";
  
        listItem.addEventListener("click", function () {
          // Mövcud highlight-ı təmizləyin
          if (highlight) {
            highlight.remove();
            highlight = null; // Highlight dəyişənini sıfırlayın
          }
        
          // Obyektin mövcud geometry məlumatını yoxlayın
          if (!feature.geometry) {
            console.error("Obyektin geometry məlumatı mövcud deyil:", feature.attributes);
            return;
          }
  
          // Zoom və highlight
          view.goTo({
            target: feature.geometry,
            zoom: 16
          }).then(function () {
            // Yeni obyekt üçün highlight yaradın
            view.whenLayerView(geojsonLayer).then(function (layerView) {
              highlight = layerView.highlight(feature);
              
              // Zoom əməliyyatı bitdikdən sonra highlight göstərilsin
              view.when(function () {
                highlight = layerView.highlight(feature);
              });
            });
          }).catch(function (error) {
            console.error("Obyekti zoom etmək mümkün olmadı:", error);
          });
  
          // Konsola məlumat yazdırın
          console.log("Selected feature:", feature.attributes);
  
          // Siyahını gizləyin
          suggestionList.style.display = "none";
          searchInput.value = ""; // Axtarış sahəsini təmizləyin
        });
  
        suggestionList.appendChild(listItem);
      });
  
      suggestionList.style.display = "block";
    }).catch(function (error) {
      console.error("Error querying features: ", error);
    });
  });
  
  // Siyahının dərhal gizlənməməsi üçün "setTimeout" istifadə edilir
  searchInput.addEventListener("blur", function () {
    setTimeout(function () {
      suggestionList.style.display = "none";
    }, 200);
  });
  
  // Siyahının "mouseover" hadisəsi ilə gizlənməsinin qarşısını alın
  suggestionList.addEventListener("mouseover", function () {
    suggestionList.style.display = "block";
  });
  
   // MapIcon-a tıklanma hadisəsi əlavə etmək
   const mapIcon = document.getElementById("mapIcon");
   if (mapIcon) {
     mapIcon.addEventListener("click", (event) => {
       event.preventDefault(); // Səhifənin yenilənməsinin qarşısını alır
       basemapExpand.expanded = !basemapExpand.expanded; // Expand widgetını idarə edin
     });
   }
  
    // if (!feature.geometry) {
    //   console.error("Feature has no geometry.");
    //   return;
    // }
    
    // // GeoJSONLayer məlumatlarını konsola yazdırmaq
    // geojsonLayer.queryFeatures().then(function (result) {
    //   console.log(result.features);
    // });
  });
  