// --- 1. BOOT SEQUENCE ---
document.addEventListener('DOMContentLoaded', () => {
    // Force Modal Hidden on load
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }

    // Phase 2: Initialize Trending Strip
    fetchTrending();

    // Phase 1: Deep Linking Logic
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTopic = urlParams.get('topic');

    if (sharedTopic) {
        const topicInput = document.getElementById('topicInput');
        if (topicInput) topicInput.value = sharedTopic;
        getSentiment();
    } else {
        // Architecture Optimization: Lazy Loading/Page Detection
        const pageType = document.getElementById('pageType')?.value;
        const isDashboard = document.getElementById('localFeed');
        
        if (pageType) {
            fetchTierNews(pageType); // For specialized view.html pages
        } else if (isDashboard) {
            fetchInitialFeed(); // Hub logic: Loads Local tier only by default
        }
    }
});

// --- 2. UI UTILITIES ---

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.toggle('hidden', !show);
}

function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setSearchMode(mode) {
    const singleSearch = document.getElementById('singleSearch');
    const vsSearch = document.getElementById('vsSearch');
    const singleBtn = document.getElementById('singleModeBtn');
    const vsBtn = document.getElementById('vsModeBtn');

    if (mode === 'vs') {
        if (singleSearch) singleSearch.classList.add('hidden');
        if (vsSearch) vsSearch.classList.remove('hidden');
        if (vsBtn) vsBtn.classList.add('active');
        if (singleBtn) singleBtn.classList.remove('active');
    } else {
        if (vsSearch) vsSearch.classList.add('hidden');
        if (singleSearch) singleSearch.classList.remove('hidden');
        if (singleBtn) singleBtn.classList.add('active');
        if (vsBtn) vsBtn.classList.remove('active');
    }
}

// --- 3. PHASE 4: UTILITIES (Time & Filtering) ---

function quickFilter(topic) {
    const topicInput = document.getElementById('topicInput');
    if (topicInput) {
        topicInput.value = topic;
        setSearchMode('single');
        getSentiment();
    }
}

function getRelativeTime(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diff = Math.floor((now - past) / 1000); // seconds

    if (diff < 60) return "JUST NOW";
    if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
    return `${Math.floor(diff / 86400)}D AGO`;
}

// --- 4. DATA FETCHING ---

async function fetchTrending() {
    const strip = document.getElementById('trendingStrip');
    if (!strip) return;
    try {
        const res = await fetch('/api/trending');
        const data = await res.json();
        if (data.status === "success") {
            strip.innerHTML = "";
            data.trending.forEach(topic => {
                const chip = document.createElement('div');
                chip.className = 'trend-chip';
                chip.innerHTML = `<span>${topic.name}</span> <span class="trend-pill">${topic.emoji} ${topic.confidence}</span>`;
                chip.onclick = () => quickFilter(topic.name);
                strip.appendChild(chip);
            });
        }
    } catch (err) { strip.innerHTML = "DATA INTERRUPTED"; }
}

async function getSentiment() {
    const topic = document.getElementById('topicInput').value;
    if (!topic) return;
    toggleLoader(true);
    try {
        const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic })
        });
        const data = await res.json();
        const searchSection = document.getElementById('searchSection');
        const comparisonSection = document.getElementById('comparisonSection');
        
        if (searchSection) searchSection.classList.remove('hidden');
        if (comparisonSection) comparisonSection.classList.add('hidden');
        
        renderNews(data.articles, 'searchResults');
        scrollToSection('searchSection');
    } catch (err) { console.error(err); }
    finally { toggleLoader(false); }
}

async function getComparison() {
    const topicA = document.getElementById('topicInputA').value;
    const topicB = document.getElementById('topicInputB').value;
    if (!topicA || !topicB) return;

    toggleLoader(true);
    const comparisonSection = document.getElementById('comparisonSection');
    const searchSection = document.getElementById('searchSection');
    
    if (comparisonSection) comparisonSection.classList.remove('hidden');
    if (searchSection) searchSection.classList.add('hidden');

    try {
        const [resA, resB] = await Promise.all([
            fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: topicA }) }),
            fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: topicB }) })
        ]);
        const dataA = await resA.json();
        const dataB = await resB.json();
        renderComparisonColumn(dataA.articles, 'resultsA', 'meterA', topicA);
        renderComparisonColumn(dataB.articles, 'resultsB', 'meterB', topicB);
        scrollToSection('comparisonSection');
    } catch (err) { console.error(err); }
    finally { toggleLoader(false); }
}

// --- 5. RENDERING ENGINE (CONSOLIDATED) ---

function renderNews(articles, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    if (!articles || articles.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">
                                <i class="fas fa-satellite-dish" style="font-size: 2rem;"></i><p>NO INTELLIGENCE FOUND.</p></div>`;
        return;
    }

    articles.forEach(art => {
        // Calculate reading time (Phase 4)
        const words = (art.description || "").split(" ").length + (art.title || "").split(" ").length;
        const readTime = Math.max(1, Math.round(words / 200));

        // Scannable borders (Phase 3)
        const moodClass = art.mood === "Positive" ? "card-positive" : 
                          (art.mood === "Negative" ? "card-negative" : "card-neutral");

        const div = document.createElement('div');
        div.className = `card ${moodClass}`;
        div.innerHTML = `
            <img src="${art.image || 'https://via.placeholder.com/500'}" class="card-img" style="filter: none;">
            <div class="card-body">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span class="badge" style="background:${art.color}22; color:${art.color}">${art.mood}</span>
                    <span class="reading-time" style="font-size:0.6rem; color:#94a3b8;"><i class="far fa-clock"></i> ${readTime} MIN READ</span>
                </div>
                <p style="font-size:0.6rem; color:#94a3b8; margin:0;">${art.source} • ${getRelativeTime(art.published)}</p>
                <h3 style="margin-top:8px; font-size:0.9rem;">${art.title}</h3>
                <a href="${art.url}" target="_blank" class="link">Read Article →</a>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderComparisonColumn(articles, containerId, meterId, topicName) {
    const container = document.getElementById(containerId);
    const meter = document.getElementById(meterId);
    if (!meter) return;

    let totalScore = 0;
    articles.forEach(a => totalScore += (a.score || 0));
    const avgScore = articles.length > 0 ? (totalScore / articles.length) : 0;
    const confidence = Math.round(((avgScore + 1) / 2) * 100);
    const color = avgScore > 0.05 ? "var(--success)" : (avgScore < -0.05 ? "#ef4444" : "var(--text-muted)");

    meter.innerHTML = `
        <p style="font-size:0.6rem; letter-spacing:2px; margin-bottom:5px;">${topicName.toUpperCase()}</p>
        <div class="meter-score" style="color:${color}; font-size:2rem; font-weight:900;">${confidence}%</div>
        <div class="meter-bar-bg" style="height:8px; background:rgba(255,255,255,0.1); border-radius:10px; margin:10px 0;">
            <div style="width:${confidence}%; background:${color}; height:100%; border-radius:10px; transition:1s;"></div>
        </div>`;
    renderNews(articles, containerId);
}

// --- 6. EXPORTS & SETTINGS ---

function openSettings() { 
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex'; 
}

function closeSettings() { 
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none'; 
}

function copyShareLink() {
    const topic = document.getElementById('topicInput').value;
    if (!topic) return;
    const url = `${window.location.origin}/?topic=${encodeURIComponent(topic)}`;
    navigator.clipboard.writeText(url).then(() => alert("Intel Link Copied to Clipboard"));
}

function generatePNG() {
    const element = document.getElementById('searchSection');
    if (!element) return;
    html2canvas(element, { backgroundColor: '#020205' }).then(canvas => {
        const link = document.createElement('a');
        link.download = `SentimentPulse_Intel_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}

async function saveInterests() {
    const btn = document.getElementById('saveBtn');
    if (!btn) return;
    btn.innerText = "UPDATING...";
    const selected = Array.from(document.querySelectorAll('input[name="modal_category"]:checked')).map(cb => cb.value);
    try {
        const res = await fetch('/api/update_interests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interests: selected })
        });
        const data = await res.json();
        if (data.status === "success") {
            btn.innerText = "SUCCESS!";
            setTimeout(() => { closeSettings(); window.location.reload(); }, 1000);
        }
    } catch (err) { btn.innerText = "ERROR"; }
}

// --- 7. OPTIMIZED DATA FETCHING (LAZY LOADING) ---

async function fetchInitialFeed() {
    // Only load Local by default to save quota
    console.log("Initializing Priority Node: Local");
    await fetchSingleTierForHub('local', 'localFeed');
}

async function fetchTierNews(tier) {
    // Used for individual view pages
    toggleLoader(true);
    try {
        const res = await fetch(`/api/news/${tier}`);
        const data = await res.json();
        if (data.status === "success") {
            renderNews(data.articles, 'newsFeed');
        }
    } catch (err) { console.error("Tier Fetch Error:", err); }
    finally { toggleLoader(false); }
}

async function lazyLoadTier(tier) {
    const containerId = tier === 'national' ? 'nationalFeed' : 'globalFeed';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Show internal loader
    container.innerHTML = `<div class="spinner-small"></div><p style="font-size:0.6rem; text-align:center;">CONNECTING TO ${tier.toUpperCase()} TIER...</p>`;
    
    await fetchSingleTierForHub(tier, containerId);
}

async function fetchSingleTierForHub(tier, containerId) {
    try {
        const res = await fetch(`/api/news/${tier}`);
        const data = await res.json();
        if (data.status === "success") {
            // Show top 3 in hub preview
            renderNews(data.articles.slice(0, 3), containerId); 
        }
    } catch (err) {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = "<p class='error'>CONNECTION FAILED</p>";
    }
}
// --- SETTINGS CONTROLLER (INTEGRATED PHASE 0-4) ---

function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex'; // Force visibility for centered flexbox
        modal.classList.remove('hidden');
    }
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none'; // Hard hide to prevent overlay issues
        modal.classList.add('hidden');
    }
    
    // Reset Save Button UI state
    const btn = document.getElementById('saveBtn');
    if (btn) {
        btn.innerText = "COMMIT CHANGES";
        btn.style.background = "var(--accent)";
    }
}

async function saveInterests() {
    const btn = document.getElementById('saveBtn');
    if (!btn) return;

    btn.innerText = "UPLOADING TO NODE...";
    
    // Capture the Expertise Matrix selections
    const selected = Array.from(document.querySelectorAll('input[name="modal_category"]:checked'))
                         .map(cb => cb.value);

    try {
        const res = await fetch('/api/update_interests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interests: selected })
        });
        
        const data = await res.json();
        
        if (data.status === "success") {
            btn.innerText = "BOOTING NEW CONFIG...";
            btn.style.background = "var(--success)";
            btn.style.color = "#fff";
            
            // Wait 1s for the user to see the success, then hard reload
            // This triggers the Phase 4 Boot Sequence with new interests
            setTimeout(() => {
                window.location.reload(); 
            }, 1000);
        }
    } catch (err) {
        console.error("Settings Sync Error:", err);
        btn.innerText = "SYNC FAILED";
        btn.style.background = "#ef4444";
    }
}