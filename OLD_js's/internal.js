// internal.js

function loadInternalPageForTab(tabId, cmd) {
  const container = document.getElementById("internal_" + tabId);
  if (!container) return;
  if (cmd.toLowerCase() === "start") {
    loadAuroraScript("aurora-start.js");
  } else {
    container.innerHTML = `<div class="aurora-page"><h2>Unknown Aurora Command</h2><p>${cmd}</p></div>`;
  }
}

function loadAuroraScript(scriptName) {
  const oldScript = document.getElementById("auroraScript");
  if (oldScript) oldScript.remove();
  const script = document.createElement("script");
  script.id = "auroraScript";
  script.src = "/" + scriptName;
  script.onload = () => { console.log(scriptName + " loaded"); };
  document.body.appendChild(script);
}

window.loadInternalPageForTab = loadInternalPageForTab;
window.loadAuroraScript = loadAuroraScript;
