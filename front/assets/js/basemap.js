// require([
//     "esri/Map",
   
//     "esri/views/MapView",
//     "esri/widgets/Expand",
//     "esri/widgets/BasemapGallery"
//   ], function(Map, MapView, Expand, BasemapGallery) {
  
//     // Xəritəni yaratmaq
//     const map = new Map({
//       basemap: "streets-navigation-vector"
//     });
  
//     // Xəritə görünüşünü yaratmaq
//     const view = new MapView({
//       container: "viewDiv",
//       map: map,
//       center: [47.5, 40],
//       zoom: 6
//     });
  
    
  
//     // BasemapGallery widgetını qurulması
//     const basemapGallery = new BasemapGallery({
//       view: view,
//       visible: false  // Başlangıçda basemap listini gizlətmək
//     });
  
//     // Expand widgetını yaratmaq
//     const basemapExpand = new Expand({
//       view: view,
//       content: basemapGallery
//     });
  
//     view.ui.add(basemapExpand, "top-right");
  
//     // MapIcon-a tıklanma hadisəsi əlavə etmək
//     const mapIcon = document.getElementById("mapIcon");
//     mapIcon.addEventListener("click", (event) => {
//       event.preventDefault(); // Səhifənin yenilənməsinin qarşısını alır
//       // BasemapGallery'nin görünürlüğünü tənzimləmək
//       basemapGallery.visible = !basemapGallery.visible;
//     });
  
//   });
  