// controls.js

// Toggle the visibility of the layer list panel only if the click event
// originates from the toggle icon (#ToggleBtn) or the close button (.close-btn)
window.toggleLayerList = function (event) {
    // Only proceed if the event target (or one of its ancestors) is allowed.
    if (!event.target.closest('#ToggleBtn') && !event.target.closest('.close-btn')) {
      return;
    }
  
    const layerList = document.querySelector('.layer-list');
    if (layerList.classList.contains("show")) {
      // Hide the panel.
      layerList.classList.remove("show");
      setTimeout(() => {
        layerList.style.display = "none";
      }, 300); // Adjust delay to match your CSS transition duration.
    } else {
      // Show the panel.
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
        childrenCheckboxes.forEach(function(child) {
          child.checked = checkbox.checked;
        });
      }
    }
    // Update the parent's state (and recursively, its ancestors).
    updateParentCheckbox(checkbox);
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
          let allChecked = Array.from(childCheckboxes).every(function(cb) {
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
  
//   // Toggle the visibility of the attribute table
// window.toggleAttribTable = function(e) {
//   e.preventDefault(); // Prevent default anchor behavior
//   const tableDiv = document.getElementById("tableDiv");
//   if (!tableDiv) return;
//   // Toggle display style between "block" and "none"
//   if (tableDiv.style.display === "none" || tableDiv.style.display === "") {
//     tableDiv.style.display = "block";
//   } else {
//     tableDiv.style.display = "none";
//   }
// };

// // Attach the toggle event when the DOM is fully loaded
// document.addEventListener("DOMContentLoaded", function() {
//   const attribTableToggle = document.querySelector(".attrib-table");
//   if (attribTableToggle) {
//     attribTableToggle.addEventListener("click", window.toggleAttribTable);
//   }
// });


