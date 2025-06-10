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
        width: 520px; 
        min-height: 420px; 
        background: rgba(255,255,255,0.95); 
        border-radius: 32px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 48px auto;
        padding: 48px 40px 40px 40px;
      }
      .center-content { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        width: 100%;
      }
      .logo { 
        height: 120px; 
        margin-bottom: 36px; 
        filter: drop-shadow(0 0 24px #00ffe7cc);
      }
      .search-container { 
        position: relative; 
        width: 100%; 
        max-width: 420px; 
        margin-bottom: 32px;
      }
      .search-bar { 
        width: 100%; 
        padding: 22px 70px 22px 28px; 
        font-size: 1.5rem; 
        border: 1.5px solid #dfe1e5; 
        border-radius: 32px; 
        outline: none; 
        box-shadow: 0 2px 16px 0 #00ffe733;
      }
      .shortcut-button { margin-top: 28px; }
      .shortcut-button button { 
        padding: 14px 32px; 
        font-size: 1.1rem; 
        background: linear-gradient(135deg, #00ffe7 0%, #3a86ff 100%);
        color: #181c2b;
        border: none;
        border-radius: 24px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 16px 0 #00ffe799;
        transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
      }
      .shortcut-button button:hover {
        background: linear-gradient(135deg, #3a86ff 0%, #00ffe7 100%);
        color: #232946;
        transform: translateY(-2px) scale(1.04);
        box-shadow: 0 4px 24px 0 #00ffe7cc;
      }
      .bottom-right { 
        position: absolute; 
        bottom: 24px; 
        right: 32px; 
      }
      .customize-btn { 
        padding: 12px 28px; 
        font-size: 1.1rem; 
        color: #202124; 
        background: #fff; 
        border: 1.5px solid #dadce0; 
        border-radius: 24px; 
        cursor: pointer; 
        font-weight: 600;
        box-shadow: 0 2px 16px 0 #00ffe733;
        transition: background 0.2s, color 0.2s;
      }
      .customize-btn:hover {
        background: #e8eaed;
        color: #232946;
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
