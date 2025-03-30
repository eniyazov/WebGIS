/***********************************************************
 * Example usage: 
 *   After you fetch your data from the server and store it 
 *   in an array called "data", call initCustomTable(data).
 ***********************************************************/

let tableData = [];        // Will hold all your property data
let currentPage = 1;       // Current page in the pagination
const pageSize = 10;       // Rows per page
let visibleColumns = [];   // Which columns are currently visible
let selectedRows = new Set(); // Keep track of selected row indices
let currentSortColumn = null; // key of the column currently sorted
let currentSortOrder = 'asc'; // 'asc' or 'desc'
let allTableData = [];



// Define columns with grouping. 
// "group" is the higher-level label, "label" is the column heading, and "key" is the property key.
const columns = [
  { group: "Building details", label: "Owner",            key: "owner",         sortType: "string"  },
  { group: "Building details", label: "Special Code",     key: "special_co",    sortType: "numeric" },
  { group: "Building details", label: "Name",             key: "property_n",    sortType: "string"  },
  { group: "Building details", label: "Project",          key: "project",       sortType: "string"  },
  { group: "Building details", label: "City",             key: "city",          sortType: "string"  },
  { group: "Building details", label: "Address",          key: "street",        sortType: "string"  },
  { group: "Building details", label: "Type",             key: "property_t",    sortType: "string"  },
  { group: "Building details", label: "Use Type",         key: "use_type",      sortType: "string"  },
  { group: "Land & Area Info", label: "Total Area (m²)",  key: "total_area",    sortType: "numeric"  },
  { group: "Land & Area Info", label: "Land Area (ha)",   key: "land_area",     sortType: "numeric"  },
  { group: "Land & Area Info", label: "Operant",          key: "rent_opera",    sortType: "string"  },
  { group: "Land & Area Info", label: "Attachments",      key: "attachment",    sortType: "string"  }
];

// Initialize the table after data is fetched
function initCustomTable(data) {
  allTableData = data;         // store original data
  tableData = data;
  // By default, make all columns visible
  visibleColumns = columns.map(col => col.key);
  
  buildTableHeader();
  buildTableBody();
  buildPagination();
  buildColumnPanel();
  buildFilterSection();  // Build the filter UI (hidden by default)
  updateTableHeaderLabels();
  attachEventListeners();
}

function updateCustomTable(filteredData) {
  // if (visibleColumns.length === 0) {
  //   visibleColumns = columns.map(col => col.key);
  // }
    tableData = filteredData;
    currentPage = 1;
    buildTableBody();
    buildPagination();
    updateTableHeaderLabels();
    attachRowCheckboxListeners();
  }

  function sortByColumn(key, sortType) {
    // Toggle sort order if the same column is clicked
    if (currentSortColumn === key) {
      currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      currentSortColumn = key;
      currentSortOrder = 'asc';
    }
    
    tableData.sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      // Handle null or undefined values
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      
      if (sortType === 'numeric') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
        return currentSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      } else {
        // For strings: case-insensitive comparison
        aVal = aVal.toString().toLowerCase();
        bVal = bVal.toString().toLowerCase();
        if (aVal < bVal) return currentSortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSortOrder === 'asc' ? 1 : -1;
        return 0;
      }
    });
    
    // Reset to the first page and rebuild the table
    currentPage = 1;
    buildTableHeader(); // so the sort indicator is updated
    buildTableBody();
    buildPagination();
  }
  
  

// Build the grouped table header with two rows:
// 1) Groups (spanning multiple columns)
// 2) Actual column labels
function buildTableHeader() {
  const table = document.getElementById("customTable");
  table.innerHTML = ""; // Clear any existing content

  // Create THEAD element
  const thead = document.createElement("thead");

  // First row for groups
  const groupRow = document.createElement("tr");
  // First cell in group row is for the "Select All" checkbox (rowspan=2)
  const selectAllTh = document.createElement("th");
  selectAllTh.setAttribute("rowspan", "2");
  selectAllTh.style.textAlign = "center";
  selectAllTh.innerHTML = `<input type="checkbox" id="selectAllRows" />`;
  groupRow.appendChild(selectAllTh);

  // Compute group order and count visible columns per group
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

  // For each group, add a header cell only if there is at least one visible column
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

  // Second row for individual column labels with sort capability
  const labelRow = document.createElement("tr");
  columns.forEach(col => {
    const th = document.createElement("th");
    th.id = "colheader_" + col.key; // For toggling visibility
    th.style.textAlign = "center";
    
    // Build label with sort indicator if applicable
    let label = col.label;
    if (col.key === currentSortColumn) {
      label += currentSortOrder === 'asc' ? " ▲" : " ▼";
    }
    th.innerText = label;
    
    // Hide the header cell if the column is not visible
    if (!visibleColumns.includes(col.key)) {
      th.style.display = "none";
    }
    
    // Add a click listener to sort the table when this header is clicked
    th.addEventListener("click", function() {
      sortByColumn(col.key, col.sortType || "string");
    });
    
    labelRow.appendChild(th);
  });
  thead.appendChild(labelRow);

  table.appendChild(thead);
}



// Build table body based on current page and visible columns
function buildTableBody() {
  const table = document.getElementById("customTable");
  // Remove existing <tbody> if any
  const oldTbody = table.querySelector("tbody");
  if (oldTbody) table.removeChild(oldTbody);

  const tbody = document.createElement("tbody");

  // Determine slice of data for the current page
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageData = tableData.slice(startIdx, endIdx);

  pageData.forEach((item, rowIndex) => {
    const tr = document.createElement("tr");
    // The absolute index in the full data array
    const absoluteIndex = startIdx + rowIndex;

    // First cell: row checkbox
    const selectTd = document.createElement("td");
    selectTd.style.textAlign = "center";
    selectTd.innerHTML = `
      <input type="checkbox" class="row-checkbox" data-index="${absoluteIndex}" 
        ${selectedRows.has(absoluteIndex) ? "checked" : ""} />
    `;
    tr.appendChild(selectTd);

    // Build cells for each column
    columns.forEach(col => {
      const td = document.createElement("td");
      td.id = "col_" + col.key;  // For show/hide
      td.style.textAlign = "center";
      // Only fill the text if the column is visible
      if (visibleColumns.includes(col.key)) {
        // Show content
        td.style.display = "";
        td.textContent = item[col.key] !== null && item[col.key] !== undefined
                         ? item[col.key]
                         : "";
      } else {
        // Hide the cell
        td.style.display = "none";
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  // IMPORTANT: Re-attach row checkbox listeners (including “select all”) 
  attachRowCheckboxListeners();
}

// Build or update pagination controls
function buildPagination() {
  const totalPages = Math.ceil(tableData.length / pageSize);
  const pageInfo = document.getElementById("pageInfo");
  pageInfo.textContent = `Page ${currentPage} of ${totalPages === 0 ? 1 : totalPages}`;

  // Enable/disable buttons
  document.getElementById("prevPageBtn").disabled = (currentPage <= 1);
  document.getElementById("nextPageBtn").disabled = (currentPage >= totalPages || totalPages === 0);
}

// Move to the previous page
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    buildTableBody();
    buildPagination();
  }
}

// Move to the next page
function nextPage() {
  const totalPages = Math.ceil(tableData.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    buildTableBody();
    buildPagination();
  }
}

// Build the show/hide columns panel
function buildColumnPanel() {
  const panel = document.getElementById("columnsPanel");
  panel.innerHTML = ""; // Clear existing content
  
  // Set panel to have a scroll if content overflows
  panel.style.maxHeight = "200px"; // Adjust as needed
  panel.style.overflowY = "auto";

  // Group columns by group name
  const groupMap = {};
  columns.forEach(col => {
    if (!groupMap[col.group]) {
      groupMap[col.group] = [];
    }
    groupMap[col.group].push(col);
  });

  // Create a panel entry for each group
  for (const group in groupMap) {
    // Group container
    const groupDiv = document.createElement("div");
    groupDiv.style.marginBottom = "10px";

    // Parent checkbox for the group
    const groupLabel = document.createElement("label");
    groupLabel.style.fontWeight = "bold";
    const groupCheckbox = document.createElement("input");
    groupCheckbox.type = "checkbox";
    // Check if all columns in the group are visible
    groupCheckbox.checked = groupMap[group].every(col => visibleColumns.includes(col.key));
    groupCheckbox.dataset.group = group; // mark as group-level
    groupCheckbox.style.marginRight = "5px";
    groupLabel.appendChild(groupCheckbox);
    groupLabel.appendChild(document.createTextNode(group));
    groupDiv.appendChild(groupLabel);

    // Container for child checkboxes
    const childContainer = document.createElement("div");
    childContainer.style.marginLeft = "20px";
    groupMap[group].forEach(col => {
      const childLabel = document.createElement("label");
      childLabel.style.display = "block";
      childLabel.style.marginBottom = "5px";

      const childCheckbox = document.createElement("input");
      childCheckbox.type = "checkbox";
      childCheckbox.checked = visibleColumns.includes(col.key);
      childCheckbox.dataset.key = col.key;  // mark as individual column
      childCheckbox.style.marginRight = "5px";

      childLabel.appendChild(childCheckbox);
      childLabel.appendChild(document.createTextNode(col.label));
      childContainer.appendChild(childLabel);
    });
    groupDiv.appendChild(childContainer);
    panel.appendChild(groupDiv);
  }
}




/////////////////
function buildFilterSection() {
  let filterSection = document.getElementById("filterSection");
  if (!filterSection) {
    filterSection = document.createElement("div");
    filterSection.id = "filterSection";
    filterSection.style.display = "none";
    filterSection.style.border = "1px solid #ccc";
    filterSection.style.padding = "10px";
    filterSection.style.marginTop = "5px";
    // Append the filter section just below the table header
    const advancedTableContainer = document.getElementById("advancedTableContainer");
    advancedTableContainer.insertBefore(filterSection, advancedTableContainer.childNodes[1]);
  }
  filterSection.innerHTML = "";
  
  // Global operator selection (AND/OR)
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
  
  // Container for filter lines
  const linesContainer = document.createElement("div");
  linesContainer.id = "filterLinesContainer";
  filterSection.appendChild(linesContainer);
  
  // "Add Filter" button
  const addLineBtn = document.createElement("button");
  addLineBtn.id = "addFilterLineBtn";
  addLineBtn.textContent = "Add Filter";
  addLineBtn.addEventListener("click", addFilterLine);
  filterSection.appendChild(addLineBtn);
  
  // "Apply Filter" button
  const applyBtn = document.createElement("button");
  applyBtn.id = "applyFiltersBtn";
  applyBtn.textContent = "Apply Filter";
  applyBtn.addEventListener("click", applyFiltersFromUI);
  filterSection.appendChild(applyBtn);
  
  // "Clear Filter" button
  const clearBtn = document.createElement("button");
  clearBtn.id = "clearFiltersBtn";
  clearBtn.textContent = "Clear Filter";
  clearBtn.addEventListener("click", function() {
    // Clear filter lines
    document.getElementById("filterLinesContainer").innerHTML = "";
    // Reset tableData to full data and rebuild table
    tableData = allTableData;
    currentPage = 1;
    buildTableHeader();
    buildTableBody();
    buildPagination();
    updateTableHeaderLabels();
  });
  filterSection.appendChild(clearBtn);
}



function addFilterLine() {
  const container = document.getElementById("filterLinesContainer");
  const lineDiv = document.createElement("div");
  lineDiv.className = "filterLine";
  lineDiv.style.marginBottom = "5px";
  
  // Column selector
  const colSelect = document.createElement("select");
  colSelect.className = "filterColumn";
  columns.forEach(col => {
    const option = document.createElement("option");
    option.value = col.key;
    option.textContent = col.label;
    colSelect.appendChild(option);
  });
  lineDiv.appendChild(colSelect);
  
  // Operator selector
  const opSelect = document.createElement("select");
  opSelect.className = "filterOperator";
  updateOperatorOptions(colSelect.value, opSelect);
  // Update operator options when column changes
  colSelect.addEventListener("change", function() {
    updateOperatorOptions(this.value, opSelect);
  });
  lineDiv.appendChild(opSelect);
  
  // Value input
  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.className = "filterValue";
  lineDiv.appendChild(valueInput);
  
  // Delete button for this filter line
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", function() {
    container.removeChild(lineDiv);
    // Automatically reapply filters when a line is deleted
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
  const filterLines = document.querySelectorAll('.filterLine');
  const rules = [];
  filterLines.forEach(line => {
    const columnKey = line.querySelector('.filterColumn').value;
    const operator = line.querySelector('.filterOperator').value;
    const value = line.querySelector('.filterValue').value.trim();
    if (columnKey && operator && value !== "") {
      rules.push({ columnKey, operator, value });
    }
  });
  
  const combineOperator = document.getElementById('filterCombineOperator').value;
  const filteredData = window.allTableData.filter(item => {
    const evaluations = rules.map(rule => {
      const colDef = columns.find(c => c.key === rule.columnKey);
      const propVal = item[rule.columnKey];
      if (colDef) {
        if (colDef.sortType === 'numeric') {
          const numPropVal = parseFloat(propVal) || 0;
          const numRuleVal = parseFloat(rule.value) || 0;
          switch(rule.operator) {
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
          switch(rule.operator) {
            case "contains": return strPropVal.includes(ruleVal);
            case "starts with": return strPropVal.startsWith(ruleVal);
            case "ends with": return strPropVal.endsWith(ruleVal);
            default: return false;
          }
        }
      }
      return false;
    });
    if (combineOperator === 'and') {
      return evaluations.every(e => e);
    } else {
      return evaluations.some(e => e);
    }
  });
  
  // Update the table data and rebuild the table
  tableData = filteredData;
  currentPage = 1;
  buildTableHeader();
  buildTableBody();
  buildPagination();
  updateTableHeaderLabels();
  
  // Update the map to display only the filtered properties.
  if (typeof renderProperties === "function") {
    renderProperties(filteredData);
  }
}




////////////////


// Show or hide the columns panel
function toggleColumnsPanel() {
  const panel = document.getElementById("columnsPanel");
  if (panel.style.display === "none" || panel.style.display === "") {
    // Position it near the button (optional)
    const btn = document.getElementById("showHideColumnsBtn");
    const rect = btn.getBoundingClientRect();
    panel.style.top = rect.bottom + "px";
    panel.style.left = rect.left + "px";
    panel.style.display = "block";
  } else {
    panel.style.display = "none";
  }
}

// Update the visibleColumns array and hide/show columns in the table
function updateColumnVisibility(key, isVisible) {
  if (isVisible) {
    if (!visibleColumns.includes(key)) {
      visibleColumns.push(key);
    }
  } else {
    visibleColumns = visibleColumns.filter(k => k !== key);
  }
  // Rebuild the header to update both individual header cells and group headers
  buildTableHeader();
  // Rebuild table body to reflect the change in visible columns
  buildTableBody();
}



// Update table header label with total count and selected count
function updateTableHeaderLabels() {
  const titleEl = document.getElementById("tableTitle");
  // “GeoJSON (Total: X) (Selector: Y)”
  const total = tableData.length;
  const selectedCount = selectedRows.size;
  titleEl.textContent = `GeoJSON (Total: ${total}) (Selector: ${selectedCount})`;
}

function exportSelectedRowsToXLSX() {
    if (selectedRows.size === 0) {
      alert("No rows selected to export.");
      return;
    }
  
    // Build an array of selected items
    const selectedItems = Array.from(selectedRows).map(idx => tableData[idx]);
    // Only include the columns that are currently visible
    const activeCols = columns.filter(c => visibleColumns.includes(c.key));
    const header = ["Index", ...activeCols.map(c => c.label)];
  
    const dataRows = selectedItems.map((item, i) => {
      const row = [i + 1];
      activeCols.forEach(col => {
        row.push(item[col.key] != null ? item[col.key] : "");
      });
      return row;
    });
  
    // Create worksheet and workbook
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
    
    // Use the columns that are visible (or adjust if you want all columns)
    const activeCols = columns.filter(c => visibleColumns.includes(c.key));
    const header = ["Index", ...activeCols.map(c => c.label)];
    
    const dataRows = tableData.map((item, index) => {
      const row = [index + 1];
      activeCols.forEach(col => {
        row.push(item[col.key] != null ? item[col.key] : "");
      });
      return row;
    });
    
    // Build the array of arrays (aoa) for the sheet
    const ws_data = [header, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Data");
    XLSX.writeFile(wb, "all_data.xlsx");
  }
  
  

// Attach event listeners (pagination, show/hide columns, select all, row checkboxes, etc.)
function attachEventListeners() {
  // Show/hide columns button
  document.getElementById("showHideColumnsBtn").addEventListener("click", toggleColumnsPanel);

  // Listen for changes in the columns panel checkboxes
  document.getElementById("columnsPanel").addEventListener("change", (e) => {
    if (e.target && e.target.type === "checkbox") {
      // If it's a group (parent) checkbox
      if (e.target.dataset.group) {
        const groupName = e.target.dataset.group;
        // Find the container holding the child checkboxes for this group
        const groupDiv = e.target.closest("div");
        const childCheckboxes = groupDiv.querySelectorAll("input[type='checkbox'][data-key]");
        childCheckboxes.forEach(childCheckbox => {
          childCheckbox.checked = e.target.checked;
          updateColumnVisibility(childCheckbox.dataset.key, e.target.checked);
        });
      }
      // If it's an individual column (child) checkbox
      else if (e.target.dataset.key) {
        const key = e.target.dataset.key;
        updateColumnVisibility(key, e.target.checked);
        
        // Update the parent group checkbox state
        const groupDiv = e.target.closest("div").parentElement; // Container that holds the parent checkbox and children
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
  

  // Filter
  document.getElementById("filterBtn").addEventListener("click", function() {
    const filterSection = document.getElementById("filterSection");
    if (filterSection.style.display === "none" || filterSection.style.display === "") {
      filterSection.style.display = "block";
    } else {
      filterSection.style.display = "none";
    }
  });  

  // Pagination
  document.getElementById("prevPageBtn").addEventListener("click", () => {
    prevPage();
    // re-check row checkboxes as needed
    attachRowCheckboxListeners();
  });
  document.getElementById("nextPageBtn").addEventListener("click", () => {
    nextPage();
    // re-check row checkboxes as needed
    attachRowCheckboxListeners();
  });

  // Attach event listener to the "Zoom to" button
document.getElementById("zoomToBtn").addEventListener("click", function() {
  // Get the selected row indices (assuming selectedRows is a Set holding the indices)
  const selectedIndices = Array.from(selectedRows);
  if (selectedIndices.length === 0) {
    alert("Please select at least one property.");
    return;
  }
  
  // For this example, we zoom to the first selected property.
  const idx = selectedIndices[0];
  const property = tableData[idx]; // correct

  // Check if the property has polygon geometry
  if (property.geometry_coordinates && property.geometry_coordinates.length > 0) {
    const coords = property.geometry_coordinates[0][0];
    const polygon = new window.Polygon({
      rings: coords,
      spatialReference: { wkid: 4326 }
    });
    window.view.goTo({ target: polygon, zoom: 16 }).catch(err => console.error("Error zooming:", err));
  }
  // Otherwise, if the property has a point geometry
  else if (property.coord_point) {
    const [longitude, latitude] = property.coord_point;
    const point = new window.Point({
      longitude: longitude,
      latitude: latitude
    });
    window.view.goTo({ target: point, zoom: 16 }).catch(err => console.error("Error zooming:", err));
  }
  else {
    alert("Selected property does not have valid geometry.");
  }
});


  // Export button
  document.getElementById("exportSelectedBtn").addEventListener("click", exportSelectedRowsToXLSX);

  document.getElementById("exportAllBtn").addEventListener("click", exportAllRowsToXLSX);


  // Listen for table-level events after table is built
  attachRowCheckboxListeners();
}

// This should be called each time we rebuild the <tbody> 
// so that row checkboxes and the “Select All” checkbox stay in sync
function attachRowCheckboxListeners() {
  // "Select all" in the header
  const selectAllEl = document.getElementById("selectAllRows");
  if (selectAllEl) {
    selectAllEl.addEventListener("change", function() {
      // Determine which rows are currently on this page
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, tableData.length);

      if (this.checked) {
        // Add them all to selectedRows
        for (let i = startIdx; i < endIdx; i++) {
          selectedRows.add(i);
        }
      } else {
        // Remove them from selectedRows
        for (let i = startIdx; i < endIdx; i++) {
          selectedRows.delete(i);
        }
      }
      // Re-check all row checkboxes
      document.querySelectorAll(".row-checkbox").forEach(cb => {
        cb.checked = selectAllEl.checked;
      });
      updateTableHeaderLabels();
    });
  }

  // Individual row checkboxes
  document.querySelectorAll(".row-checkbox").forEach(cb => {
    cb.addEventListener("change", function() {
      const idx = parseInt(this.dataset.index, 10);
      if (this.checked) {
        selectedRows.add(idx);
      } else {
        selectedRows.delete(idx);
      }
      updateTableHeaderLabels();
      // If any row is unchecked, uncheck "select all"
      // If all rows on this page are checked, check "select all"
      checkSelectAllState();
    });
  });
  // After setting up listeners, ensure the "select all" is correct
  checkSelectAllState();
}

// Check if all rows on the current page are selected; if so, check "selectAllRows"
function checkSelectAllState() {
  const selectAllEl = document.getElementById("selectAllRows");
  if (!selectAllEl) return;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, tableData.length);

  let allSelected = true;
  for (let i = startIdx; i < endIdx; i++) {
    if (!selectedRows.has(i)) {
      allSelected = false;
      break;
    }
  }
  selectAllEl.checked = allSelected;
}

function toggleAdvancedTable() {
    const container = document.getElementById("advancedTableContainer");
    if (container.style.display === "none" || container.style.display === "") {
      container.style.display = "block";
    } else {
      container.style.display = "none";
    }
  }
  

// Example: call initCustomTable after fetching data
// fetch("http://localhost:5010/properties")
//   .then(res => res.json())
//   .then(data => {
//     // Suppose your data has keys that match the columns above
//     initCustomTable(data);
//   })
//   .catch(err => console.error(err));
