import os
import time
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from newsapi import NewsApiClient
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from dotenv import load_dotenv

# --- INITIALIZATION ---
load_dotenv()  # Loads variables from .env

app = Flask(__name__)
# Securely load keys from environment variables
app.secret_key = os.getenv("FLASK_SECRET_KEY")
API_KEY = os.getenv("NEWS_API_KEY")

newsapi = NewsApiClient(api_key=API_KEY)
analyzer = SentimentIntensityAnalyzer()
CORS(app)

# --- SIMPLE RESPONSE CACHE ---
# Stores results in memory to avoid redundant API calls within 10 minutes
news_cache = {}

def get_cached_data(query_key):
    now = time.time()
    if query_key in news_cache:
        timestamp, data = news_cache[query_key]
        if now - timestamp < 600:  # 600 seconds = 10 minutes
            return data
    return None

def set_cached_data(query_key, data):
    news_cache[query_key] = (time.time(), data)

# --- ARTICLE PROCESSING ENGINE ---
def process_articles(articles):
    processed = []
    if not articles: return []
    
    for art in articles:
        title = art.get('title')
        # Skip removed or empty articles
        if not title or title == "[Removed]": continue
        
        # VADER Sentiment Analysis based on Roadmap thresholds
        vs = analyzer.polarity_scores(title)
        score = vs['compound']
        
        if score >= 0.05:
            mood, color = "Positive", "#10b981"
        elif score <= -0.05:
            mood, color = "Negative", "#ef4444"
        else:
            mood, color = "Neutral", "#94a3b8"

        processed.append({
            "title": title,
            "mood": mood,
            "color": color,
            "score": score,
            "url": art.get('url', '#'),
            "image": art.get('urlToImage'),
            "source": art['source'].get('name', 'Global Intel'),
            "published": art.get('publishedAt', '')[:10],
            "description": (art.get('description') or "Detailed report available.")[:110] + "..."
        })
    return processed

# --- NAVIGATION ROUTES ---
@app.route('/')
def index():
    if 'user' not in session: return redirect(url_for('login'))
    if 'interests' not in session: return redirect(url_for('interests'))
    return render_template('index.html', user=session['user'], interests=session['interests'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Defensive programming using .get()
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

@app.route('/local')
def local_view():
    user_city = session.get('user', {}).get('city', 'Unknown')
    return render_template('view.html', type="local", title="Local Pulse", subtitle=user_city)

@app.route('/national')
def national_view():
    user_country = session.get('user', {}).get('country', 'Unknown')
    return render_template('view.html', type="national", title="National Interests", subtitle=user_country)

@app.route('/global')
def global_view():
    return render_template('view.html', type="global", title="Global Network", subtitle="International News")

# --- API ENDPOINTS ---
@app.route('/api/news/<tier>')
def get_tier_news(tier):
    try:
        user = session.get('user', {})
        topics = session.get('interests', [])
        
        # Define the query based on Tier logic
        if tier == 'local':
            query = f"{user.get('city')} OR {user.get('state')}"
        elif tier == 'national':
            country = user.get('country', 'India')
            query = f"{country} AND ({' OR '.join(topics[:3])})" if topics else country
        else:
            query = f"({' OR '.join(topics[:5])})" if topics else "world technology"

        # Check Cache before making API call
        cached_result = get_cached_data(query)
        if cached_result:
            return jsonify({"status": "success", "articles": cached_result})

        # Fetch results with increased page_size=15
        data = newsapi.get_everything(q=query, language='en', sort_by='publishedAt', page_size=15)
        processed = process_articles(data.get('articles', []))
        
        # Save to cache
        set_cached_data(query, processed)
        
        return jsonify({"status": "success", "articles": processed})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    try:
        data = request.json
        topic = data.get('topic', '').strip()
        if not topic:
            return jsonify({"status": "error", "message": "No topic provided"}), 400
            
        # Roadmap Logic: Input + City
        user_city = session.get('user', {}).get('city', '')
        query = f"{topic} {user_city}".strip()
        
        news = newsapi.get_everything(q=query, language='en', sort_by='relevancy', page_size=15)
        return jsonify({"status": "success", "articles": process_articles(news.get('articles', []))})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/update_interests', methods=['POST'])
def update_interests():
    if 'user' not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    try:
        data = request.json
        new_interests = data.get('interests', [])
        
        # Update the secure session expertise matrix
        session['interests'] = new_interests
        session.modified = True 
        
        # Phase 0: Clear any local session-based cache if necessary
        return jsonify({"status": "success", "message": "Intelligence Matrix Updated"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route('/api/trending')
def get_trending():
    try:
        # Fetch top headlines to see what the world is talking about
        top_data = newsapi.get_top_headlines(language='en', page_size=10)
        articles = top_data.get('articles', [])
        
        trending_topics = []
        # Extract keywords/topics from the first 8 headlines
        for art in articles[:8]:
            title = art.get('title', '')
            if not title or title == "[Removed]": continue
            
            # Simple keyword extraction: Take first 2-3 words of the title
            # In a real app, you'd use a library like Rake or NLTK
            clean_title = title.split(' - ')[0] # Remove source name
            topic = " ".join(clean_title.split()[:2]) # Take first two words
            
            # Analyze sentiment for the chip pill
            vs = analyzer.polarity_scores(title)
            score = vs['compound']
            
            if score >= 0.05:
                mood, emoji = "positive", "🟢"
            elif score <= -0.05:
                mood, emoji = "negative", "🔴"
            else:
                mood, emoji = "neutral", "⚪"
                
            trending_topics.append({
                "name": topic.upper(),
                "mood": mood,
                "emoji": emoji,
                "confidence": f"{int(abs(score) * 100)}%"
            })
            
        return jsonify({"status": "success", "trending": trending_topics})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)