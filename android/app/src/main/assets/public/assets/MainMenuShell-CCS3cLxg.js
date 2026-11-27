var e=class{constructor(e,t){this.destroyed=!1,this.root=e,this.container=document.createElement(`div`),this.container.className=`snake-city-menu-shell`,this.container.id=`snakeCityMainMenu`,this.container.innerHTML=`
      <div class="scm-backdrop" aria-hidden="true"></div>
      <main class="scm-stage">
        <header class="scm-hero">
          <p class="scm-kicker">One World · Multiple Experiences · One Portal Ecosystem</p>
          <h1 class="scm-title">SNAKE CITY</h1>
          <p class="scm-subtitle">Explore. Discover. Connect.</p>
        </header>

        <section class="scm-worlds-grid" aria-label="The Two Worlds of Snake City">
          <article class="scm-world-card">
            <div class="scm-world-meta">Adventure · Central Sanctuary to The Unknown</div>
            <h2 class="scm-world-heading">The Game World</h2>
            <p class="scm-world-copy">
              Explore eight interconnected regions, fight Soul Clan warriors, solve mechanical and electrical puzzles, compete in Serpent Racing and procedural dungeons, and evolve.
            </p>
          </article>

          <article class="scm-world-card">
            <div class="scm-world-meta">Portal Network · Independent Session Recovery</div>
            <h2 class="scm-world-heading">The Browser World</h2>
            <p class="scm-world-copy">
              Search the web, open websites, manage tabs, rediscover closed sessions in Forgotten Ruins, and access bookmarks and workspaces through physical portals or direct search.
            </p>
          </article>
        </section>

        <section class="scm-cta-block" aria-label="Launch Snake City">
          <button type="button" class="scm-primary-btn" id="scmEnterWorldBtn">
            Enter Snake City
          </button>
          <p class="scm-cta-note">Start inside the Central Sanctuary. Discover the gateways.</p>

          <div class="scm-secondary-row">
            <button type="button" class="scm-quick-browser-btn" id="scmQuickBrowserBtn">
              Open Portal Browser Directly
            </button>
            <span class="scm-divider" aria-hidden="true">·</span>
            <span class="scm-quiet-note">Browser runs independently so a game reload never interrupts your tabs</span>
          </div>
        </section>

        <footer class="scm-footer-strip">
          <span>8 Interconnected Regions</span>
          <span aria-hidden="true">·</span>
          <span>6 Playable In-World Activities</span>
          <span aria-hidden="true">·</span>
          <span>Persistent Portal Memory &amp; Offline Cache</span>
        </footer>
      </main>
    `,this.root.innerHTML=``,this.root.appendChild(this.container),this.container.querySelector(`#scmEnterWorldBtn`)?.addEventListener(`click`,()=>{this.destroyed||t.onEnterSnakeCity()}),this.container.querySelector(`#scmQuickBrowserBtn`)?.addEventListener(`click`,()=>{this.destroyed||t.onOpenQuickBrowser()})}destroy(){this.destroyed||(this.destroyed=!0,this.container.remove())}};export{e as MainMenuShell};