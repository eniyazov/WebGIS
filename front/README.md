# WebGIS - Əmlak İdarəetmə Sistemi

WebGIS əmlakların xəritə üzərində vizuallaşdırılması və idarə edilməsi üçün hazırlanmış veb tətbiqdir.

## Xüsusiyyətlər

- 🗺️ **2D/3D Xəritə Görünüşü** - ArcGIS API 4.31 ilə interaktiv xəritə
- 🔐 **JWT Authentication** - Təhlükəsiz giriş sistemi
- 🔍 **Axtarış** - Sahibkar və ünvan üzrə axtarış
- 📊 **Data Cədvəli** - Filtrlənə bilən və export edilə bilən cədvəl
- 📏 **Ölçmə Alətləri** - Məsafə və sahə ölçmə
- 🎨 **Layer İdarəetməsi** - Müxtəlif əmlak növləri üzrə layer-lər
- 🖨️ **Print** - Xəritəni çap etmə funksiyası

## Texnologiyalar

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Xəritə**: ArcGIS JavaScript API 4.31
- **Authentication**: JWT (8 saatlıq token)
- **Data Format**: GeoJSON

## Quraşdırma

1. Layihəni klonlayın
2. Sadə HTTP server ilə işə salın:
   ```bash
   # Python ilə
   python -m http.server 8000

   # Node.js ilə
   npx http-server
   ```
3. Brauzerdə açın: `http://localhost:8000`

## Struktur

```
├── assets/
│   ├── css/          # Stil faylları
│   └── js/
│       ├── config.js    # Konfiqurasiya
│       ├── auth.js      # Authentication
│       ├── main.js      # Əsas funksionallıq
│       ├── controls.js  # UI kontrolları
│       ├── table.js     # Cədvəl funksiyaları
│       └── basemap.js   # Basemap idarəetməsi
├── *_geojson/        # GeoJSON data faylları
└── index.html        # Əsas HTML fayl
```

## Konfiqurasiya

Bütün konfiqurasiya parametrləri `assets/js/config.js` faylında yerləşir:

- API URL-lər
- Token parametrləri
- Xəritə default settings
- Rəng sxemləri
- GeoJSON fayl yolları

## İstifadə

1. **Login**: İstifadəçi adı və şifrə ilə daxil olun
2. **Xəritə**: 2D/3D görünüş arasında keçid edin
3. **Axtarış**: Yuxarı hissədəki axtarış sahəsindən istifadə edin
4. **Layer-lər**: Sol alt küncdən layer-ləri aktiv/deaktiv edin
5. **Cədvəl**: Alt paneldən data cədvəlinə baxın
6. **Ölçmə**: Sağ tərəfdəki alətlərdən istifadə edin

## API Endpoints

- `POST /api/login/gis` - Login
- `GET /properties/search?query=...` - Axtarış
- `GET /grouped-layers` - Qruplu layer-lər
- `GET /properties?propertyTypes=...` - Filtrlənmiş əmlaklar

## Təkmilləşdirmələr (2025)

### Kod Keyfiyyəti
- ✅ Konfiqurasiya faylı əlavə edildi (`config.js`)
- ✅ Error handling təkmilləşdirildi
- ✅ Kod şərhləri əlavə edildi (AZ)
- ✅ Loading states əlavə edildi
- ✅ Kod optimallaşdırıldı

### Highlight və Zoom Funksiyaları
- ✅ **Dinamik Zoom**: Obyektin ölçüsünə görə avtomatik zoom hesablanır
- ✅ **Extent-based Zoom**: Böyük ərazilər tam görünür
- ✅ **Parlaq Highlight**: Sarı rəng + qırmızı kontur (5px)
- ✅ **Yanıb-sönən Animasiya**: 3 dəfə yanıb-sönür (200ms)
- ✅ **Row Click**: Cədvəldə row-a klik → highlight + zoom
- ✅ **Hover Effect**: Row üzərinə gələndə background dəyişir
- ✅ **Optimal Zoom Səviyyələri**:
  - Point: Zoom 18 (çox yaxın)
  - Kiçik polygon: Zoom 17
  - Orta polygon: Zoom 15-16
  - Böyük polygon: Extent-ə uyğun (bütün sahə görünür)

### UI/UX Təkmilləşdirmələri
- ✅ **Measurement Widget**: Sol alt küncdə yerləşdirildi
- ✅ **Measurement Results**: Sol tərəfdə, widget-in üstündə
- ✅ **Daha yaxşı layout**: Sağ tərəf digər widget-lər üçün azad

## Lisenziya

Example GIS © 2025
