// Konfiqurasiya faylı - Bütün settings burada
(function () {
  window.AppConfig = {
    // API URL-lər
    api: {
      base: "https://api.example.com",
      login: "https://auth.example.com/login"
    },

    // Token settings
    auth: {
      tokenKey: "geoapp_token",
      tokenTTL: 1000 * 60 * 60 * 8 // 8 saat
    },

    // Xəritə settings
    map: {
      defaultCenter: [49.8671, 40.4093], // Bakı koordinatları
      defaultZoom: 12,
      defaultBasemap: "streets-vector"
    },

    // Rəng sxemləri
    colors: {
      subcategory: {
        "Urban Park": { color: [34, 139, 34, 0.65], outline: "#1f7a1f" },
        "Panoramic Park": { color: [46, 139, 87, 0.65], outline: "#2e8b57" },
        "Medieval Architecture": { color: [139, 69, 19, 0.65], outline: "#8b4513" },
        "Religious Historical Site": { color: [75, 0, 130, 0.65], outline: "#4b0082" },
        "Heritage Urban Area": { color: [205, 92, 92, 0.65], outline: "#cd5c5c" },
        Museum: { color: [70, 130, 180, 0.65], outline: "#4682b4" },
        "Performing Arts Venue": { color: [255, 140, 0, 0.65], outline: "#ff8c00" },
        "Cultural & Memorial Center": { color: [72, 61, 139, 0.65], outline: "#483d8b" },
        "Executive Authority": { color: [0, 100, 0, 0.65], outline: "#006400" },
        Ministry: { color: [0, 128, 128, 0.65], outline: "#008080" },
        "Judicial Institution": { color: [128, 0, 0, 0.65], outline: "#800000" }
      },

      propertyType: {
        "Əmlak kompleksi": { color: "#dc4b00cc", outline: "#dc4b00ff" },
        "Qeyri-yaşayış binası": { color: "#3c6ccc80", outline: "#3c6cccff" },
        "Çoxmərtəbəli yaşayış bina": { color: "#d9dc00cc", outline: "#d9dc00ff" },
        "Torpaq sahəsi": { color: "#8B4513cc", outline: "#8B4513ff" },
        "Fərdi yaşayış evi": { color: "#1a9641cc", outline: "#1a9641ff" },
        "Qeyri-yaşayış sahəsi": { color: "#d99f00cc", outline: "#d99f00ff" },
        "Mənzil": { color: "#4db478cc", outline: "#4db478ff" },
        "null": { color: "#80808080", outline: "#808080ff" } // Null/boş property_type üçün
      }
    },

    // Property mapping
    propertyMapping: {
      "Investment Property": "investmentProperty",
      "Qeyri-yaşayış binası": "nonResidentialBuildings",
      "Qeyri-yaşayış sahəsi": "nonResidentialPremises",
      "Mənzil": "apartmentsLayer",
      "Çoxmərtəbəli yaşayış bina": "residentialGroup",
      "Fərdi yaşayış evi": "singleFamilyHouses",
      "Bağ evi": "singleFamilyHouses",
      "Torpaq sahəsi": "landsSubLayer",
      "Əmlak kompleksi": "propertyCompoundsSubLayer",
      "Otel": "hotelsSubLayer"
    },

    // GeoJSON faylların yolları
    geojsonPaths: {
      primary: {
        apartments: "./GIS_json/Menzil.geojson",
        residential: "./GIS_json/Coxmertebeli_yashayish_bina.geojson",
        singleFamily: "./GIS_json/Ferdi_yashayish_evi.geojson",
        nonResidentialBuildings: "./GIS_json/Qeyri_yashayish_binasi.geojson",
        nonResidentialPremises: "./GIS_json/Qeyri_yashayish_sahesi.geojson",
        lands: "./GIS_json/Torpaq_sahesi.geojson",
        propertyCompounds: "./GIS_json/Emlak_kompleksi.geojson",
        hotels: "./GIS_json/Oteller.geojson"
      },
      foton: {
        apartments: "./Foton_json/Menzil.geojson",
        singleFamily: "./Foton_json/Ferdi_yashayish_evi.geojson",
        nonResidentialPremises: "./Foton_json/Qeyri_yashayish_sahesi.geojson",
        lands: "./Foton_json/Torpaq_sahesi.geojson"
      },
      top: {
        nonResidentialBuildings: "./TOP_json/Qeyri_yashayish_binasi.geojson",
        nonResidentialPremises: "./TOP_json/Qeyri_yashayish_sahesi.geojson",
        lands: "./TOP_json/Torpaq_sahesi.geojson",
        propertyCompounds: "./TOP_json/Emlak_kompleksi.geojson"
      },
      cip: {
        point: "./CIP_geojson/CIP_1.geojson",
        polygon: "./CIP_geojson/CIP_2.geojson"
      },
      attached: {
        single: "./Attached_geojson/Attached_properties.geojson",
        multi: "./Attached_geojson/Attached_properties_multi.geojson"
      },
      primaryLoc2: {
        point: "./GIS_loc_2/Point_Data.geojson",
        polygon: "./GIS_loc_2/Polygon_Data.geojson"
      },
      topFoton: {
        point: "./Top_Foton_loc2/Top_Foton_point.geojson",
        polygon: "./Top_Foton_loc2/Top_Foton_polygon.geojson"
      }
    },

    // Debounce delay (ms)
    searchDebounceDelay: 250,

    // Measurement settings
    measurement: {
      distanceUnit: "meters",
      areaUnit: "square-meters"
    },

    // Table column definitions by category
    tableColumns: {
      investment_property: [
        "address", "property_type", "special_co", "owner", "category", "subcategory",
        "title_by_document", "project", "region", "city", "street", "valuation_category",
        "book_value", "use_type", "lease_status", "nolease_reason", "ownership_right", "status_x",
        "property_use_type", "rent_opera", "legal_property_ownership_type", "legal_land_ownership_type",
        "property_ownership_type", "land_ownership_type", "total_area", "lease_area", "land_area",
        "property_registry_no", "registration_no", "serial_no", "technical_pasport_registry_no",
        "registration_date", "property_use_classification", "land_lease_start_date", "land_lease_end_date",
        "lease_duration", "monthly_rent", "lessor_party",
        "attachment_title_deed", "attachment_technical_pasport", "attachemnt_other",
        "coordinate_technical_pasport", "prior_year_valuation_results_2023", "current_year_valuation_resluts_2024",
        "variance", "valuation_method", "notes", "actual_land_area", "tenant_business_area",
        "date_added_portfel", "strategic_recomendation", "recomended_use", "perspective_stage", "phase",
        "status_y", "year", "quarter", "note"
      ],
      cip: [
        "title_by_document", "special_co", "owner", "category", "subcategory",
        "project", "project_code", "des_m", "dev_m", "tc_m", "riba_stage",
        "feasibility", "preconcept", "detailed_feasibility", "final_concept",
        "urban_planning_justification", "detailed_design", "technical_design",
        "construction_permit", "sales_and_leasing_start", "construction_start",
        "construction_finish", "estimated_finish", "handover"
      ],
      top_foton: [
        "address", "property_type", "special_co", "owner", "category", "subcategory",
        "title_by_document", "project", "region", "city", "street", "valuation_category",
        "book_value", "use_type", "lease_status", "nolease_reason", "ownership_right", "status_x",
        "property_use_type", "rent_opera", "legal_property_ownership_type", "legal_land_ownership_type",
        "property_ownership_type", "land_ownership_type", "total_area", "lease_area", "land_area",
        "property_registry_no", "registration_no", "serial_no", "technical_pasport_registry_no",
        "registration_date", "property_use_classification", "land_lease_start_date", "land_lease_end_date",
        "lease_duration", "monthly_rent", "lessor_party",
        "attachment_title_deed", "attachment_technical_pasport", "attachemnt_other",
        "coordinate_technical_pasport"
      ]
    },

    // Category to column mapping
    categoryColumnMap: {
      "Non-Residential": "investment_property",
      "Residential": "investment_property",
      "Apartments": "investment_property",
      "Lands": "investment_property",
      "Property Compounds": "investment_property",
      "CIP": "cip",
      "Top": "top_foton",
      "Foton": "top_foton",
      "Top Foton": "top_foton"
    }
  };
})();
