let myChart = null;
let rawData = [];

function logMsg(m) { document.getElementById('systemLog').innerText = `>> ${m.toUpperCase()}...`; }

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function initParticles() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight; particles = [];
    for(let i=0; i<70; i++) { particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 1.5, speedX: Math.random() * 0.3 - 0.15, speedY: Math.random() * 0.3 - 0.15 }); }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "rgba(0, 210, 255, 0.3)";
    particles.forEach(p => { p.x += p.speedX; p.y += p.speedY; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); });
    requestAnimationFrame(animate);
}

document.addEventListener('DOMContentLoaded', () => {
    initParticles(); animate(); loadHistory();
    const last = localStorage.getItem('lastSearch');
    if (last) document.getElementById('topicInput').value = last;
    fetchTopHeadlines();
});

async function fetchTopHeadlines() {
    logMsg("Syncing Global Stream");
    toggleLoader(true);
    const res = await fetch('/top-headlines');
    const result = await res.json();
    if (result.status === "success") { rawData = result.data; updateUI("SATELLITE INTEL: WORLD HEADLINES"); }
}

async function getSentiment() {
    const topic = document.getElementById('topicInput').value.trim();
    const lang = document.getElementById('langFilter').value;
    if (!topic) return;
    
    logMsg(`Scanning ${lang.toUpperCase()} Dataset: ${topic}`);
    toggleLoader(true);
    localStorage.setItem('lastSearch', topic);
    saveToHistory(topic);

    const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic, lang: lang })
    });
    const result = await res.json();
    if (result.status === "success") { rawData = result.data; updateUI(`TARGET DATASET: ${topic.toUpperCase()}`); }
}

function updateUI(title) {
    document.getElementById('viewTitle').innerText = title;
    toggleLoader(false);
    document.getElementById('intelHub').classList.remove('hidden');
    document.getElementById('filterBar').classList.remove('hidden');
    applyFilters();
    extractKeywords();
}

function extractKeywords() {
    const words = rawData.map(item => item.title.split(' ')).flat();
    const freq = {};
    words.forEach(w => { if (w.length > 5) freq[w.toUpperCase().replace(/[^A-Z]/g, '')] = (freq[w.toUpperCase().replace(/[^A-Z]/g, '')] || 0) + 1; });
    const top = Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0, 8);
    document.getElementById('keywordList').innerHTML = top.map(t => `<span class="k-tag">${t[0]}</span>`).join('');
}

function applyFilters() {
    const mood = document.getElementById('sentimentFilter').value;
    const feed = document.getElementById('feed');
    let filtered = rawData.filter(item => mood === 'all' || item.mood === mood);
    
    feed.innerHTML = "";
    let stats = { Positive: 0, Negative: 0, Neutral: 0 };

    filtered.forEach(item => {
        stats[item.mood]++;
        const img = item.image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80';
        const card = document.createElement('div');
        card.className = "card";
        card.style.setProperty('--accent', item.color);
        card.innerHTML = `
            <img src="${img}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'">
            <div class="card-content">
                <span class="k-tag" style="border-color:${item.color}; color:${item.color}">${item.mood}</span>
                <p style="color:#444; font-size:0.65rem; margin:8px 0;">${item.source}</p>
                <h3>${item.title}</h3>
                <a href="${item.url}" target="_blank" style="color:#00ff88; text-decoration:none; font-size:0.75rem; margin-top:10px; display:block;">DECRYPT INTEL →</a>
            </div>
        `;
        feed.appendChild(card);
    });
    updateSummary(stats);
    renderChart(stats);
}

function renderChart(stats) {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['P', 'N', 'N'], datasets: [{ data: [stats.Positive, stats.Negative, stats.Neutral], backgroundColor: ['#00ff88', '#ff4b2b', '#111'], borderColor: '#222', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}

function updateSummary(s) {
    const total = s.Positive + s.Negative + s.Neutral;
    if(total === 0) return;
    const pos = Math.round((s.Positive / total) * 100);
    document.getElementById('summaryBox').innerText = `[INTEL STATUS: ${pos > 50 ? 'BULLISH' : 'VOLATILE'}] >> CONFIDENCE: ${pos}%`;
}

function toggleLoader(s) {
    document.getElementById('loader').classList.toggle('hidden', !s);
    if(s) { document.getElementById('feed').innerHTML = ""; logMsg("Initiating uplink"); }
}

function saveToHistory(t) {
    let h = JSON.parse(localStorage.getItem('searchHistory')) || [];
    h = [t, ...h.filter(x => x !== t)].slice(0, 8);
    localStorage.setItem('searchHistory', JSON.stringify(h));
    loadHistory();
}

function loadHistory() {
    const list = document.getElementById('historyList');
    const h = JSON.parse(localStorage.getItem('searchHistory')) || [];
    list.innerHTML = h.map(t => `
        <span class="history-chip">
            <span onclick="document.getElementById('topicInput').value='${t}'; getSentiment();">${t}</span>
            <i class="fas fa-times remove-item" onclick="removeItem('${t}', event)"></i>
        </span>
    `).join('');
}

function removeItem(t, e) {
    e.stopPropagation();
    let h = JSON.parse(localStorage.getItem('searchHistory')) || [];
    h = h.filter(x => x !== t);
    localStorage.setItem('searchHistory', JSON.stringify(h));
    loadHistory();
}