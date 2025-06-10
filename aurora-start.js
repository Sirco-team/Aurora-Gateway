// aurora-start.js
(function(){
  // Find the internal container for the active tab.
  const container = document.getElementById("internal_" + activeTabId);
  if (!container) return;
  container.innerHTML = `
    <style>
      /* New Tab (Start) Page Styling */
      .new-tab-page { 
        position: relative; 
        width: 100%; 
        height: 100%; 
        background-color: #fff; 
      }
      .top-right { 
        position: absolute; 
        top: 10px; 
        right: 15px; 
        display: flex; 
        gap: 10px; 
      }
      .top-icon { 
        text-decoration: none; 
        color: #202124; 
        font-size: 14px; 
        line-height: 24px; 
      }
      .top-icon img { 
        width: 24px; 
        height: 24px; 
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
      .search-icons { 
        position: absolute; 
        right: 10px; 
        top: 50%; 
        transform: translateY(-50%); 
        display: flex; 
        gap: 10px; 
      }
      .search-icons img { 
        width: 24px; 
        height: 24px; 
        cursor: pointer; 
      }
      .shortcut-button { 
        margin-top: 20px;
      }
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
      <div class="top-right">
        <a href="#" class="top-icon">Gmail</a>
        <a href="#" class="top-icon">Images</a>
        <a href="#" class="top-icon"><img src="apps.svg" alt="Apps"></a>
        <a href="#" class="top-icon"><img src="profile.png" alt="Profile"></a>
      </div>
      <div class="center-content">
        <img src="aurora_logo.png" alt="Aurora" class="logo">
        <div class="search-container">
          <input type="text" id="newTabSearchInput" class="search-bar" placeholder="Search Aurora or type a URL">
          <div class="search-icons">
            <img src="mic.svg" alt="Mic">
            <img src="lens.svg" alt="Lens">
          </div>
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
    if (e.key === "Enter") {
      executeNewTabSearch();
    }
  });
  
  window.executeNewTabSearch = function() {
    let query = document.getElementById("newTabSearchInput").value.trim();
    if (!query) return;
    if (!/^https?:\/\//i.test(query) && query.indexOf('.') === -1) {
      query = "https://duckduckgo.com/?q=" + encodeURIComponent(query);
    } else if (!/^https?:\/\//i.test(query)) {
      query = "http://" + query;
    }
    if (typeof loadActiveTabExternal === "function") {
      loadActiveTabExternal(query);
    }
  };
  
  window.auroraFeelingLucky = function() {
    executeNewTabSearch();
  };
  
  window.addShortcut = function() {
    alert("Add shortcut functionality coming soon!");
  };
})();
