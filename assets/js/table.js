let tableData = [];
let currentPage = 1;
const pageSize = 10;
let visibleColumns = [];
let selectedRows = new Set();
let currentSortColumn = null;
let currentSortOrder = "asc";
let allTableData = [];
let scrollIndex = 0;
let tableResizeInited = false;
const scrollStep = 100;

/**
 * Popup notification göstərir (alert əvəzinə)
 * @param {string} message - Göstəriləcək mesaj
 * @param {string} type - Notification tipi: 'warning', 'error', 'success', 'info'
 */
function showNotification(message, type = 'info') {
  // Əvvəlki notification-u sil
  const existingNotif = document.getElementById('customNotification');
  if (existingNotif) {
    existingNotif.remove();
  }

  // Notification elementi yarat
  const notif = document.createElement('div');
  notif.id = 'customNotification';
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

  // Tipe görə rəng seç
  const colors = {
    'warning': { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
    'error': { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
    'success': { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
    'info': { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
  };

  const color = colors[type] || colors['info'];
  notif.style.backgroundColor = color.bg;
  notif.style.borderLeft = `4px solid ${color.border}`;
  notif.style.color = color.text;
  notif.textContent = message;

  // CSS animasiya əlavə et
  if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notif);

  // 4 saniyə sonra sil
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notif.remove(), 300);
  }, 4000);
}

const columns = [
  { group: "Place", label: "Name", key: "title", sortType: "string" },
  { group: "Place", label: "Special Code", key: "special_co", sortType: "string" },
  { group: "Place", label: "Country", key: "country", sortType: "string" },
  { group: "Place", label: "City", key: "city", sortType: "string" },
  { group: "Place", label: "Address", key: "address", sortType: "string" },
  { group: "Place", label: "Category", key: "category", sortType: "string" },
  { group: "Place", label: "Subcategory", key: "subcategory", sortType: "string" }
];

// Get visible columns based on data category
function getVisibleColumnsForData(data) {
  if (data.length === 0) return columns.map(col => col.key);
  return columns.map(col => col.key);
}

function initCustomTable(data) {
  // Filtrələnmiş məlumatları saxla
  tableData = data;
  // Bütün məlumatları saxla (filter clear üçün)
  allTableData = data;

  // Determine which columns to show based on data category
  visibleColumns = getVisibleColumnsForData(data);

  // If no columns determined, use all columns
  if (visibleColumns.length === 0) {
    visibleColumns = columns.map(col => col.key);
  }

  // Remove empty columns (columns with no data in any row)
  visibleColumns = visibleColumns.filter(colKey => {
    return data.some(item => {
      const value = item[colKey];
      return value !== null && value !== undefined && value !== "" && value !== "null";
    });
  });
  // Exclude geometry fields from table
  visibleColumns = visibleColumns.filter(colKey => colKey !== "coord_point" && colKey !== "geometry_coordinates");

  scrollIndex = 0;
  selectedRows.clear();
  currentSortColumn = null;
  currentSortOrder = "asc";

  const table = document.getElementById("customTable");
  if (!table) {
    console.error("customTable element not found!");
    return;
  }

  // ƏVVƏLCƏ TƏMİZLƏ
  table.innerHTML = "";

  // HEADER-İ QUR
  buildTableHeader();

  // TBODY YOXDURSA, DOM İLƏ YARAT (innerHTML İSTİFADƏ ETMƏ!)
  let tbody = table.querySelector("tbody");
  if (!tbody) {
    tbody = document.createElement("tbody");
    table.appendChild(tbody);
  }

  // ROW-LARI YAZ
  buildTableBody();
  buildColumnPanel();
  buildFilterSection();
  updateTableHeaderLabels();
  attachEventListeners();
  attachFilterButtonListener();
  setupInfiniteScroll();

  if (!tableResizeInited) {
    setupTableResize();
    tableResizeInited = true;
  }
}


function setupInfiniteScroll() {
  const container = document.getElementById("tableScrollWrapper") || document.getElementById("advancedTableContainer");
  if (!container) return;

  container.addEventListener("scroll", () => {
    const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    if (nearBottom && scrollIndex + scrollStep < tableData.length) {
      scrollIndex += scrollStep;
      buildTableBody();
    }
  });
}

function updateCustomTable(filteredData) {
  tableData = filteredData;
  allTableData = filteredData;

  // Determine which columns to show based on data category
  visibleColumns = getVisibleColumnsForData(filteredData);

  // If no columns determined, use all columns
  if (visibleColumns.length === 0) {
    visibleColumns = columns.map(col => col.key);
  }

  // Remove empty columns (columns with no data in any row)
  visibleColumns = visibleColumns.filter(colKey => {
    return filteredData.some(item => {
      const value = item[colKey];
      return value !== null && value !== undefined && value !== "" && value !== "null";
    });
  });
  // Exclude geometry fields from table
  visibleColumns = visibleColumns.filter(colKey => colKey !== "coord_point" && colKey !== "geometry_coordinates");

  scrollIndex = 0;
  selectedRows.clear();
  const table = document.getElementById("customTable");
  const tbody = table.querySelector("tbody");
  if (tbody) tbody.innerHTML = "";
  buildTableHeader();
  buildTableBody();
  updateTableHeaderLabels();
  attachRowCheckboxListeners();
}

function sortByColumn(key, sortType) {
  if (currentSortColumn === key) {
    currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
  } else {
    currentSortColumn = key;
    currentSortOrder = "asc";
  }

  tableData.sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];

    if (aVal === null || aVal === undefined) aVal = "";
    if (bVal === null || bVal === undefined) bVal = "";

    if (sortType === "numeric") {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
      return currentSortOrder === "asc" ? aVal - bVal : bVal - aVal;
    } else {
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
      if (aVal < bVal) return currentSortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return currentSortOrder === "asc" ? 1 : -1;
      return 0;
    }
  });

  scrollIndex = 0;
  selectedRows.clear();

  const table = document.getElementById("customTable");
  const tbody = table.querySelector("tbody");
  if (tbody) tbody.innerHTML = "";

  buildTableHeader();
  buildTableBody();
  updateTableHeaderLabels();
}

function buildTableHeader() {
  const table = document.getElementById("customTable");
  table.innerHTML = "";

  const thead = document.createElement("thead");

  // 1-ci sıra: qruplar + select-all
  const groupRow = document.createElement("tr");
  const selectAllTh = document.createElement("th");
  selectAllTh.setAttribute("rowspan", "2");
  selectAllTh.style.textAlign = "center";
  selectAllTh.innerHTML = `<input type="checkbox" id="selectAllRows" />`;
  groupRow.appendChild(selectAllTh);

  const groupVisibleCount = {};
  const groupOrder = [];

  columns.forEach(col => {
    if (!groupOrder.includes(col.group)) {
      groupOrder.push(col.group);
    }
    if (visibleColumns.includes(col.key)) {
      groupVisibleCount[col.group] = (groupVisibleCount[col.group] || 0) + 1;
    }
  });

  groupOrder.forEach(group => {
    if (groupVisibleCount[group]) {
      const th = document.createElement("th");
      th.colSpan = groupVisibleCount[group];
      th.style.textAlign = "center";
      th.innerText = group;
      groupRow.appendChild(th);
    }
  });

  thead.appendChild(groupRow);

  // 2-ci sıra: sütun adları
  const labelRow = document.createElement("tr");

  columns.forEach(col => {
    const th = document.createElement("th");
    th.id = "colheader_" + col.key;
    th.style.textAlign = "center";

    let label = col.label;
    if (col.key === currentSortColumn) {
      label += currentSortOrder === "asc" ? " ▲" : " ▼";
    }
    th.innerText = label;

    if (!visibleColumns.includes(col.key)) {
      th.style.display = "none";
    }

    // kliklə sort
    th.addEventListener("click", function () {
      sortByColumn(col.key, col.sortType || "string");
    });

    labelRow.appendChild(th);
  });

  thead.appendChild(labelRow);
  table.appendChild(thead);
}


function buildTableBody() {
  const table = document.getElementById("customTable");
  const tbody = table.querySelector("tbody") || document.createElement("tbody");
  if (!table.contains(tbody)) table.appendChild(tbody);

  // infinite scroll – əlavə olunur, silmirik
  const slice = tableData.slice(scrollIndex, scrollIndex + scrollStep);
  slice.forEach((item, rowIndex) => {
    const tr = document.createElement("tr");
    const absoluteIndex = scrollIndex + rowIndex;

    tr.style.cursor = "pointer";
    tr.dataset.index = absoluteIndex;

    tr.addEventListener("click", function(e) {
      if (e.target.type === "checkbox") return;

      const property = tableData[absoluteIndex];
      if (property) {
        if (typeof window.highlightSelectedProperty === "function") {
          window.highlightSelectedProperty(property);
        }

        const view = window.activeView || window.view;
        if (view && view.goTo && typeof window.getOptimalZoomForProperty === "function") {
          const { target, zoom } = window.getOptimalZoomForProperty(property);

          if (target) {
            const goToOptions = zoom ? { target, zoom } : { target };
            view.goTo(goToOptions).catch(() => {});
          }
        }
      }

      document.querySelectorAll("#customTable tbody tr").forEach(r => {
        r.style.backgroundColor = "";
      });

      tr.style.backgroundColor = "#e3f2fd";
    });

    tr.addEventListener("mouseenter", function() {
      if (tr.style.backgroundColor !== "rgb(227, 242, 253)") {
        tr.style.backgroundColor = "#f5f5f5";
      }
    });

    tr.addEventListener("mouseleave", function() {
      if (tr.style.backgroundColor !== "rgb(227, 242, 253)") {
        tr.style.backgroundColor = "";
      }
    });

    const selectTd = document.createElement("td");
    selectTd.style.textAlign = "center";
    selectTd.innerHTML = `
      <input type="checkbox" class="row-checkbox" data-index="${absoluteIndex}"
        ${selectedRows.has(absoluteIndex) ? "checked" : ""} />
    `;
    tr.appendChild(selectTd);

    columns.forEach(col => {
      const td = document.createElement("td");
      td.id = "col_" + col.key;
      td.style.textAlign = "center";
      td.style.display = visibleColumns.includes(col.key) ? "" : "none";
      td.textContent = item[col.key] ?? "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  attachRowCheckboxListeners();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    buildTableBody();
  }
}

function nextPage() {
  const totalPages = Math.ceil(tableData.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    buildTableBody();
  }
}

function buildColumnPanel() {
  const panel = document.getElementById("columnsPanel");
  panel.innerHTML = "";

  panel.style.maxHeight = "200px";
  panel.style.overflowY = "auto";

  const groupMap = {};
  columns.forEach(col => {
    if (!groupMap[col.group]) {
      groupMap[col.group] = [];
    }
    groupMap[col.group].push(col);
  });

  for (const group in groupMap) {
    const groupDiv = document.createElement("div");
    groupDiv.style.marginBottom = "10px";

    const groupLabel = document.createElement("label");
    groupLabel.style.fontWeight = "bold";
    const groupCheckbox = document.createElement("input");
    groupCheckbox.type = "checkbox";
    groupCheckbox.checked = groupMap[group].every(col => visibleColumns.includes(col.key));
    groupCheckbox.dataset.group = group;
    groupCheckbox.style.marginRight = "5px";
    groupLabel.appendChild(groupCheckbox);
    groupLabel.appendChild(document.createTextNode(group));
    groupDiv.appendChild(groupLabel);

    const childContainer = document.createElement("div");
    childContainer.style.marginLeft = "20px";
    groupMap[group].forEach(col => {
      const childLabel = document.createElement("label");
      childLabel.style.display = "block";
      childLabel.style.marginBottom = "5px";

      const childCheckbox = document.createElement("input");
      childCheckbox.type = "checkbox";
      childCheckbox.checked = visibleColumns.includes(col.key);
      childCheckbox.dataset.key = col.key;
      childCheckbox.style.marginRight = "5px";

      childLabel.appendChild(childCheckbox);
      childLabel.appendChild(document.createTextNode(col.label));
      childContainer.appendChild(childLabel);
    });
    groupDiv.appendChild(childContainer);
    panel.appendChild(groupDiv);
  }
}

function buildFilterSection() {
  let filterSection = document.getElementById("filterSection");
  if (!filterSection) {
    filterSection = document.createElement("div");
    filterSection.id = "filterSection";
    filterSection.style.display = "none";
    filterSection.style.border = "1px solid #ccc";
    filterSection.style.padding = "10px";
    filterSection.style.marginTop = "5px";
    const advancedTableContainer = document.getElementById("advancedTableContainer");
    advancedTableContainer.insertBefore(filterSection, advancedTableContainer.childNodes[1]);
  }
  filterSection.innerHTML = "";

  const combineDiv = document.createElement("div");
  combineDiv.style.marginBottom = "10px";
  combineDiv.innerHTML = `
    <label>Combine Filters Using: </label>
    <select id="filterCombineOperator">
      <option value="and">AND</option>
      <option value="or">OR</option>
    </select>
  `;
  filterSection.appendChild(combineDiv);

  const linesContainer = document.createElement("div");
  linesContainer.id = "filterLinesContainer";
  filterSection.appendChild(linesContainer);

  const addLineBtn = document.createElement("button");
  addLineBtn.id = "addFilterLineBtn";
  addLineBtn.textContent = "Add Filter";
  addLineBtn.addEventListener("click", addFilterLine);
  filterSection.appendChild(addLineBtn);

  const applyBtn = document.createElement("button");
  applyBtn.id = "applyFiltersBtn";
  applyBtn.textContent = "Apply Filter";
  applyBtn.addEventListener("click", applyFiltersFromUI);
  filterSection.appendChild(applyBtn);

  const clearBtn = document.createElement("button");
  clearBtn.id = "clearFiltersBtn";
  clearBtn.textContent = "Clear Filter";
  clearBtn.addEventListener("click", function () {
    document.getElementById("filterLinesContainer").innerHTML = "";
    // allTableData istifadə et (filtrələnmiş məlumatlar)
    tableData = [...allTableData];
    scrollIndex = 0;
    selectedRows.clear();
    currentSortColumn = null;
    currentSortOrder = "asc";
    buildTableHeader();
    const table = document.getElementById("customTable");
    const tbody = table.querySelector("tbody");
    if (tbody) tbody.innerHTML = "";
    buildTableBody();
    updateTableHeaderLabels();
  });
  filterSection.appendChild(clearBtn);
}

// Separate function to attach filter button listener
function attachFilterButtonListener() {
  const filterBtn = document.getElementById("filterBtn");
  if (!filterBtn) return;

  // Remove old listener by cloning
  const newFilterBtn = filterBtn.cloneNode(true);
  filterBtn.parentNode.replaceChild(newFilterBtn, filterBtn);

  // Add new listener
  newFilterBtn.addEventListener("click", function () {
    const filterSection = document.getElementById("filterSection");
    if (filterSection && (filterSection.style.display === "none" || filterSection.style.display === "")) {
      filterSection.style.display = "block";
    } else if (filterSection) {
      filterSection.style.display = "none";
    }
  });
}

function addFilterLine() {
  const container = document.getElementById("filterLinesContainer");
  const lineDiv = document.createElement("div");
  lineDiv.className = "filterLine";
  lineDiv.style.marginBottom = "5px";

  const colSelect = document.createElement("select");
  colSelect.className = "filterColumn";
  columns.forEach(col => {
    const option = document.createElement("option");
    option.value = col.key;
    option.textContent = col.label;
    colSelect.appendChild(option);
  });
  lineDiv.appendChild(colSelect);

  const opSelect = document.createElement("select");
  opSelect.className = "filterOperator";
  updateOperatorOptions(colSelect.value, opSelect);
  colSelect.addEventListener("change", function () {
    updateOperatorOptions(this.value, opSelect);
  });
  lineDiv.appendChild(opSelect);

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.className = "filterValue";
  lineDiv.appendChild(valueInput);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", function () {
    container.removeChild(lineDiv);
    applyFiltersFromUI();
  });
  lineDiv.appendChild(deleteBtn);

  container.appendChild(lineDiv);
}

function updateOperatorOptions(columnKey, opSelect) {
  opSelect.innerHTML = "";
  const colDef = columns.find(c => c.key === columnKey);
  let options = [];
  if (colDef) {
    if (colDef.sortType === "numeric") {
      options = ["=", ">", ">=", "<", "<="];
    } else {
      options = ["contains", "starts with", "ends with"];
    }
  }
  options.forEach(op => {
    const option = document.createElement("option");
    option.value = op;
    option.textContent = op;
    opSelect.appendChild(option);
  });
}

function applyFiltersFromUI() {
  const filterLines = document.querySelectorAll(".filterLine");
  const rules = [];
  filterLines.forEach(line => {
    const columnKey = line.querySelector(".filterColumn").value;
    const operator = line.querySelector(".filterOperator").value;
    const value = line.querySelector(".filterValue").value.trim();
    if (columnKey && operator && value !== "") {
      rules.push({ columnKey, operator, value });
    }
  });

  const combineOperator = document.getElementById("filterCombineOperator").value;
  const filteredData = window.allTableData.filter(item => {
    const evaluations = rules.map(rule => {
      const colDef = columns.find(c => c.key === rule.columnKey);
      const propVal = item[rule.columnKey];
      if (colDef) {
        if (colDef.sortType === "numeric") {
          const numPropVal = parseFloat(propVal) || 0;
          const numRuleVal = parseFloat(rule.value) || 0;
          switch (rule.operator) {
            case "=": return numPropVal === numRuleVal;
            case ">": return numPropVal > numRuleVal;
            case ">=": return numPropVal >= numRuleVal;
            case "<": return numPropVal < numRuleVal;
            case "<=": return numPropVal <= numRuleVal;
            default: return false;
          }
        } else {
          const strPropVal = (propVal !== null && propVal !== undefined) ? propVal.toString().toLowerCase() : "";
          const ruleVal = rule.value.toLowerCase();
          switch (rule.operator) {
            case "contains": return strPropVal.includes(ruleVal);
            case "starts with": return strPropVal.startsWith(ruleVal);
            case "ends with": return strPropVal.endsWith(ruleVal);
            default: return false;
          }
        }
      }
      return false;
    });
    if (combineOperator === "and") {
      return evaluations.every(e => e);
    } else {
      return evaluations.some(e => e);
    }
  });

  tableData = filteredData;
  scrollIndex = 0;
  selectedRows.clear();
  currentSortColumn = null;
  currentSortOrder = "asc";
  buildTableHeader();
  const table = document.getElementById("customTable");
  const tbody = table.querySelector("tbody");
  if (tbody) tbody.innerHTML = "";
  buildTableBody();
  updateTableHeaderLabels();

  if (typeof renderProperties === "function") {
    renderProperties(filteredData);
  }
}

function toggleColumnsPanel() {
  const panel = document.getElementById("columnsPanel");
  if (panel.style.display === "none" || panel.style.display === "") {
    const btn = document.getElementById("showHideColumnsBtn");
    const rect = btn.getBoundingClientRect();
    panel.style.left = rect.left + "px";
    panel.style.display = "block";
  } else {
    panel.style.display = "none";
  }
}

function updateColumnVisibility(key, isVisible) {
  if (isVisible) {
    if (!visibleColumns.includes(key)) {
      visibleColumns.push(key);
    }
  } else {
    visibleColumns = visibleColumns.filter(k => k !== key);
  }
  const table = document.getElementById("customTable");
  const tbody = table.querySelector("tbody");
  if (tbody) tbody.innerHTML = "";
  buildTableHeader();
  buildTableBody();
}

function updateTableHeaderLabels() {
  const titleEl = document.getElementById("tableTitle");
  const total = tableData.length;
  const selectedCount = selectedRows.size;
  titleEl.textContent = `GeoJSON (Total: ${total}) (Selector: ${selectedCount})`;
}

function exportSelectedRowsToXLSX() {
  if (selectedRows.size === 0) {
    alert("No rows selected to export.");
    return;
  }

  const selectedItems = Array.from(selectedRows).map(idx => tableData[idx]);
  const activeCols = columns.filter(c => visibleColumns.includes(c.key));
  const header = ["Index", ...activeCols.map(c => c.label)];

  const dataRows = selectedItems.map((item, i) => {
    const row = [i + 1];
    activeCols.forEach(col => {
      row.push(item[col.key] != null ? item[col.key] : "");
    });
    return row;
  });

  const ws_data = [header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Selected Data");
  XLSX.writeFile(wb, "selected_rows.xlsx");
}

function exportAllRowsToXLSX() {
  if (!tableData || tableData.length === 0) {
    alert("No data to export.");
    return;
  }

  const activeCols = columns.filter(c => visibleColumns.includes(c.key));
  const header = ["Index", ...activeCols.map(c => c.label)];

  const dataRows = tableData.map((item, index) => {
    const row = [index + 1];
    activeCols.forEach(col => {
      row.push(item[col.key] != null ? item[col.key] : "");
    });
    return row;
  });

  const ws_data = [header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "All Data");
  XLSX.writeFile(wb, "all_data.xlsx");
}

function attachEventListeners() {
  document.getElementById("showHideColumnsBtn").addEventListener("click", toggleColumnsPanel);

  document.getElementById("columnsPanel").addEventListener("change", (e) => {
    if (e.target && e.target.type === "checkbox") {
      if (e.target.dataset.group) {
        const groupDiv = e.target.closest("div");
        const childCheckboxes = groupDiv.querySelectorAll("input[type='checkbox'][data-key]");
        childCheckboxes.forEach(childCheckbox => {
          childCheckbox.checked = e.target.checked;
          updateColumnVisibility(childCheckbox.dataset.key, e.target.checked);
        });
      } else if (e.target.dataset.key) {
        const key = e.target.dataset.key;
        updateColumnVisibility(key, e.target.checked);

        const groupDiv = e.target.closest("div").parentElement;
        if (groupDiv) {
          const groupCheckbox = groupDiv.querySelector("input[type='checkbox'][data-group]");
          if (groupCheckbox) {
            const childCheckboxes = groupDiv.querySelectorAll("input[type='checkbox'][data-key]");
            const allChecked = Array.from(childCheckboxes).every(cb => cb.checked);
            groupCheckbox.checked = allChecked;
          }
        }
      }
    }
  });

  document.getElementById("zoomToBtn").addEventListener("click", function () {
    const selectedIndices = Array.from(selectedRows);
    if (selectedIndices.length === 0) {
      showNotification("Ən azı bir əmlak seçin.", "warning");
      return;
    }

    const idx = selectedIndices[selectedIndices.length - 1];
    const property = tableData[idx];

    const view = window.activeView || window.view;
    if (!view || !view.goTo) {
      showNotification("Xəritə görünüşü hazır deyil.", "error");
      return;
    }

    if (typeof window.highlightSelectedProperty === "function") {
      window.highlightSelectedProperty(property);
    }

    if (typeof window.getOptimalZoomForProperty === "function") {
      const { target, zoom } = window.getOptimalZoomForProperty(property);

      if (!target) {
        showNotification("Seçilən əmlakın koordinatları yoxdur.", "warning");
        return;
      }

      const goToOptions = zoom ? { target, zoom } : { target };
      view.goTo(goToOptions).catch(() => {});
    }
  });

  document.getElementById("exportSelectedBtn").addEventListener("click", exportSelectedRowsToXLSX);
  document.getElementById("exportAllBtn").addEventListener("click", exportAllRowsToXLSX);

  attachRowCheckboxListeners();
}

function attachRowCheckboxListeners() {
  const selectAllEl = document.getElementById("selectAllRows");
  if (selectAllEl) {
    selectAllEl.addEventListener("change", function () {
      if (this.checked) {
        for (let i = 0; i < tableData.length; i++) {
          selectedRows.add(i);
        }
      } else {
        selectedRows.clear();
      }

      document.querySelectorAll(".row-checkbox").forEach(cb => {
        cb.checked = this.checked;
      });

      updateTableHeaderLabels();
      updateMapBasedOnSelection();
    });
  }

  document.querySelectorAll(".row-checkbox").forEach(cb => {
    cb.addEventListener("change", function () {
      const idx = parseInt(this.dataset.index, 10);
      if (this.checked) {
        selectedRows.add(idx);
      } else {
        selectedRows.delete(idx);
      }
      updateTableHeaderLabels();
      checkSelectAllState();
      updateMapBasedOnSelection();
    });
  });

  checkSelectAllState();
}

function checkSelectAllState() {
  const selectAllEl = document.getElementById("selectAllRows");
  if (!selectAllEl) return;

  const allSelected = tableData.length > 0 && tableData.every((_, i) => selectedRows.has(i));
  selectAllEl.checked = allSelected;
}

/**
 * Select all rows in the table and update the map to show all properties
 */
function selectAllTableRows() {
  if (tableData.length === 0) return;

  // Check all row checkboxes
  for (let i = 0; i < tableData.length; i++) {
    selectedRows.add(i);
  }

  // Update UI checkboxes
  const selectAllEl = document.getElementById("selectAllRows");
  if (selectAllEl) {
    selectAllEl.checked = true;
  }

  document.querySelectorAll(".row-checkbox").forEach(cb => {
    cb.checked = true;
  });

  updateTableHeaderLabels();
  updateMapBasedOnSelection();
}

/**
 * Update the map to show only selected properties
 * Renders only the properties that are checked in the table
 */
function updateMapBasedOnSelection() {
  if (!window.activeView) return;

  // Get selected properties
  const selectedIndices = Array.from(selectedRows);
  const selectedProperties = selectedIndices.map(idx => tableData[idx]).filter(p => p);

  // Render only selected properties on the map
  if (typeof window.renderProperties === "function") {
    window.renderProperties(selectedProperties);
  }
}

function toggleAdvancedTable(force) {
  const table = document.getElementById("advancedTableContainer");
  const map = document.getElementById("map");
  const buttons = document.getElementById("buttons");
  if (!table) return;

  const isHidden = table.style.display === "" || table.style.display === "none";

  const shouldShow = typeof force === "boolean" ? force : isHidden;

  if (shouldShow) {

    let currentTableHeight = getComputedStyle(document.documentElement)
      .getPropertyValue("--table-height")
      .trim();

    if (!currentTableHeight) {
      currentTableHeight = "300px";
      document.documentElement.style.setProperty("--table-height", currentTableHeight);
    }

    table.style.height = currentTableHeight;
    table.style.display = "block";

    if (map) map.classList.add("isTableShown");
    if (buttons) buttons.classList.add("isTableShown");

    // When table is opened, check all checkboxes
    selectAllTableRows();
  } else {
    table.style.display = "none";
    if (map) map.classList.remove("isTableShown");
    if (buttons) buttons.classList.remove("isTableShown");
  }

  if (window.activeView && typeof window.activeView.resize === "function") {
    setTimeout(() => {
      if (window.activeView && typeof window.activeView.resize === "function") {
        window.activeView.resize();
      }
    }, 100);
  }
}

function setupTableResize() {
  const container = document.getElementById("advancedTableContainer");
  const header = document.getElementById("tableHeader");
  if (!container || !header) return;

  let isDragging = false;
  let startY = 0;
  let startHeight = 0;

  header.style.cursor = "ns-resize";

  header.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    startY = e.clientY;
    startHeight = container.offsetHeight || 300;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dy = startY - e.clientY;
    let newHeight = startHeight + dy;
    const minHeight = 150;
    const maxHeight = window.innerHeight - 120;
    if (newHeight < minHeight) newHeight = minHeight;
    if (newHeight > maxHeight) newHeight = maxHeight;

    container.style.maxHeight = "none";
    container.style.height = `${newHeight}px`;

    document.documentElement.style.setProperty("--table-height", `${newHeight}px`);

    const map = document.getElementById("map");
    if (map) {
      map.classList.add("isTableShown");
    }

    if (window.activeView && typeof window.activeView.resize === "function") {
      window.activeView.resize();
    }
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = "";
  });
}
