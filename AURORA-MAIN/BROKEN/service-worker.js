function getInterceptorScript(originalUrl, proxyBase, proxyId) {
  return `<script>
(function() {
  const __ORIGINAL_URL = "${originalUrl}";
  const __PROXY_BASE = "${proxyBase}";
  const __PROXY_ID = "${proxyId}";
  
  try {
    const origReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      try { return origReplaceState.apply(history, args); }
      catch (error) { console.warn("Blocked history.replaceState:", error); }
    };
  } catch(e) { }
  
  function handleNavigation(url) {
    if (
      url.startsWith("https://corsproxy.io/") ||
      url.startsWith("https://cors-anywhere.herokuapp.com/") ||
      url.startsWith("https://thingproxy.freeboard.io/fetch/")
    ) {
      try {
        const u = new URL(url);
        const orig = u.searchParams.get("url");
        if (orig) { url = orig; }
      } catch(e) { }
    }
    if (!/^https?:\\/\\//i.test(url)) {
      try { url = new URL(url, __ORIGINAL_URL).href; }
      catch(e) { }
    }
    // Always redirect to the proxy page in /p/
    var newUrl = window.location.origin + "/p/?proxy=" + __PROXY_ID + "&url=" + encodeURIComponent(url);
    const settings = getQueryParam("settings");
    if (settings) { newUrl += "&settings=" + encodeURIComponent(settings); }
    window.location.href = newUrl;
  }
  
  window.location.assign = function(url) { handleNavigation(url); };
  window.location.replace = function(url) { handleNavigation(url); };
  window.open = function(url, name, specs) { handleNavigation(url); return null; };
  
  document.addEventListener("click", function(e) {
    const anchor = e.target.closest("a");
    if (anchor && anchor.getAttribute("href")) {
      e.preventDefault();
      handleNavigation(anchor.href);
      return;
    }
    const button = e.target.closest("button");
    if (button) {
      const onclickAttr = button.getAttribute("onclick");
      if (onclickAttr && /location\\.href\\s*=\\s*["'][^"']+["']/i.test(onclickAttr)) {
        e.preventDefault();
        const match = onclickAttr.match(/location\\.href\\s*=\\s*["']([^"']+)["']/i);
        if (match && match[1]) { handleNavigation(match[1]); return; }
      }
    }
  }, true);
  
  // Override fetch: for relative URLs, resolve them against __ORIGINAL_URL.
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    let url;
    if (typeof input === "string") { url = input; }
    else if (input instanceof Request) { url = input.url; }
    if (!/^https?:\\/\\//i.test(url)) {
      try { url = new URL(url, __ORIGINAL_URL).href; }
      catch(e) { }
    }
    return originalFetch(__PROXY_BASE + url, init);
  };
  
  // Override XMLHttpRequest.open similarly.
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    if (!/^https?:\\/\\//i.test(url)) {
      try { url = new URL(url, __ORIGINAL_URL).href; }
      catch(e) { }
    }
    return origOpen.call(this, method, __PROXY_BASE + url, async, user, password);
  };
  
  // *** Service Worker Registration Override ***
  if ("serviceWorker" in navigator) {
    const originalSWRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = function(scriptURL, options) {
      // If the URL is relative, resolve it against __ORIGINAL_URL.
      if (!/^https?:\\/\\//i.test(scriptURL)) {
        try {
          scriptURL = new URL(scriptURL, __ORIGINAL_URL).href;
        } catch (e) { }
      }
      // Now register the service worker using the target URL instead of the proxy URL.
      return originalSWRegister(scriptURL, options);
    };
  }
  
  // MutationObserver to process dynamic nodes.
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { processElement(node); }
      });
    });
  });
  
  function processElement(el) {
    if (el.nodeType !== 1) return;
    ["src", "href", "action"].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val && !/^https?:\\/\\//i.test(val) && !/^\\/\\//.test(val)) {
        try {
          const resolved = new URL(val, __ORIGINAL_URL).href;
          el.setAttribute(attr, __PROXY_BASE + resolved);
        } catch(e) { }
      }
    });
    el.querySelectorAll("[src], [href], [action]").forEach(child => { processElement(child); });
  }
  
  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });
  
  window.getQueryParam = ${getQueryParam.toString()};
})();
<\/script>`;
}
