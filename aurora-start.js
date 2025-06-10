// aurora-start.js
(function(){
  var activeId = window.activeTabId;
  if (!activeId) {
    console.error("activeTabId is not defined. Cannot load Aurora start page.");
    return;
  }
  var container = document.getElementById("internal_" + activeId);
  if (!container) {
    console.error("Internal container not found for activeTabId: " + activeId);
    return;
  }
  container.innerHTML = `
    <style>
      /* New Tab (Start) Page Styling */
      .new-tab-page { 
        position: relative; 
        width: 100%; 
        height: 100%; 
        background-color: #fff; 
      }
      .center-content { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        height: 100%; 
      }
      .logo { 
        height: 80px; 
        margin-bottom: 30px; 
      }
      .search-container { 
        position: relative; 
        width: 100%; 
        max-width: 600px; 
      }
      .search-bar { 
        width: 100%; 
        padding: 14px 60px 14px 20px; 
        font-size: 18px; 
        border: 1px solid #dfe1e5; 
        border-radius: 24px; 
        outline: none; 
      }
      .shortcut-button { margin-top: 20px; }
      .shortcut-button button { 
        padding: 8px 16px; 
        font-size: 14px; 
        background-color: #f8f9fa; 
        border: 1px solid #dadce0; 
        border-radius: 4px; 
        cursor: pointer; 
      }
      .bottom-right { 
        position: absolute; 
        bottom: 10px; 
        right: 10px; 
      }
      .customize-btn { 
        padding: 6px 12px; 
        font-size: 12px; 
        color: #202124; 
        background-color: #fff; 
        border: 1px solid #dadce0; 
        border-radius: 4px; 
        cursor: pointer; 
      }
    </style>
    <div class="new-tab-page">
      <div class="center-content">
        <img src="aurora_logo.png" alt="Aurora" class="logo">
        <div class="search-container">
          <input type="text" id="newTabSearchInput" class="search-bar" placeholder="Search Aurora or type a URL">
        </div>
        <div class="shortcut-button">
          <button onclick="addShortcut()">+ Add shortcut</button>
        </div>
      </div>
      <div class="bottom-right">
        <button class="customize-btn">Customize Aurora</button>
      </div>
    </div>
  `;
  
  document.getElementById("newTabSearchInput").addEventListener("keypress", function(e) {
    if(e.key === "Enter"){ executeNewTabSearch(); }
  });
  
  window.executeNewTabSearch = function() {
    var query = document.getElementById("newTabSearchInput").value.trim();
    if (!query) return;
    if (!/^https?:\/\//i.test(query) && query.indexOf('.') === -1) {
      query = "https://duckduckgo.com/?q=" + encodeURIComponent(query);
    } else if (!/^https?:\/\//i.test(query)) {
      query = "http://" + query;
    }
    if (typeof loadActiveTab === "function") {
      loadActiveTab(query);
    }
  };
  window.auroraFeelingLucky = function() { executeNewTabSearch(); };
  window.addShortcut = function() { alert("Add shortcut functionality coming soon!"); };
})();
