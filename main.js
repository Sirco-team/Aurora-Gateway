// main.js

// Helper to dynamically load an external script (e.g. aurora-start.js)
function loadAuroraScript(scriptName) {
  const oldScript = document.getElementById("auroraScript");
  if (oldScript) oldScript.remove();
  const script = document.createElement("script");
  script.id = "auroraScript";
  script.src = "/" + scriptName;
  document.body.appendChild(script);
  script.onload = () => {
    console.log(scriptName + " loaded");
  };
}

// On window load, clear the document and load the start page.
window.addEventListener("load", () => {
  // Clear all existing content so the start page occupies the entire document.
  document.body.innerHTML = "";
  loadAuroraScript("aurora-start.js");
});
