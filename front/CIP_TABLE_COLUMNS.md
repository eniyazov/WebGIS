# CIP Layer - Xüsusi Cədvəl Sütunları

## 🎯 Məqsəd

CIP layer-i seçiləndə cədvəldə yalnız CIP-ə aid sütunlar göstərilməlidir.
Digər layer-lər üçün bütün sütunlar göstərilir.

---

## 📋 CIP Sütunları (23 sütun)

### Əsas Məlumatlar:
1. **special_co** - Special Code
2. **category** - Category
3. **title_by_document** - Title by Document
4. **project** - Project

### CIP Xüsusi Məlumatlar:
5. **cip_no** - CIP No
6. **des_m** - Design (m²)
7. **dev_m** - Development (m²)
8. **tc_m** - TC (m²)
9. **riba_stage** - RIBA Stage
10. **project_code** - Project Code

### Layihə Mərhələləri:
11. **feasibility** - Feasibility
12. **preconcept** - Preconcept
13. **detailed_feasibility** - Detailed Feasibility
14. **final_concept** - Final Concept
15. **urban_planning_justification** - Urban Planning Justification
16. **detailed_design** - Detailed Design
17. **technical_design** - Technical Design
18. **construction_permit** - Construction Permit

### Tarixlər:
19. **sales_and_leasing_start** - Sales & Leasing Start
20. **construction_start** - Construction Start
21. **construction_finish** - Construction Finish
22. **estimated_finish** - Estimated Finish
23. **handover** - Handover

---

## 🔧 Texniki Detallar

### Kod Dəyişiklikləri:

**1. CIP sütunları array-i (table.js):**
```javascript
const cipColumns = [
  "special_co", "category", "title_by_document", "project", "cip_no",
  "des_m", "dev_m", "tc_m", "riba_stage", "project_code",
  "feasibility", "preconcept", "detailed_feasibility", "final_concept",
  "urban_planning_justification", "detailed_design", "technical_design",
  "construction_permit", "sales_and_leasing_start", "construction_start",
  "construction_finish", "estimated_finish", "handover"
];
```

**2. initCustomTable funksiyası:**
```javascript
// CIP layer-i yoxla
const isCipLayer = data.length > 0 && data.some(item => 
  item.subcategory === "Cip" || item.category === "Cip"
);

if (isCipLayer) {
  // Yalnız CIP sütunları göstər
  visibleColumns = cipColumns;
} else {
  // Bütün sütunları göstər
  visibleColumns = columns.map(col => col.key);
}
```

---

## 🧪 Test Ssenariləri

### Test 1: CIP Layer Seçimi
**Addımlar:**
1. Layer list açın
2. CIP layer-ini seçin
3. Table açın

**Gözlənilən:**
- ✅ Cədvəldə yalnız 23 CIP sütunu görünür
- ✅ Digər sütunlar gizlidir
- ✅ Column panel-də yalnız CIP sütunları var

### Test 2: Digər Layer Seçimi
**Addımlar:**
1. Layer list açın
2. Apartments layer-ini seçin
3. Table açın

**Gözlənilən:**
- ✅ Cədvəldə bütün sütunlar görünür
- ✅ CIP sütunları da daxil
- ✅ Column panel-də bütün sütunlar var

### Test 3: CIP-dən Digər Layer-ə Keçid
**Addımlar:**
1. CIP layer-i seçili (table açıq, 23 sütun)
2. CIP-i deselect edin
3. Apartments seçin

**Gözlənilən:**
- ✅ Cədvəl yenilənir
- ✅ Bütün sütunlar görünür

### Test 4: Qarışıq Seçim (CIP + Digər)
**Addımlar:**
1. CIP və Apartments hər ikisini seçin
2. Table açın

**Gözlənilən:**
- ✅ Əgər data-da ən azı 1 CIP obyekti varsa → 23 sütun
- ✅ Əgər heç CIP obyekti yoxsa → bütün sütunlar

---

## 📊 SQL Query (Reference)

```sql
SELECT 
  special_co, 
  category, 
  title_by_document, 
  project, 
  cip_no, 
  des_m, 
  dev_m, 
  tc_m, 
  riba_stage, 
  project_code, 
  feasibility, 
  preconcept, 
  detailed_feasibility, 
  final_concept, 
  urban_planning_justification, 
  detailed_design, 
  technical_design, 
  construction_permit, 
  sales_and_leasing_start, 
  construction_start, 
  construction_finish, 
  estimated_finish, 
  handover 
FROM public.valuation_layout
WHERE subcategory = 'Cip';
```

---

## ✅ Üstünlüklər

1. ✅ **Sadələşdirilmiş görünüş** - CIP üçün yalnız lazımi sütunlar
2. ✅ **Avtomatik aşkarlama** - Subcategory və ya category əsasında
3. ✅ **Dinamik** - Layer dəyişəndə avtomatik yenilənir
4. ✅ **Geriyə uyğun** - Digər layer-lər təsirlənmir

---

## 🔍 Yoxlama Məntiqı

```javascript
// CIP yoxlaması:
const isCipLayer = data.some(item => 
  item.subcategory === "Cip" || item.category === "Cip"
);

// Əgər data-da ən azı 1 CIP obyekti varsa → CIP mode
// Əks halda → Normal mode (bütün sütunlar)
```

