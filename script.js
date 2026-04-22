document.addEventListener('DOMContentLoaded', () => {
    fetchInitialFeed();
});

// FIXED: Defined the navigation function to "go into" sections
function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function fetchInitialFeed() {
    toggleLoader(true);
    try {
        const res = await fetch('/api/feed');
        const data = await res.json();
        
        if (data.status === "success") {
            // Correctly targets the 3 Tier IDs
            renderToContainer(data.local, 'localFeed');
            renderToContainer(data.national, 'nationalFeed');
            renderToContainer(data.global, 'globalFeed');
        } else {
            console.error("Backend Error:", data.message);
        }
    } catch (err) {
        console.error("Network Error:", err);
    } finally {
        toggleLoader(false);
    }
}

function renderToContainer(articles, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    if (!articles || articles.length === 0) {
        container.innerHTML = "<p class='no-data'>No data available for this sector.</p>";
        return;
    }

    articles.forEach(art => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <img src="${art.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500'}" class="card-img">
            <div class="card-body">
                <span class="badge" style="background:${art.color}22; color:${art.color}">${art.mood}</span>
                <p style="font-size:0.7rem; color:#94a3b8; margin:10px 0 5px;">${art.source}</p>
                <h3 style="font-size:0.95rem; line-height:1.3;">${art.title}</h3>
                <a href="${art.url}" target="_blank" class="link">DECRYPT INTEL →</a>
            </div>
        `;
        container.appendChild(div);
    });
}

// Fixed Search Logic
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
        
        // We will temporarily show search results in the Global feed for visibility
        renderToContainer(data.articles, 'globalFeed');
        scrollToSection('globalSection');
    } finally {
        toggleLoader(false);
    }
}

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.toggle('hidden', !show);
}