document.addEventListener('DOMContentLoaded', () => {
    console.log("App Initialized: Syncing Global Feed...");
    fetchTopHeadlines();
});

// --- FETCH TOP NEWS (Startup) ---
async function fetchTopHeadlines() {
    toggleLoader(true);
    try {
        const res = await fetch('/api/top-headlines');
        const result = await res.json();
        
        if (result.status === "success") {
            renderArticles(result.articles);
        } else {
            showError("System Offline: " + result.message);
        }
    } catch (err) {
        showError("Could not connect to Python backend.");
    } finally {
        toggleLoader(false);
    }
}

// --- SEARCH FUNCTION ---
async function getSentiment() {
    const topic = document.getElementById('topicInput').value.trim();
    const city = document.getElementById('cityInput').value.trim();

    if (!topic && !city) {
        alert("Please enter a target topic or location.");
        return;
    }

    toggleLoader(true);
    const displayTitle = [topic, city].filter(Boolean).join(" | ");
    document.getElementById('viewTitle').innerText = `ANALYSIS: ${displayTitle.toUpperCase()}`;

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, city })
        });
        
        const result = await res.json();
        if (result.status === "success") {
            renderArticles(result.articles);
        } else {
            showError(result.message);
        }
    } catch (err) {
        showError("Communication Error: Re-check server status.");
    } finally {
        toggleLoader(false);
    }
}

// --- UI RENDERING ---
function renderArticles(articles) {
    const feed = document.getElementById('feed');
    feed.innerHTML = ""; 

    if (!articles || articles.length === 0) {
        feed.innerHTML = `
            <div class="no-results">
                <p>NO DATA INTERCEPTED AT THESE COORDINATES.</p>
                <small>Try a more general topic or check your API key.</small>
            </div>`;
        return;
    }

    articles.forEach(art => {
        const card = document.createElement('div');
        card.className = "card";
        card.innerHTML = `
            <img src="${art.image || 'https://via.placeholder.com/400x225?text=Pulse+Intel'}" class="card-img" onerror="this.src='https://via.placeholder.com/400x225?text=Pulse+Intel'">
            <div class="card-content">
                <span class="mood-badge" style="color: ${art.color}; border: 1px solid ${art.color}44; background: ${art.color}11">
                    ${art.mood}
                </span>
                <p class="source">${art.source}</p>
                <h3>${art.title}</h3>
                <p class="desc">${art.description}</p>
                <a href="${art.url}" target="_blank" class="link">DECRYPT FULL INTEL →</a>
            </div>
        `;
        feed.appendChild(card);
    });
}

function showError(msg) {
    const feed = document.getElementById('feed');
    feed.innerHTML = `<p class="error-msg">SYSTEM ERROR: ${msg.toUpperCase()}</p>`;
}

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.toggle('hidden', !show);
}