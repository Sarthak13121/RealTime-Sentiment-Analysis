import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from newsapi import NewsApiClient
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()
app = Flask(__name__)
app.secret_key = "super_secret_key_for_session" # Required for sessions
CORS(app)

API_KEY = os.getenv("NEWS_API_KEY") or "78f79fcc700b434fbda6694aa9155fa1"
newsapi = NewsApiClient(api_key=API_KEY)
analyzer = SentimentIntensityAnalyzer()

# --- HELPER: SENTIMENT ENGINE ---
def process_articles(articles):
    processed = []
    if not articles: return []
    for art in articles:
        title = art.get('title')
        if not title or title == "[Removed]": continue
        vs = analyzer.polarity_scores(title)
        score = vs['compound']
        if score >= 0.05: mood, color = "Positive", "#10b981"
        elif score <= -0.05: mood, color = "Negative", "#ef4444"
        else: mood, color = "Neutral", "#94a3b8"

        processed.append({
            "title": title, "mood": mood, "color": color,
            "url": art.get('url', '#'), "image": art.get('urlToImage'),
            "source": art['source'].get('name', 'Media Source'),
            "description": (art.get('description') or "Analysis unavailable")[:100] + "..."
        })
    return processed

# --- ROUTES: AUTHENTICATION ---
@app.route('/')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', user=session['user'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Capture User Data
        user_data = {
            "name": request.form.get('name'),
            "email": request.form.get('email'),
            "mobile": request.form.get('mobile'),
            "country": request.form.get('country'),
            "state": request.form.get('state'),
            "city": request.form.get('city')
        }
        session['user'] = user_data
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

# --- ROUTES: PERSONALIZED API ---
@app.route('/api/top-headlines')
def get_top_news():
    try:
        # Check if user is logged in to get their city
        user = session.get('user')
        query = f"{user['city']} {user['state']}" if user else "latest news"
        
        # For city-level local news, we use everything endpoint
        data = newsapi.get_everything(q=query, language='en', sort_by='publishedAt', page_size=12)
        return jsonify({"status": "success", "articles": process_articles(data.get('articles', []))})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        req = request.json
        topic = req.get('topic', '').strip()
        city = req.get('city', '').strip()
        final_query = f"{topic} {city}".strip() or "world news"

        data = newsapi.get_everything(q=final_query, language='en', sort_by='relevancy', page_size=15)
        return jsonify({"status": "success", "articles": process_articles(data.get('articles', []))})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)