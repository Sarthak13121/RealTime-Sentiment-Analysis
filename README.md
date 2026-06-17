# Real-Time News Sentiment Analysis

An interactive Flask web application that performs real-time sentiment analysis on global, national, and local news articles using the NewsAPI and VADER Sentiment Analysis engine. The application features user profiles, custom interest tracking, dynamic search, trending keyword extraction, and robust performance optimization via localized memory caching.

---

## 🚀 Features

- **Multi-Tiered News Hub**: 
  - **Local Pulse**: Tailored to the user's specific city and state.
  - **National Interests**: Aggregates news based on user's country and customized interests.
  - **Global Network**: Displays international news filtering by top interests.
- **VADER Sentiment Analysis**: Classifies article headlines into Positive, Negative, or Neutral sentiments with corresponding compound scoring and visually expressive color indicators.
- **Trending Topics Engine**: Automatically extracts keywords from top international news headlines and determines their current global sentiment.
- **Smart News Cache**: Features an in-memory caching layer that stores API responses for 10 minutes, preventing redundant external API calls and maximizing rate-limit efficiency.
- **Dynamic Searches**: Allows instant query searches combined with user location to retrieve targeted news sentiments.
- **Customized Matrix**: Allows users to dynamically update their Interest Matrix in real-time, instantly adjusting feed generation.
- **Responsive Web UI**: Built using dynamic styling and modern layouts optimized for both mobile and desktop screens.

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask (Routes, Sessions, JSON API)
- **Frontend**: HTML5, Vanilla CSS3 (Custom gradients, smooth transitions), JavaScript (Fetch API, DOM manipulation)
- **Sentiment Engine**: VADER (Valence Aware Dictionary and sEntiment Reasoner)
- **Data Source**: NewsAPI (via python-wrapper `newsapi-python`)
- **Environment Management**: Python Dotenv

---

## 📁 Repository Structure

```text
realtime-sentiment-analysis/
├── static/
│   ├── style.css         # Modern, responsive CSS styles
│   └── script.js         # AJAX request logic, sentiment visualization, and DOM updates
├── templates/
│   ├── index.html        # Main dashboard page
│   ├── login.html        # Secure user onboarding form
│   ├── interests.html    # Interest selection setup page
│   └── view.html         # News tier rendering page
├── .env.example          # Template for environment configuration
├── app.py                # Main Flask server and routes
├── requirements.txt      # Core python dependencies
└── vercel.json           # Vercel deployment configuration
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.8 or higher.
- A free API key from [NewsAPI](https://newsapi.org/).

### 1. Clone the Repository
```bash
git clone https://github.com/Sarthak13121/RealTime-Sentiment-Analysis.git
cd RealTime-Sentiment-Analysis
```

### 2. Set Up a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory and add your keys (use `.env.example` as a template):
```env
NEWS_API_KEY=your_actual_news_api_key_here
LOCATION_API_KEY=your_optional_location_key_here
FLASK_SECRET_KEY=your_secret_random_session_key
FLASK_ENV=development
```

### 5. Run the Application
```bash
python app.py
```
Open your browser and navigate to `http://127.0.0.1:5000`.

---

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.
