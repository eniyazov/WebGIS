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
  const url = "/Place_Data.geojson";
  const geojsonLayer = new GeoJSONLayer({
    url: url,
    copyright: "USGS Earthquakes",
    popupTemplate: {
      title: "Earthquake Info",
      content: "Magnitude {mag} {type} hit {place} on {time}",
      fieldInfos: [{
        fieldName: 'time',
        format: { dateFormat: 'short-date-short-time' }
      }]
    },
    renderer: {
      type: "simple",
      field: "mag",
      symbol: { type: "simple-fill", color: "orange", outline: { color: "white" } },
      visualVariables: [{
        type: "size",
        field: "mag",
        stops: [{ value: 2.5, size: "4px" }, { value: 8, size: "40px" }]
      }]
    }
  });

  map.add(geojsonLayer); // GeoJSONLayer'i xəritəyə əlavə et

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

  // MapIcon-a tıklanma hadisəsi əlavə etmək
  const mapIcon = document.getElementById("mapIcon");
  mapIcon.addEventListener("click", (event) => {
    event.preventDefault(); // Səhifənin yenilənməsinin qarşısını alır
    basemapExpand.expanded = !basemapExpand.expanded; // Expand widgetını idarə edin
  });

  // BasemapGallery mənbələrini yoxlamaq üçün konsolda göstərin
  // basemapGallery.when(() => {
  //     console.log("BasemapGallery mənbələri:", basemapGallery.source.items);
  //     if (basemapGallery.source.items.length === 0) {
  //         console.error("BasemapGallery mənbələri boşdur.");
  //     }
  // }).catch((error) => {
  //     console.error("BasemapGallery yüklənərkən xəta baş verdi:", error);
  // });
});
