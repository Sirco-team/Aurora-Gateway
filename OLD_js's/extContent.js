// extContent.js

// ------------------------------
// Force Base Tag Insertion
// ------------------------------
function forceBaseTag(html, baseHref) {
  html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/i, "");
  return html.replace(/<head>/i, `<head><base href="${baseHref}">`);
}

// ------------------------------
// Rewrite Resource URLs
// ------------------------------
function rewriteResourceUrls(html, baseHref, proxyBase) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = doc.querySelectorAll("[src], [href], [action]");
    elements.forEach(el => {
      if (el.tagName.toLowerCase() === "a") return;
      ["src", "href", "action"].forEach(attr => {
        let val = el.getAttribute(attr);
        if (
          val &&
          !val.startsWith("data:") &&
          !/^mailto:/.test(val) &&
          !/^javascript:/.test(val)
        ) {
          if (!/^https?:\/\//i.test(val) && !/^\/\//.test(val)) {
            try {
              const resolved = new URL(val, baseHref).href;
              // ALWAYS prepend proxyBase.
              el.setAttribute(attr, proxyBase + resolved);
            } catch (e) {}
          }
        }
      });
    });
    const baseTag = doc.querySelector("base");
    if (baseTag) baseTag.remove();
    return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
  } catch (e) {
    return html;
  }
}

// ------------------------------
// Navigation Interceptor & Overrides
// ------------------------------
function getInterceptorScript(originalUrl, proxyBase, proxyId) {
  return `<script>
(function(){
  const __ORIGINAL_URL = "${originalUrl}";
  const __PROXY_BASE = "${proxyBase}";
  const __PROXY_ID = "${proxyId}";
  try {
    const origReplaceState = history.replaceState;
    history.replaceState = function(...args){ try { return origReplaceState.apply(history, args); } catch(e){ console.warn(e); } };
  } catch(e){}
  function handleNavigation(url){
    if(url.startsWith("https://corsproxy.io/") ||
       url.startsWith("https://cors-anywhere.herokuapp.com/") ||
       url.startsWith("https://thingproxy.freeboard.io/fetch/")){
      try {
        const u = new URL(url);
        const orig = u.searchParams.get("url");
        if(orig){ url = orig; }
      } catch(e){}
    }
    if(!/^https?:\\/\\//i.test(url)){
      try { url = new URL(url, __ORIGINAL_URL).href; } catch(e){}
    }
    const newUrl = window.location.origin + window.location.pathname + "?proxy=" + __PROXY_ID + "&url=" + encodeURIComponent(url);
    window.location.href = newUrl;
  }
  window.location.assign = function(url){ handleNavigation(url); };
  window.location.replace = function(url){ handleNavigation(url); };
  window.open = function(url, name, specs){ handleNavigation(url); return null; };
  document.addEventListener("click", function(e){
    const anchor = e.target.closest("a");
    if(anchor && anchor.getAttribute("href")){
      e.preventDefault();
      handleNavigation(anchor.href);
    }
  }, true);
  const originalFetch = window.fetch;
  window.fetch = function(input, init){
    let url = typeof input === "string" ? input : (input instanceof Request ? input.url : "");
    if(!/^https?:\\/\\//i.test(url)){
      try { url = new URL(url, __ORIGINAL_URL).href; } catch(e){}
    }
    return originalFetch(__PROXY_BASE + url, init);
  };
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password){
    if(!/^https?:\\/\\//i.test(url)){
      try { url = new URL(url, __ORIGINAL_URL).href; } catch(e){}
    }
    return origOpen.call(this, method, __PROXY_BASE + url, async, user, password);
  };
})();
<\/script>`;
}
function injectInterceptor(html, originalUrl, proxyBase, proxyId) {
  const interceptorScript = getInterceptorScript(originalUrl, proxyBase, proxyId);
  if(/<\/body>/i.test(html))
    return html.replace(/<\/body>/i, interceptorScript + "</body>");
  else
    return html + interceptorScript;
}

window.forceBaseTag = forceBaseTag;
window.rewriteResourceUrls = rewriteResourceUrls;
window.getInterceptorScript = getInterceptorScript;
window.injectInterceptor = injectInterceptor;
