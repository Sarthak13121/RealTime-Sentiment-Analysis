import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from newsapi import NewsApiClient
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = Flask(__name__)
app.secret_key = "sentinel_pulse_secure_node_2026" 
CORS(app)

API_KEY = "78f79fcc700b434fbda6694aa9155fa1" 
newsapi = NewsApiClient(api_key=API_KEY)
analyzer = SentimentIntensityAnalyzer()

def process_articles(articles):
    processed = []
    if not articles: return []
    for art in articles:
        title = art.get('title')
        if not title or title == "[Removed]": continue
        vs = analyzer.polarity_scores(title)
        score = vs['compound']
        mood, color = ("Positive", "#10b981") if score >= 0.05 else ("Negative", "#ef4444") if score <= -0.05 else ("Neutral", "#94a3b8")

        processed.append({
            "title": title, "mood": mood, "color": color, "score": score,
            "url": art.get('url', '#'), "image": art.get('urlToImage'),
            "source": art['source'].get('name', 'Global Intel'),
            "published": art.get('publishedAt', '')[:10],
            "description": (art.get('description') or "Detailed report available.")[:110] + "..."
        })
    return processed

@app.route('/')
def index():
    if 'user' not in session: return redirect(url_for('login'))
    if 'interests' not in session: return redirect(url_for('interests'))
    return render_template('index.html', user=session['user'], interests=session['interests'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # FIXED: Now capturing country
        session['user'] = {
            "name": request.form.get('name'),
            "email": request.form.get('email'),
            "country": request.form.get('country'), 
            "state": request.form.get('state'),
            "city": request.form.get('city')
        }
        return redirect(url_for('interests'))
    return render_template('login.html')

@app.route('/interests', methods=['GET', 'POST'])
def interests():
    if 'user' not in session: return redirect(url_for('login'))
    if request.method == 'POST':
        session['interests'] = request.form.getlist('category')
        return redirect(url_for('index'))
    return render_template('interests.html')

@app.route('/api/feed')
def get_feed():
    try:
        user = session.get('user')
        topics = session.get('interests', [])
        
        # Local: City + State
        local_q = f"{user['city']} OR {user['state']}"
        # National: Country + Interests (Fallback to country only)
        national_q = f"{user['country']} AND ({' OR '.join(topics[:3])})" if topics else user['country']
        # Global: Interests only
        global_q = f"({' OR '.join(topics[:5])})" if topics else "international technology"

        l_data = newsapi.get_everything(q=local_q, language='en', sort_by='publishedAt', page_size=6)
        n_data = newsapi.get_everything(q=national_q, language='en', sort_by='relevancy', page_size=6)
        g_data = newsapi.get_everything(q=global_q, language='en', sort_by='relevancy', page_size=6)

        return jsonify({
            "status": "success",
            "local": process_articles(l_data.get('articles', [])),
            "national": process_articles(n_data.get('articles', [])),
            "global": process_articles(g_data.get('articles', []))
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    try:
        data = request.json
        q = f"{data.get('topic')} {data.get('city', '')}".strip() or "Latest"
        news = newsapi.get_everything(q=q, language='en', sort_by='relevancy', page_size=12)
        return jsonify({"status": "success", "articles": process_articles(news.get('articles', []))})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)