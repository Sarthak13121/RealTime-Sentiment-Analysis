import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from newsapi import NewsApiClient
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()
app = Flask(__name__)
CORS(app)

# Initialize APIs
API_KEY = os.getenv("NEWS_API_KEY") or "78f79fcc700b434fbda6694aa9155fa1"
newsapi = NewsApiClient(api_key=API_KEY)
analyzer = SentimentIntensityAnalyzer()

def process_articles(articles):
    processed = []
    for art in articles:
        title = art.get('title')
        if not title or title == "[Removed]": continue
        
        vs = analyzer.polarity_scores(title)
        score = vs['compound']
        
        if score >= 0.05: mood, color = "Positive", "#00ff88"
        elif score <= -0.05: mood, color = "Negative", "#ff4b2b"
        else: mood, color = "Neutral", "#a0a0a0"

        processed.append({
            "title": title, "mood": mood, "score": score, "color": color,
            "url": art.get('url', '#'), 
            "image": art.get('urlToImage'),
            "source": art['source'].get('name', 'Intel Source')
        })
    return processed

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/top-headlines', methods=['GET'])
def get_top_news():
    try:
        data = newsapi.get_top_headlines(language='en', page_size=12)
        return jsonify({"status": "success", "data": process_articles(data.get('articles', []))})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        topic = data.get('topic', 'Global News')
        lang = data.get('lang', 'en')
        
        # NewsAPI native support check
        api_lang = lang if lang in ['en', 'fr', 'es'] else 'en'
        search_query = topic
        
        # Manual query boost for specific languages
        if lang == 'hi': search_query += " Hindi"
        elif lang == 'gu': search_query += " Gujarati"

        data = newsapi.get_everything(q=search_query, language=api_lang, sort_by='relevancy', page_size=30)
        return jsonify({"status": "success", "data": process_articles(data.get('articles', []))})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)