// controls.js

window.toggleLayerList = function (event) {
  if (!event.target.closest('#ToggleBtn') && !event.target.closest('.close-btn')) {
    return;
  }

  const layerList = document.querySelector('.layer-list');
  if (!layerList) return;

  const isShown = layerList.classList.contains("show");

  if (isShown) {
    layerList.classList.remove("show");
    setTimeout(() => {
      layerList.style.display = "none";
    }, 300); 
  } else {
    if (window.closeAllPanels) window.closeAllPanels("layers");

    layerList.style.display = "block";
    setTimeout(() => {
      layerList.classList.add("show");
    }, 10);
  }
};


// Toggle nested layer groups (expand/collapse nested lists)
window.toggleNested = function (id, el, event) {
  event.stopPropagation(); // Prevent the click from bubbling up.
  const nested = document.getElementById(id);
  if (nested.classList.contains("show")) {
    nested.classList.remove("show");
    el.textContent = "▶"; // Arrow points right when collapsed.
  } else {
    nested.classList.add("show");
    el.textContent = "▼"; // Arrow points down when expanded.
  }
};

// Handle Filter Change (Type vs Owner)
window.handleFilterChange = function (event) {
  const filterBy = event.target.value;
  const groupedList = document.getElementById("groupedLayerList");
  const staticList = document.getElementById("staticLayerList");

  if (!groupedList || !staticList) return;

  // Clear all checkboxes
  document.querySelectorAll(".layer-list input[type='checkbox']").forEach((cb) => (cb.checked = false));

  // Clear map and table
  if (window.activeView) window.activeView.graphics.removeAll();
  if (window.updateCustomTable) window.updateCustomTable([]);
  window.allTableData = [];

  // Toggle visibility based on filter type
  if (filterBy === "owner") {
    groupedList.style.display = "block";
    staticList.style.display = "none";

    // Əgər groupedList boşdursa, preloadGroups çağır
    if (groupedList.children.length === 0 && window.preloadGroups) {
      console.log('Owner filter seçildi, grouped layers yüklənir...');
      window.preloadGroups();
    }
  } else {
    groupedList.style.display = "none";
    staticList.style.display = "block";
  }
};

// Toggle checkboxes within nested groups so that:
// - When a parent checkbox is toggled, all its children are set to the same state.
// - When a child checkbox is toggled, it updates the parent (and recursively the ancestors)
//   so that if all children become checked, the parent becomes checked; if any child is unchecked,
//   the parent (and its ancestors) become unchecked.
window.toggleCheckbox = function (childContainerId, checkbox, event) {
  event.stopPropagation();

  // If a container ID is provided, propagate the parent's state to all child checkboxes.
  if (childContainerId) {
    let container = document.getElementById(childContainerId);
    if (container && container.tagName !== 'INPUT') {
      const childrenCheckboxes = container.querySelectorAll('input[type="checkbox"]');
      childrenCheckboxes.forEach(function (child) {
        child.checked = checkbox.checked;
      });
    }
  }
  // Update the parent's state (and recursively, its ancestors).
  updateParentCheckbox(checkbox);

  // Update map and table based on selected layers
  if (typeof window.updateMapProperties === "function") {
    window.updateMapProperties();
  }
};

// Recursively update the parent's checkbox state.
// It sets the parent's checkbox to checked if and only if all of its child checkboxes are checked.
// Then, it recursively updates the parent's parent.
function updateParentCheckbox(childCheckbox) {
  let nestedContainer = childCheckbox.closest('.nested');
  if (nestedContainer) {
    let parentLayerItem = nestedContainer.previousElementSibling;
    if (parentLayerItem) {
      let parentCheckbox = parentLayerItem.querySelector('input[type="checkbox"]');
      if (parentCheckbox) {
        let childCheckboxes = nestedContainer.querySelectorAll('input[type="checkbox"]');
        // Use Array.every() to check if every child is checked.
        let allChecked = Array.from(childCheckboxes).every(function (cb) {
          return cb.checked;
        });
        // Set parent's checkbox based on the status of all child checkboxes.
        parentCheckbox.checked = allChecked;
        // Recursively update parent's parent's state.
        updateParentCheckbox(parentCheckbox);
      }
    }
  }
}


