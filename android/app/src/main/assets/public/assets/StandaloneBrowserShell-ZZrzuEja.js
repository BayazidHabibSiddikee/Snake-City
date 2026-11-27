import{r as e,s as t,t as n}from"./offlineCache-DpMwowIt.js";var r=class{constructor(e,r,i){this.browser=new t,this.offlineCache=new n,this.lastFrameKey=``,this.destroyed=!1,this.root=e,this.onEnterGameWorld=r,this.onReturnToMainMenu=i,this.container=document.createElement(`div`),this.container.className=`standalone-browser-shell`,this.container.innerHTML=`
      <header class="sbs-topbar">
        <div class="sbs-brand">
          <span class="sbs-brand-mark">SP</span>
          <div class="sbs-brand-text">
            <strong>Snake-City Portal Browser</strong>
            <span>Isolated Web Proxy · Light Startup (3D Engine Idle)</span>
          </div>
        </div>
        <div class="sbs-tabstrip" id="sbsTabStrip"></div>
        <div class="sbs-top-actions">
          <button type="button" class="sbs-btn" id="sbsNewTabBtn" title="New Tab">+ Tab</button>
          ${i?`<button type="button" class="sbs-btn" id="sbsMainMenuBtn">Main Menu</button>`:``}
          <button type="button" class="sbs-btn primary" id="sbsEnterWorldBtn">Enter Snake City</button>
        </div>
      </header>
      <div class="sbs-navbar">
        <button type="button" class="sbs-nav-btn" id="sbsBackBtn" title="Back">←</button>
        <button type="button" class="sbs-nav-btn" id="sbsFwdBtn" title="Forward">→</button>
        <button type="button" class="sbs-nav-btn" id="sbsReloadBtn" title="Reload">↻</button>
        <form class="sbs-omnibox-form" id="sbsOmniForm">
          <input
            type="text"
            id="sbsOmnibox"
            class="sbs-omnibox"
            placeholder="Search the web or enter URL (https://..., chrome://newtab, chrome://version)"
            autocomplete="off"
          />
        </form>
        <button type="button" class="sbs-nav-btn" id="sbsBookmarkBtn" title="Bookmark page">☆</button>
        <button type="button" class="sbs-nav-btn" id="sbsProxyBtn" title="Toggle Safe Proxy">Proxy: ON</button>
      </div>
      <main class="sbs-viewport-wrap">
        <iframe
          id="sbsViewport"
          class="sbs-viewport"
          title="Portal Browser Viewport"
          sandbox="allow-scripts allow-forms allow-popups"
          referrerpolicy="no-referrer"
        ></iframe>
      </main>
      <footer class="sbs-statusbar">
        <span id="sbsStatusText">Portal Browser Ready · Opaque Sandbox Isolation Active</span>
        <span>3D WebGL Engine not loaded · Click "Enter 3D World" anytime</span>
      </footer>
    `,this.root.innerHTML=``,this.root.appendChild(this.container),this.tabStripEl=this.container.querySelector(`#sbsTabStrip`),this.omniboxEl=this.container.querySelector(`#sbsOmnibox`),this.bookmarkBtnEl=this.container.querySelector(`#sbsBookmarkBtn`),this.proxyBtnEl=this.container.querySelector(`#sbsProxyBtn`),this.iframeEl=this.container.querySelector(`#sbsViewport`),this.statusEl=this.container.querySelector(`#sbsStatusText`),this.bindEvents(),this.messageHandler=e=>{if(this.destroyed||e.source!==this.iframeEl.contentWindow||e.origin!==`null`&&e.origin!==window.location.origin)return;let t=e.data;if(t&&typeof t==`object`&&t.bridgeToken===this.browser.getBridgeToken()){if(t.type===`SERPENT_PORTAL_NAVIGATE`&&typeof t.url==`string`)this.navigate(t.url);else if(t.type===`SERPENT_PORTAL_TAB_LOADED`)this.browser.updateActiveTabMetadata(t.url,t.title),this.render(!1);else if(t.type===`SERPENT_PORTAL_ACTION`){if(!this.browser.getActiveTab().url.startsWith(`chrome://`))return;t.action===`remove_bookmark`&&t.target?(this.browser.removeCustomBookmark(t.target),this.render(!0)):t.action===`remove_search_history`&&t.target?(this.browser.removeSearchHistoryEntry(t.target),this.render(!0)):(t.action===`open_milestone`||t.action===`open_portal`)&&this.transitionToGameWorld()}}},window.addEventListener(`message`,this.messageHandler),this.render(!0),this.initOfflineCache()}bindEvents(){this.container.querySelector(`#sbsNewTabBtn`)?.addEventListener(`click`,()=>{this.browser.createTab(`chrome://newtab`),this.render(!0)}),this.container.querySelector(`#sbsEnterWorldBtn`)?.addEventListener(`click`,()=>{this.transitionToGameWorld()}),this.container.querySelector(`#sbsMainMenuBtn`)?.addEventListener(`click`,()=>{this.onReturnToMainMenu&&(this.destroy(),this.onReturnToMainMenu())}),this.container.querySelector(`#sbsBackBtn`)?.addEventListener(`click`,()=>{this.browser.goBack(),this.render(!0)}),this.container.querySelector(`#sbsFwdBtn`)?.addEventListener(`click`,()=>{this.browser.goForward(),this.render(!0)}),this.container.querySelector(`#sbsReloadBtn`)?.addEventListener(`click`,()=>{this.render(!0)}),this.container.querySelector(`#sbsOmniForm`)?.addEventListener(`submit`,e=>{e.preventDefault();let t=this.omniboxEl.value.trim();t&&this.navigate(t)}),this.bookmarkBtnEl.addEventListener(`click`,()=>{let e=this.browser.getActiveTab(),t=this.browser.toggleBookmark(e.title,e.url,e.portalVariant);this.statusEl.textContent=t?`Saved bookmark: ${e.title}`:`Removed bookmark: ${e.title}`,this.render(!1)}),this.proxyBtnEl.addEventListener(`click`,()=>{this.browser.toggleProxyMode(),this.render(!0)})}navigate(e){this.browser.navigateActiveTab(e),this.render(!0)}render(e){let t=this.browser.getTabs(),n=this.browser.getActiveTab();this.tabStripEl.innerHTML=t.slice(0,8).map(e=>{let r=e.id===n.id,i=e.title.replace(/[<>&"']/g,``).slice(0,22);return`
          <div class="sbs-tab ${r?`active`:``}" data-tab-id="${e.id}">
            <span class="sbs-tab-title">${i||`Portal Tab`}</span>
            ${t.length>1?`<button type="button" class="sbs-tab-close" data-close-id="${e.id}" aria-label="Close tab">×</button>`:``}
          </div>
        `}).join(``),this.tabStripEl.querySelectorAll(`.sbs-tab`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.tabId;t&&(this.browser.activateTab(t),this.render(!0))})}),this.tabStripEl.querySelectorAll(`.sbs-tab-close`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation();let n=e.dataset.closeId;n&&(this.browser.closeTab(n),this.render(!0))})}),this.omniboxEl.value=n.url;let r=this.browser.isBookmarked(n.url);this.bookmarkBtnEl.textContent=r?`★`:`☆`,this.proxyBtnEl.textContent=n.proxyMode?`Proxy: ON`:`Direct`;let i=this.browser.getIframeSrcForTab(n),a=`${n.id}|${n.url}|${n.proxyMode?`1`:`0`}`;(e||this.lastFrameKey!==a)&&(this.lastFrameKey=a,i.srcdoc===void 0?i.src&&(this.iframeEl.removeAttribute(`srcdoc`),this.iframeEl.src=i.src):(this.iframeEl.removeAttribute(`src`),this.iframeEl.srcdoc=i.srcdoc))}async initOfflineCache(){try{let t=await this.offlineCache.readCachedPortalState();if(t&&(this.browser.hydrateFromOfflineStateSnapshot(t),this.render(!1)),await this.offlineCache.registerAndWarm(this.browser.exportOfflineStateSnapshot()),this.offlineCache.isOnline()){let t=e(this.browser.getCustomBookmarks(),this.browser.getHistory().slice(0,6),10);t.length>0&&this.offlineCache.precachePortalUrls(t,this.browser.getSettings())}}catch{}}transitionToGameWorld(){this.destroy(),this.onEnterGameWorld()}destroy(){this.destroyed||(this.destroyed=!0,window.removeEventListener(`message`,this.messageHandler),this.container.remove())}};export{r as StandaloneBrowserShell};