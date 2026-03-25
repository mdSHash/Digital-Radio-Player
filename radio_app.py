import streamlit as st
import streamlit.components.v1 as components
import requests
import time
import datetime
import re
import json
import os
import random
from collections import defaultdict

# ─────────────────────────────────────────────────────────────
#  PAGE CONFIG
# ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Egypt Radio Stream",
    page_icon="📻",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ─────────────────────────────────────────────────────────────
#  FONTS
# ─────────────────────────────────────────────────────────────
st.markdown(
    '<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700'
    '&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">',
    unsafe_allow_html=True,
)

# ─────────────────────────────────────────────────────────────
#  CSS
# ─────────────────────────────────────────────────────────────
st.markdown("""<style>
html, body { background:#080810 !important; }
.stApp { background:radial-gradient(ellipse at 20% 10%,#0f0f1e 0%,#080810 60%) !important; }
#MainMenu,footer,header { visibility:hidden; }
.stAppHeader { display:none !important; }
.block-container { max-width:740px !important; padding-top:1.5rem !important; padding-bottom:4rem !important; }

.hero { text-align:center; padding:36px 0 28px; border-bottom:1px solid #1e1e30; margin-bottom:28px; }
.hero-tag { font-family:'Space Mono',monospace; font-size:11px; color:#ff6b35; letter-spacing:4px; text-transform:uppercase; margin-bottom:10px; }
.hero-title { font-family:'Syne',sans-serif; font-size:40px; font-weight:800; color:#e8e8f0; line-height:1.1; letter-spacing:-1px; margin:0; }
.hero-title span { color:#00e5ff; }
.hero-sub { font-family:'Space Mono',monospace; font-size:11px; color:#4a4a6a; margin-top:8px; }

.data-panel { background:#080d10; border:1px solid #0d2a1a; border-radius:16px; padding:20px 24px; margin-bottom:20px; position:relative; overflow:hidden; }
.data-panel::before { content:''; position:absolute; top:0;left:0;right:0; height:2px; background:linear-gradient(90deg,#22c55e,#00e5ff,#22c55e); background-size:200% 100%; animation:shimmer 2s linear infinite; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.data-title { font-family:'Space Mono',monospace; font-size:10px; color:#22c55e; letter-spacing:3px; text-transform:uppercase; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
.data-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
.data-cell { background:#0a0a14; border:1px solid #1e1e30; border-radius:10px; padding:12px 14px; text-align:center; }
.data-cell .val { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#22c55e; line-height:1; margin-bottom:4px; }
.data-cell .val.warn { color:#fbbf24; } .data-cell .val.alert { color:#ef4444; }
.data-cell .lbl { font-family:'Space Mono',monospace; font-size:9px; color:#4a4a6a; letter-spacing:1px; text-transform:uppercase; }
.bar-wrap { background:#0f0f1c; border:1px solid #1e1e30; border-radius:99px; height:7px; overflow:hidden; margin:6px 0 4px; }
.bar-fill { height:100%; border-radius:99px; transition:width 1s ease; }
.bar-label { font-family:'Space Mono',monospace; font-size:10px; color:#4a4a6a; display:flex; justify-content:space-between; margin-top:4px; }
.rate-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
.rate-pill { background:#0f0f1c; border:1px solid #1e1e30; border-radius:99px; padding:4px 12px; font-family:'Space Mono',monospace; font-size:10px; color:#4a4a6a; display:flex; align-items:center; gap:6px; }
.dot-green { width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block; }
.dot-yellow { width:6px;height:6px;background:#fbbf24;border-radius:50%;display:inline-block; }

.history-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid #1e1e30; font-family:'Space Mono',monospace; font-size:11px; }
.history-row:last-child { border-bottom:none; }
.history-row .h-name { color:#e8e8f0; } .history-row .h-time { color:#4a4a6a; } .history-row .h-data { color:#22c55e; font-weight:700; }

.station-card { background:#0f0f1c; border:1px solid #1e1e30; border-radius:14px; padding:16px 20px 10px; margin-bottom:4px; position:relative; overflow:hidden; }
.station-card::before { content:''; position:absolute; left:0;top:0;bottom:0; width:3px; background:#1e1e30; }
.station-card.playing { border-color:#ff6b35 !important; background:#130d0a; }
.station-card.playing::before { background:#ff6b35 !important; width:4px; }
.station-name { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; color:#e8e8f0; margin-bottom:3px; }
.station-meta { font-family:'Space Mono',monospace; font-size:11px; color:#4a4a6a; display:flex; gap:14px; flex-wrap:wrap; }
.station-meta .freq { color:#00e5ff; } .station-meta .genre { color:#a855f7; }
.station-playing-badge { position:absolute; right:16px; top:14px; font-family:'Space Mono',monospace; font-size:10px; color:#ff6b35; display:flex; align-items:center; gap:6px; }
.blink-dot { width:8px;height:8px;background:#ff6b35;border-radius:50%;animation:blink 1s ease-in-out infinite;display:inline-block; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

.section-label { font-family:'Space Mono',monospace; font-size:10px; color:#ff6b35; letter-spacing:3px; text-transform:uppercase; margin:24px 0 12px; display:flex; align-items:center; gap:10px; }
.section-label::after { content:''; flex:1; height:1px; background:#1e1e30; }
.sub-section-label { font-family:'Space Mono',monospace; font-size:11px; color:#00e5ff; text-transform:uppercase; margin:16px 0 8px; border-left: 2px solid #00e5ff; padding-left: 8px;}
hr { border-color:#1e1e30 !important; }

.stTextInput input { background:#0f0f1c !important; border:1px solid #1e1e30 !important; border-radius:8px !important; color:#e8e8f0 !important; font-family:'Space Mono',monospace !important; font-size:13px !important; }
.stTextInput input:focus { border-color:#00e5ff !important; box-shadow:0 0 0 2px rgba(0,229,255,0.1) !important; }
.stSelectbox>div>div,.stSelectbox [data-baseweb="select"]>div { background:#0f0f1c !important; border:1px solid #1e1e30 !important; border-radius:8px !important; color:#e8e8f0 !important; }
.stSlider [data-baseweb="slider"] [role="slider"] { background:#00e5ff !important; border-color:#00e5ff !important; }

.stButton>button { background:#0f0f1c !important; border:1px solid #1e1e30 !important; border-radius:8px !important; color:#e8e8f0 !important; font-family:'Space Mono',monospace !important; font-size:12px !important; letter-spacing:1px !important; padding:10px 20px !important; width:100% !important; transition:all 0.2s !important; }
.stButton>button:hover { border-color:#00e5ff !important; color:#00e5ff !important; background:rgba(0,229,255,0.05) !important; }

/* Red button hover state for remove buttons */
.btn-remove>button:hover { border-color:#ef4444 !important; color:#ef4444 !important; background:rgba(239,68,68,0.05) !important; }
.btn-added>button { border-color:#22c55e !important; color:#22c55e !important; }

/* Sleep timer specific buttons */
.btn-sleep>button { padding: 6px 10px !important; font-size: 10px !important; }

.stTabs [role="tab"] { font-family:'Space Mono',monospace !important; font-size:11px !important; letter-spacing:1px !important; color:#4a4a6a !important; background:transparent !important; }
.stTabs [role="tab"][aria-selected="true"] { color:#00e5ff !important; background:transparent !important; }
.stTabs [role="tablist"] { border-bottom:1px solid #1e1e30 !important; background:transparent !important; }
.stTabs [role="tabpanel"] { background:transparent !important; }

.stAlert { border-radius:8px !important; font-family:'Space Mono',monospace !important; font-size:11px !important; }

[data-testid="stMetric"] { background:#0f0f1c !important; border:1px solid #1e1e30 !important; border-radius:10px !important; padding:10px 14px !important; }
[data-testid="stMetricLabel"] p { font-family:'Space Mono',monospace !important; font-size:9px !important; color:#4a4a6a !important; letter-spacing:1px !important; text-transform:uppercase !important; }
[data-testid="stMetricValue"] { font-family:'Syne',sans-serif !important; font-size:18px !important; font-weight:800 !important; color:#22c55e !important; }
[data-testid="stMetricDelta"] { display:none !important; }

.ref-table { width:100%; border-collapse:collapse; font-family:'Space Mono',monospace; font-size:11px; }
.ref-table th { color:#ff6b35; padding:8px 12px; text-align:left; border-bottom:1px solid #1e1e30; font-size:10px; letter-spacing:1px; }
.ref-table td { color:#e8e8f0; padding:8px 12px; border-bottom:1px solid #0f0f1c; }
.ref-table tr:last-child td { border-bottom:none; }
.ref-table .g{color:#22c55e;} .ref-table .y{color:#fbbf24;} .ref-table .r{color:#ef4444;}
</style>""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────
#  STATIONS & PERSISTENT PRESETS
# ─────────────────────────────────────────────────────────────
def rg(station_id):
    return f"https://radio.garden/api/ara/content/listen/{station_id}/channel.mp3"

# EXTENDED EGYPT_MASTER_DB 
# Sourced & Deduplicated from LiveOnlineRadio, Radoxo, TuneIn, MyTuner
EGYPT_MASTER_DB = [
    # 📰 اذاعات الأخبار (News / Talk / General)
    {"name": "البرنامج العام", "english": "General Program", "freq": "107.4 FM", "genre": "📰 اذاعات الأخبار", "url": "https://stream.radiojar.com/8s5u5tpdtwzuv"},
    {"name": "الشرق الأوسط", "english": "Middle East Radio", "freq": "89.5 FM", "genre": "📰 اذاعات الأخبار", "url": "https://stream.radiojar.com/npxedz9ep3quv"},
    {"name": "صوت العرب", "english": "Sawt El Arab", "freq": "106.3 FM", "genre": "📰 اذاعات الأخبار", "url": "https://stream.radiojar.com/4q3uwdcngm0uv"},
    {"name": "راديو مصر", "english": "Radio Masr", "freq": "88.7 FM", "genre": "📰 اذاعات الأخبار", "url": rg("acJLKP1I")},
    
    # 🕌 اذاعات دينية (Islamic / Quran)
    {"name": "إذاعة القرآن الكريم", "english": "Quran Cairo", "freq": "98.2 FM", "genre": "🕌 اذاعات دينية", "url": "https://stream.radiojar.com/8s5u5tpdtwzuv"}, # Note: Uses same ERTU CDN node as General Program currently
    {"name": "تلاوة", "english": "Tilawa Radio", "freq": "Web Stream", "genre": "🕌 اذاعات دينية", "url": rg("v9Q_8zT_")},
    {"name": "راديو زايد", "english": "Zayed Radio for Quran", "freq": "Web Stream", "genre": "🕌 اذاعات دينية", "url": "https://zayed.live.net.sa/quran"}
]
#  url field:
#   • "rj:<slug>"   → resolves to https://stream.radiojar.com/<slug>
#                     (ERTU official, stable, no tokens)
#   • "rb:<name>"   → resolved at play-time via radio-browser.info API
#                     searching by station name — always returns fresh URL
#   • "cdn:<url>"   → direct CDN, hard-coded (e.g. radio.co, mobtada.com)
#
#  No zeno.fm or any other token-based URL is hardcoded.
#  No Christian/Coptic stations included.
# ═══════════════════════════════════════════════════════════════

STATIONS = [
    {"name": "مكس إف أم", "en": "Mix FM Egypt", "freq": "87.8 FM", "genre": "🎵 أغاني وموسيقى", "url": "rb:Mix FM Egypt"},
    {"name": "راديو هيتس", "en": "Radio Hits Egypt", "freq": "88.2 FM", "genre": "🎵 أغاني وموسيقى", "url": "rb:Radio Hits Egypt"},
    {"name": "راديو مصر", "en": "Radio Masr", "freq": "88.7 FM", "genre": "📰 أخبار وحوارات", "url": "rj:radiomasr"},
    {"name": "إذاعة الشرق الأوسط", "en": "Middle East Radio", "freq": "89.5 FM", "genre": "📰 أخبار وحوارات", "url": "rj:npxedz9ep3quv"},
    {"name": "الراديو 9090", "en": "El Radio 9090", "freq": "90.9 FM", "genre": "🎧 شبابية وشعبية", "url": "cdn:https://9090streaming.mobtada.com/9090FMEGYPT"},
    {"name": "راديو إنرجي NRJ", "en": "NRJ Egypt", "freq": "92.1 FM", "genre": "🎵 أغاني وموسيقى", "url": "rb:NRJ Egypt"},
    {"name": "ميجا إف أم", "en": "Mega FM", "freq": "92.7 FM", "genre": "🎵 أغاني وموسيقى", "url": "rb:Mega FM Egypt"},
    {"name": "أون سبورت إف أم", "en": "ON Sport FM", "freq": "93.7 FM", "genre": "⚽ رياضة", "url": "rb:ON Sport FM"},
    {"name": "شعبي 95 إف أم", "en": "Sha3by 95 FM", "freq": "95.0 FM", "genre": "🎧 شبابية وشعبية", "url": "rb:Sha3by 95 FM"},
    {"name": "البرنامج الثاني", "en": "ERTU Second Program", "freq": "95.4 FM", "genre": "📰 أخبار وحوارات", "url": "rj:tpefhg4yeg0uv"},
    {"name": "إذاعة القرآن الكريم", "en": "ERTU Quran Cairo", "freq": "98.2 FM", "genre": "🕌 دينية إسلامية", "url": "rj:0tpy1h0kxtzuv"},
    {"name": "البرنامج الموسيقي", "en": "ERTU Musical Program", "freq": "98.8 FM", "genre": "🎻 كلاسيك وزمان", "url": "rj:musicalprogram"},
    {"name": "نجوم إف أم", "en": "Nogoum FM", "freq": "100.6 FM", "genre": "🎵 أغاني وموسيقى", "url": "rj:nogoumfm"},
    {"name": "إذاعة القاهرة الكبرى", "en": "Greater Cairo Radio", "freq": "102.2 FM", "genre": "📍 محلية وإقليمية", "url": "rj:6cxe0z4yeg0uv"},
    {"name": "نيل إف أم", "en": "Nile FM", "freq": "104.2 FM", "genre": "🎵 أغاني وموسيقى", "url": "rj:nilefm"},
    {"name": "نغم إف أم", "en": "Nagham FM", "freq": "105.3 FM", "genre": "🎵 أغاني وموسيقى", "url": "rj:naghamfm"},
    {"name": "البرنامج الأوروبي المحلي", "en": "European Local Radio", "freq": "105.8 FM", "genre": "📍 محلية وإقليمية", "url": "rj:europeanprogram"},
    {"name": "البرنامج الثقافي", "en": "Cultural Program", "freq": "105.8 FM", "genre": "🎻 كلاسيك وزمان", "url": "rj:culturalprogram"},
    {"name": "صوت العرب", "en": "Sawt El Arab", "freq": "106.3 FM", "genre": "📰 أخبار وحوارات", "url": "rj:4q3uwdcngm0uv"},
    {"name": "البرنامج العام", "en": "ERTU General Program", "freq": "107.4 FM", "genre": "📰 أخبار وحوارات", "url": "rj:8s5u5tpdtwzuv"},
    {"name": "الشباب والرياضة", "en": "ERTU Youth & Sports", "freq": "108.0 FM", "genre": "⚽ رياضة", "url": "rj:ztd3x80tpm0uv"}
]

# ── Deduplicate by url key ──────────────────────────────────
_seen = set()
UNIQUE_MASTER_DB = []
for station in EGYPT_MASTER_DB:
    identifier = station["url"].split("?")[0]
    if identifier not in _seen:
        UNIQUE_MASTER_DB.append(station)
        _seen.add(identifier)
EGYPT_MASTER_DB = UNIQUE_MASTER_DB

INITIAL_PRESET_STATIONS = EGYPT_MASTER_DB[:6] # Default layout takes top 6

PRESETS_FILE = "my_presets.json"

def load_presets():
    """Load customized presets from local JSON file if it exists."""
    if os.path.exists(PRESETS_FILE):
        try:
            with open(PRESETS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return INITIAL_PRESET_STATIONS.copy()

def save_presets(presets):
    """Save customized presets to local JSON file."""
    try:
        with open(PRESETS_FILE, "w", encoding="utf-8") as f:
            json.dump(presets, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

# 1. NEW: API Best Practices - Proper User Agent
API_HEADERS = {
    "User-Agent": "EgyptRadioStreamPlayer/1.0 (https://github.com/your-repo-link)"
}

# 2. NEW: API Best Practices - Dynamic Server Discovery
@st.cache_data(ttl=3600) # Cache server list for 1 hour so we don't spam the API
def get_radio_browser_mirrors():
    """Fetches a list of active, available radio-browser.info servers dynamically."""
    try:
        r = requests.get("https://all.api.radio-browser.info/json/servers", headers=API_HEADERS, timeout=5)
        if r.status_code == 200:
            servers = r.json()
            return [f"https://{s['name']}/json" for s in servers]
    except:
        pass
    
    return [
        "https://de1.api.radio-browser.info/json",
        "https://nl1.api.radio-browser.info/json",
        "https://at1.api.radio-browser.info/json",
    ]

# ─────────────────────────────────────────────────────────────
#  SESSION STATE
# ─────────────────────────────────────────────────────────────
defaults = {
    "stream_url":None,"station_name":None,"stream_bitrate":128,
    "search_results":[],"search_done":False,"last_search":"",
    "play_start_ts":None,"total_bytes":0,"history":[],
    "status_msg":"","status_type":"info", 
    "sleep_target": None, # Sleep Timer Unix timestamp
    "scanned_presets": [],
}
for k,v in defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v

if "presets" not in st.session_state:
    st.session_state["presets"] = load_presets()

# ─────────────────────────────────────────────────────────────
#  HELPERS, BILINGUAL SEARCH, & EGYPTRADIO CATEGORIZATION
# ─────────────────────────────────────────────────────────────
def bytes_to_human(b):
    if b<1024:     return f"{b:.0f} B"
    if b<1024**2:  return f"{b/1024:.1f} KB"
    if b<1024**3:  return f"{b/1024**2:.2f} MB"
    return f"{b/1024**3:.3f} GB"

def seconds_to_hms(s):
    s=int(s); h,rem=divmod(s,3600); m,sec=divmod(rem,60)
    if h>0: return f"{h}h {m:02d}m {sec:02d}s"
    if m>0: return f"{m}m {sec:02d}s"
    return f"{sec}s"

def calc_bytes(seconds,kbps): return seconds*(kbps*1000/8)
def get_elapsed():
    return 0.0 if st.session_state.play_start_ts is None else time.time()-st.session_state.play_start_ts
def get_session_bytes(): return calc_bytes(get_elapsed(),st.session_state.stream_bitrate)
def color_class(mb): return "" if mb<50 else ("warn" if mb<150 else "alert")

def resolve_playlist(url):
    if not any(url.lower().endswith(e) for e in [".pls",".m3u"]):
        return url
    try:
        r=requests.get(url,timeout=6,headers={"User-Agent":"VLC/3.0"})
        for line in r.text.splitlines():
            if line.startswith("File1="): return line.split("=",1)[1].strip()
            if line.strip() and not line.startswith("#"): return line.strip()
    except Exception: pass
    return url

def get_bilingual_queries(query):
    queries = [query]
    is_arabic = any("\u0600" <= c <= "\u06FF" for c in query)
    langpair = "ar|en" if is_arabic else "en|ar"
    
    try:
        r = requests.get(f"https://api.mymemory.translated.net/get?q={query}&langpair={langpair}", timeout=3)
        if r.status_code == 200:
            translated = r.json().get("responseData", {}).get("translatedText", "")
            if translated and "MYMEMORY" not in translated and translated.lower() != query.lower():
                queries.append(translated)
    except Exception:
        pass
        
    fallback_dict = {
        "قران": "quran", "قرآن": "quran", "زايد": "zayed", "تلاوة": "tilawa",
        "نجوم": "nogoum", "نيل": "nile", "نغم": "nagham", "راديو": "radio", 
        "مصر": "masr", "شباب": "shabab", "رياضة": "sport", "أون سبورت": "on sport",
        "شعبي": "sha3by", "الشرق": "asharq", "الجزيرة": "aljazeera", "اخبار": "news",
        "ميجا": "mega", "هيتس": "hits", "ام كلثوم": "om kalthoum", "عبدالحليم": "abdel halim",
        "زمان": "zaman", "كلاسيك": "classic", "محطة": "station", "صوت العرب": "sawt el arab",
        "القاهرة الكبرى": "greater cairo", "الشرق الاوسط": "middle east", "البرنامج العام": "general program",
        "اينرجي": "nrj", "تسعينات": "nineties", "الجونة": "gouna"
    }
    fallback_dict_rev = {v: k for k, v in fallback_dict.items()}
    
    lower_q = query.lower()
    if is_arabic:
        for ar, en in fallback_dict.items():
            if ar in lower_q: 
                queries.append(lower_q.replace(ar, en))
                break
    else:
        for en, ar in fallback_dict_rev.items():
            if en in lower_q: 
                queries.append(lower_q.replace(en, ar))
                break
                
    return list(set(queries))

def search_radio_garden_api(query):
    results = []
    try:
        r = requests.get(f"https://radio.garden/api/search?q={query}", headers=API_HEADERS, timeout=5)
        if r.status_code == 200:
            hits = r.json().get("hits", {}).get("hits", [])
            for hit in hits:
                src = hit.get("_source", {})
                if src.get("type") == "channel":
                    name = src.get("title", "Unknown")
                    url_path = src.get("url", "")
                    station_id = url_path.split("/")[-1] if "/" in url_path else ""
                    if station_id:
                        results.append({
                            "name": name,
                            "url": rg(station_id),
                            "url_resolved": rg(station_id),
                            "codec": "MP3",
                            "bitrate": 128,
                            "tags": "Radio Garden Database",
                            "votes": 999,
                            "countrycode": "RG"
                        })
    except: pass
    return results

def parse_genre(tag_string, station_name=""):
    combined_text = f"{tag_string} {station_name}".lower()
    
    if any(w in combined_text for w in ["quran", "islam", "قرآن", "قران", "دين", "تلاوة", "زايد", "سنة", "حديث", "قدس"]):
        return "🕌 اذاعات دينية"
    if any(w in combined_text for w in ["news", "talk", "أخبار", "اخبار", "برامج", "الشرق", "الجزيرة", "العربية", "bbc", "عرب"]):
        return "📰 اذاعات الأخبار"
    if any(w in combined_text for w in ["sport", "رياضة", "شباب والرياضة", "on sport", "كورة"]):
        return "⚽ اذاعات الرياضة"
    if any(w in combined_text for w in ["youth", "شباب", "شعبى", "شعبي", "sha3by", "9090", "مهرجانات", "حريتنا"]):
        return "🎧 اذاعات شبابية وشعبية"
    if any(w in combined_text for w in ["classic", "زمان", "كلاسيك", "ام كلثوم", "عبد الحليم", "oldies", "تراث", "تسعينات"]):
        return "🎻 اذاعات كلاسيك"
    if any(w in combined_text for w in ["music", "hit", "pop", "أغاني", "اغاني", "موسيقى", "نغم", "نجوم", "nogoum", "nile", "mega", "nrj", "mix"]):
        return "🎵 اذاعات الأغاني"
    if any(w in combined_text for w in ["local", "محلية", "اسكندرية", "مطروح", "الصعيد", "القنال", "regional", "الجونة", "بنها"]):
        return "📍 اذاعات محلية"
        
    return "📻 اذاعات منوعة"

def search_stations(query, country="EG", limit=8):
    search_terms = get_bilingual_queries(query)
    all_results = []
    seen_urls = set()
    
    # 1. Search EGYPT_MASTER_DB first
    for term in search_terms:
        for station in EGYPT_MASTER_DB:
            if term in station["name"].lower() or term in station["english"].lower():
                norm_u = normalize_stream_url(station["url"])
                if norm_u not in seen_urls:
                    seen_urls.add(norm_u)
                    all_results.append({
                        "name": station["name"],
                        "url": station["url"],
                        "url_resolved": station["url"],
                        "codec": "MP3",
                        "bitrate": 128,
                        "tags": station["genre"],
                        "votes": 9999,
                        "countrycode": "EG"
                    })
                    
    # 2. Hit Radio Garden API
    for term in search_terms:
        rg_results = search_radio_garden_api(term)
        for s in rg_results:
            norm_u = normalize_stream_url(s["url"])
            if norm_u not in seen_urls:
                seen_urls.add(norm_u)
                all_results.append(s)

    # 3. Fallback to radio-browser.info API
    base_params = {"limit": limit, "hidebroken": "true", "order": "votes", "reverse": "true"}
    if country and country != "All": 
        base_params["countrycode"] = country
        
    mirrors = get_radio_browser_mirrors()
    random.shuffle(mirrors)
    
    for mirror in mirrors:
        mirror_success = False
        for q in search_terms:
            try:
                params_name = {**base_params, "name": q}
                r = requests.get(f"{mirror}/stations/search", params=params_name, headers=API_HEADERS, timeout=5)
                data = r.json()
                
                if not data:
                    params_tag = {**base_params, "tag": q}
                    r = requests.get(f"{mirror}/stations/search", params=params_tag, headers=API_HEADERS, timeout=5)
                    data = r.json()
                    
                for s in data:
                    url = normalize_stream_url(s.get("url_resolved") or s.get("url", ""))
                    if url not in seen_urls:
                        seen_urls.add(url)
                        all_results.append(s)
                mirror_success = True
            except Exception:
                pass
        if mirror_success and all_results:
            break
            
    return all_results

def start_playing(url,name,bitrate=128):
    if st.session_state.play_start_ts is not None:
        elapsed=get_elapsed(); used=get_session_bytes()
        if elapsed>2:
            st.session_state.history.insert(0,{
                "name":st.session_state.station_name or "Unknown",
                "duration_sec":elapsed,"bytes":used,
                "stopped_at":datetime.datetime.now().strftime("%H:%M"),
            })
            st.session_state.history=st.session_state.history[:10]
            st.session_state.total_bytes+=used
            
    st.session_state.sleep_target = None 
    st.session_state.stream_url=url
    st.session_state.station_name=name
    st.session_state.stream_bitrate=bitrate or 128
    st.session_state.play_start_ts=time.time()

def extract_frequency(text):
    if not text: return None
    matches = re.findall(r'(?<!\d)((?:8[7-9]|9\d|10[0-8])\.\d)(?!\d)', text)
    if matches: return float(matches[0])
    return None

def normalize_stream_url(url):
    if not url: return ""
    u = url.lower().split("?")[0]
    u = u.replace("https://", "").replace("http://", "").rstrip("/")
    u = re.sub(r'^(n\d+[a-z]?|stream\d*|live\d*|listen\d*|audio\d*)\.', '', u)
    return u

# ─────────────────────────────────────────────────────────────
#  AUDIO PLAYER (Smart CSS Visualizer - No CPU Drain)
# ─────────────────────────────────────────────────────────────
def render_player(url, name):
    bars_html = ""
    for i in range(25):
        delay = round(random.uniform(0, 1.2), 2)
        bars_html += f'<div class="bar" style="animation-delay: -{delay}s;"></div>'

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Space+Mono&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{background:#0a0a14;font-family:'Space Mono',monospace;padding:20px;border-radius:16px;border:1px solid #1e1e30;}}
.name{{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#e8e8f0;margin-bottom:4px;}}
.url-txt{{font-size:9px;color:#2a2a45;word-break:break-all;margin-bottom:12px;}}

.viz-container {{ display: flex; gap: 3px; height: 34px; margin-bottom: 14px; align-items: flex-end; }}
.bar {{ width: 4px; background: #ff6b35; border-radius: 2px; height: 4px; opacity: 0.3; transition: opacity 0.3s; }}

.is-playing .bar {{ opacity: 1; }}
.is-playing .bar:nth-child(4n+1) {{ animation: wave1 0.8s ease-in-out infinite alternate; }}
.is-playing .bar:nth-child(4n+2) {{ animation: wave2 1.1s ease-in-out infinite alternate; }}
.is-playing .bar:nth-child(4n+3) {{ animation: wave3 0.9s ease-in-out infinite alternate; }}
.is-playing .bar:nth-child(4n+4) {{ animation: wave4 1.2s ease-in-out infinite alternate; }}

@keyframes wave1 {{ 0% {{ height: 4px; }} 100% {{ height: 28px; }} }}
@keyframes wave2 {{ 0% {{ height: 6px; }} 100% {{ height: 18px; }} }}
@keyframes wave3 {{ 0% {{ height: 4px; }} 100% {{ height: 32px; }} }}
@keyframes wave4 {{ 0% {{ height: 8px; }} 100% {{ height: 22px; }} }}

audio{{width:100%;border-radius:8px;outline:none;}}
audio::-webkit-media-controls-panel{{background:#0f0f1c;}}
.err{{color:#ef4444;font-size:11px;margin-top:10px;padding:8px 12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:8px;display:none;}}
.buffering{{color:#00e5ff;font-size:11px;margin-top:10px;animation:pulse 1.5s infinite;display:none;}}
@keyframes pulse {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: 0.5; }} }}
</style></head><body>
<div class="name">▶ {name}</div>
<div class="url-txt">{url}</div>

<div class="viz-container" id="viz">
    {bars_html}
</div>

<!-- Forcing a single connection natively to prevent Radiojar/CDN IP-bans -->
<audio id="p" controls autoplay src="{url}"></audio>

<div class="err" id="err">⚠ Stream failed to load (Offline or blocked by provider).</div>
<div class="buffering" id="buf">⏳ Buffering live stream...</div>

<script>
const audio = document.getElementById('p');
const errDiv = document.getElementById('err');
const bufDiv = document.getElementById('buf');
const viz = document.getElementById('viz');

audio.onerror = function() {{ 
    errDiv.style.display='block'; 
    bufDiv.style.display='none'; 
    viz.classList.remove('is-playing');
}};
audio.oncanplay = function() {{ errDiv.style.display='none'; bufDiv.style.display='none'; }};
audio.onwaiting = function() {{ bufDiv.style.display='block'; viz.classList.remove('is-playing'); }};

audio.onplay = () => viz.classList.add('is-playing');
audio.onplaying = () => {{ bufDiv.style.display='none'; viz.classList.add('is-playing'); }};
audio.onpause = () => viz.classList.remove('is-playing');
audio.onended = () => viz.classList.remove('is-playing');

setTimeout(function(){{ if(audio.readyState===0) audio.load(); }}, 8000);
</script>
</body></html>"""
    components.html(html, height=185)

# ─────────────────────────────────────────────────────────────
#  HEADER
# ─────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero">
  <div class="hero-tag">// Live Internet Radio</div>
  <h1 class="hero-title">Egypt <span>Radio</span><br>Stream Player</h1>
  <p class="hero-sub">radio.garden · egyptradio.net · Data tracker</p>
</div>""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────
#  LIVE DATA USAGE PANEL
# ─────────────────────────────────────────────────────────────
@st.fragment(run_every=1)
def live_data_panel():
    with st.container():
        if st.session_state.sleep_target and time.time() >= st.session_state.sleep_target:
            elapsed=get_elapsed(); used=get_session_bytes()
            if elapsed>2:
                st.session_state.history.insert(0,{
                    "name":st.session_state.station_name or "Unknown",
                    "duration_sec":elapsed,"bytes":used,
                    "stopped_at":datetime.datetime.now().strftime("%H:%M"),
                })
                st.session_state.history=st.session_state.history[:10]
                st.session_state.total_bytes+=used
                
            st.session_state.stream_url=None; st.session_state.station_name=None
            st.session_state.play_start_ts=None; st.session_state.sleep_target=None
            st.session_state.status_msg="Sleep Timer Finished. Stream stopped to save data."
            st.session_state.status_type="info"
            st.rerun()

        session_bytes=get_session_bytes()
        total_bytes=st.session_state.total_bytes+session_bytes
        session_mb=session_bytes/1024/1024; total_mb=total_bytes/1024/1024
        elapsed_sec=get_elapsed(); kbps=st.session_state.stream_bitrate
        hour_mb=calc_bytes(3600,kbps)/1024/1024
        bar_pct=min(100,(session_mb/hour_mb)*100) if hour_mb>0 else 0
        bar_color="#22c55e" if session_mb<50 else ("#fbbf24" if session_mb<150 else "#ef4444")
        is_live=st.session_state.play_start_ts is not None
        blink=("animation:blink 1s ease-in-out infinite;" if is_live else "")

        st.markdown(f"""
        <div class="data-panel">
          <div class="data-title">
            <span style="width:8px;height:8px;background:{'#22c55e' if is_live else '#2a2a45'};border-radius:50%;display:inline-block;{blink}"></span>
            DATA USAGE MONITOR {'— LIVE' if is_live else '— IDLE'}
          </div>
          <div class="data-grid">
            <div class="data-cell"><div class="val {color_class(session_mb)}">{bytes_to_human(session_bytes)}</div><div class="lbl">This Session</div></div>
            <div class="data-cell"><div class="val">{seconds_to_hms(elapsed_sec)}</div><div class="lbl">Listening Time</div></div>
            <div class="data-cell"><div class="val {color_class(total_mb)}">{bytes_to_human(total_bytes)}</div><div class="lbl">Total This Run</div></div>
          </div>
          <div class="bar-wrap"><div class="bar-fill" style="width:{bar_pct:.1f}%;background:{bar_color};"></div></div>
          <div class="bar-label"><span>{session_mb:.1f} MB used this session</span><span>≈ {hour_mb:.0f} MB / hr at {kbps} kbps</span></div>
          <div class="rate-row">
            <div class="rate-pill"><span class="dot-green"></span>{kbps} kbps</div>
            <div class="rate-pill"><span class="dot-green"></span>{calc_bytes(60,kbps)/1024:.0f} KB / min</div>
            <div class="rate-pill"><span class="dot-{'yellow' if hour_mb>50 else 'green'}"></span>{hour_mb:.0f} MB / hr</div>
            <div class="rate-pill"><span class="dot-{'yellow' if hour_mb*24>500 else 'green'}"></span>{hour_mb*24:.0f} MB / day</div>
          </div>
        </div>""", unsafe_allow_html=True)

live_data_panel()

if st.session_state.history:
    with st.expander("📊  Session History"):
        for h in st.session_state.history:
            st.markdown(f"""<div class="history-row">
              <span class="h-name">{h['name']}</span>
              <span class="h-time">{seconds_to_hms(h['duration_sec'])} · {h['stopped_at']}</span>
              <span class="h-data">{bytes_to_human(h['bytes'])}</span>
            </div>""", unsafe_allow_html=True)
        total_hist=sum(h["bytes"] for h in st.session_state.history)
        st.markdown(f"""<div style="font-family:'Space Mono',monospace;font-size:11px;color:#4a4a6a;
            margin-top:10px;padding-top:10px;border-top:1px solid #1e1e30;display:flex;justify-content:space-between;">
          <span>Total across all sessions</span>
          <span style="color:#22c55e;font-weight:700;">{bytes_to_human(total_hist)}</span>
        </div>""", unsafe_allow_html=True)
        col_r,_=st.columns([1,3])
        with col_r:
            if st.button("🗑  Clear History",key="clear_history"):
                st.session_state.history=[]; st.session_state.total_bytes=0; st.rerun()

st.markdown("---")

# ─────────────────────────────────────────────────────────────
#  TABS
# ─────────────────────────────────────────────────────────────
tab1, tab_db, tab_scan, tab2, tab3 = st.tabs(["📻  PRESETS", "🗄️  DATABASE", "📡  SCAN", "🔍  SEARCH", "🔗  URL"])

# ══════════════════════════════════════════════════════════════
#  TAB 1 — PRESETS
# ══════════════════════════════════════════════════════════════
with tab1:
    st.markdown('<div class="section-label">Your Presets</div>', unsafe_allow_html=True)
    
    if not st.session_state.presets:
        st.info("Your presets list is empty. Check the Database, Scan, or Search to add some stations!")
    else:
        preset_categories = defaultdict(list)
        for i, station in enumerate(st.session_state.presets):
            st_data = station.copy()
            st_data['_index'] = i
            preset_categories[station.get('genre', '📻 اذاعات منوعة')].append(st_data)
            
        for genre, stations in sorted(preset_categories.items()):
            st.markdown(f'<div class="sub-section-label">{genre}</div>', unsafe_allow_html=True)
            for station in stations:
                is_playing = (st.session_state.stream_url == station["url"])
                card_cls="station-card playing" if is_playing else "station-card"
                badge='<div class="station-playing-badge"><span class="blink-dot"></span>LIVE</div>' if is_playing else ""
                
                st.markdown(f"""<div class="{card_cls}" style="margin-left: 10px;">
                  <div class="station-name">{station['name']}</div>
                  <div class="station-meta">
                    <span class="freq">{station.get('freq', 'Web Stream')}</span>
                  </div>{badge}
                </div>""", unsafe_allow_html=True)
                
                col_play, col_rem = st.columns([3, 1])
                with col_play:
                    if st.button(f"▶  Play", key=f"preset_play_{station['_index']}"):
                        start_playing(station["url"], station["english"], 128)
                        st.session_state.status_msg = f"Connected to {station['english']}"
                        st.session_state.status_type = "success"
                        st.rerun()
                with col_rem:
                    st.markdown('<div class="btn-remove">', unsafe_allow_html=True)
                    if st.button("🗑  Remove", key=f"preset_rem_{station['_index']}"):
                        st.session_state.presets.pop(station['_index'])
                        save_presets(st.session_state.presets)
                        st.rerun()
                    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════
#  TAB 2 — DATABASE (NEW)
# ══════════════════════════════════════════════════════════════
with tab_db:
    st.markdown('<div class="section-label">Egypt Master Database</div>', unsafe_allow_html=True)
    st.caption("A curated, deduplicated list of top Egyptian radio stations sourced from major directories.")
    
    db_categories = defaultdict(list)
    for i, station in enumerate(EGYPT_MASTER_DB):
        st_data = station.copy()
        st_data['_index'] = i
        db_categories[station.get('genre', '📻 اذاعات منوعة')].append(st_data)
        
    for genre, stations in sorted(db_categories.items()):
        st.markdown(f'<div class="sub-section-label">{genre} ({len(stations)})</div>', unsafe_allow_html=True)
        for station in stations:
            is_playing = (st.session_state.stream_url == station["url"])
            card_cls="station-card playing" if is_playing else "station-card"
            badge='<div class="station-playing-badge"><span class="blink-dot"></span>LIVE</div>' if is_playing else ""
            
            st.markdown(f"""<div class="{card_cls}" style="margin-left: 10px;">
              <div class="station-name">{station['name']} - {station['english']}</div>
              <div class="station-meta">
                <span class="freq">{station.get('freq', 'Web Stream')}</span>
              </div>{badge}
            </div>""", unsafe_allow_html=True)
            
            col_play, col_add = st.columns([3, 1])
            with col_play:
                if st.button(f"▶  Play", key=f"db_play_{station['_index']}"):
                    start_playing(station["url"], station["english"], 128)
                    st.session_state.status_msg = f"Connected to {station['english']}"
                    st.session_state.status_type = "success"
                    st.rerun()
            with col_add:
                # Check if it already exists in user presets
                in_presets = any(p["url"] == station["url"] for p in st.session_state.presets)
                if in_presets:
                    st.markdown('<div class="btn-added">', unsafe_allow_html=True)
                    st.button("✅ Added", key=f"db_added_{station['_index']}", disabled=True)
                    st.markdown('</div>', unsafe_allow_html=True)
                else:
                    if st.button("➕  Add", key=f"db_add_{station['_index']}"):
                        st.session_state.presets.append({
                            "name": station["name"],
                            "english": station["english"],
                            "freq": station["freq"],
                            "genre": station["genre"],
                            "url": station["url"]
                        })
                        save_presets(st.session_state.presets)
                        st.rerun()

# ══════════════════════════════════════════════════════════════
#  TAB 3 — SCANNER
# ══════════════════════════════════════════════════════════════
with tab_scan:
    st.markdown('<div class="section-label">Auto-Scan Network</div>', unsafe_allow_html=True)
    st.info("Scans global databases, skips duplicates, and uses the egyptradio.net categorization engine.")
    
    col_c, col_l = st.columns(2)
    with col_c:
        scan_country = st.selectbox("Region to Scan", ["EG", "SA", "AE", "MA", "All"])
    with col_l:
        scan_limit = st.number_input("Max stations to test", min_value=1, max_value=500, value=20, step=1)
        
    scan_low_data = st.checkbox("🌱 Low Data Mode (Only scan streams 64 kbps or lower)", value=False)
        
    if st.button("📡 Start Auto-Scan", use_container_width=True):
        status_text = st.empty()
        progress_bar = st.progress(0)
        
        status_text.text(f"Fetching station directory for {scan_country}...")
        
        params = {"limit": scan_limit * 3, "hidebroken": "true", "order": "votes", "reverse": "true"}
        if scan_country != "All": params["countrycode"] = scan_country
        
        stations_to_test = []
        
        if scan_country in ["EG", "All"]:
            for st_data in EGYPT_MASTER_DB:
                stations_to_test.append({
                    "name": st_data["name"],
                    "url": st_data["url"],
                    "tags": st_data["genre"],
                    "codec": "MP3",
                    "bitrate": 128
                })

        mirrors = get_radio_browser_mirrors()
        random.shuffle(mirrors)

        for mirror in mirrors:
            try:
                r = requests.get(f"{mirror}/stations/search", params=params, headers=API_HEADERS, timeout=5)
                if r.status_code == 200:
                    stations_to_test.extend(r.json())
                    break
            except: pass
            
        if not stations_to_test:
            status_text.error("Failed to connect to the directory. Please try again.")
        else:
            working_stations = []
            seen_urls = set()
            seen_names = set()
            seen_freqs = set()
            
            for p in st.session_state.presets:
                u = normalize_stream_url(p["url"])
                seen_urls.add(u)
                seen_names.add(p["name"].lower().strip())
                
                p_freq = extract_frequency(p["name"]) or extract_frequency(p.get("freq", ""))
                if p_freq: seen_freqs.add(p_freq)
            
            tested_count = 0
            
            for s in stations_to_test:
                if tested_count >= scan_limit: break
                    
                if scan_low_data:
                    bitrate = int(s.get("bitrate") or 128)
                    if bitrate > 64 or bitrate <= 0:
                        continue
                
                name = s.get("name", "Unknown").strip()
                url = s.get("url_resolved") or s.get("url", "")
                
                norm_url = normalize_stream_url(url)
                norm_name = name.lower()
                freq_val = extract_frequency(name) or extract_frequency(s.get("tags", ""))
                
                if norm_url in seen_urls or norm_name in seen_names or (freq_val and freq_val in seen_freqs):
                    continue 
                
                tested_count += 1
                status_text.text(f"Testing stream [{tested_count}/{scan_limit}]: {name[:30]}...")
                progress_bar.progress(tested_count / scan_limit)
                
                try:
                    r = requests.get(url, stream=True, timeout=1.5)
                    if r.status_code == 200:
                        genre = parse_genre(s.get("tags", ""), name)
                        codec = s.get("codec", "MP3")
                        bitrate = s.get("bitrate", "128")
                        freq_str = f"{freq_val} FM" if freq_val else "Web Stream"
                        
                        working_stations.append({
                            "name": name,
                            "english": name, 
                            "freq": freq_str,
                            "num_freq": freq_val or 999.9, 
                            "genre": genre,
                            "codec_info": f"{codec} · {bitrate} kbps",
                            "url": url
                        })
                        seen_urls.add(norm_url)
                        seen_names.add(norm_name)
                        if freq_val: seen_freqs.add(freq_val)
                    r.close()
                except:
                    pass
            
            working_stations.sort(key=lambda x: x.get("num_freq", 999.9))
            st.session_state.scanned_presets = working_stations
            progress_bar.empty()
            if working_stations:
                status_text.success(f"Scan complete! Discovered {len(working_stations)} new online stations.")
            else:
                status_text.warning("Scan complete. No new working stations found (or all were skipped).")
            time.sleep(2)
            st.rerun()

    if st.session_state.scanned_presets:
        st.markdown('<div class="section-label">Discovered Stations</div>', unsafe_allow_html=True)
        col_btn1, col_btn2 = st.columns([3, 1])
        with col_btn1: st.caption("Categorized via egyptradio.net mapping.")
        with col_btn2:
            if st.button("🗑 Clear Scan", key="clear_scan_results"):
                st.session_state.scanned_presets = []
                st.rerun()
                
        categories = defaultdict(list)
        for s in st.session_state.scanned_presets: categories[s['genre']].append(s)
            
        for genre, stations in sorted(categories.items()):
            st.markdown(f'<div class="sub-section-label">{genre} ({len(stations)})</div>', unsafe_allow_html=True)
            for i, station in enumerate(stations):
                is_playing = st.session_state.stream_url == station["url"]
                card_cls = "station-card playing" if is_playing else "station-card"
                badge = '<div class="station-playing-badge"><span class="blink-dot"></span>LIVE</div>' if is_playing else ""
                
                st.markdown(f"""<div class="{card_cls}" style="margin-left: 10px;">
                  <div class="station-name">{station['name']}</div>
                  <div class="station-meta">
                    <span class="freq">{station['freq']}</span>
                    <span class="genre">{station.get('codec_info', '')}</span>
                  </div>{badge}
                </div>""", unsafe_allow_html=True)
                
                col_play, col_add = st.columns([3, 1])
                with col_play:
                    if st.button(f"▶  Play", key=f"scan_play_{genre}_{i}"):
                        start_playing(station["url"], station["english"], 128)
                        st.session_state.status_msg = f"Connected to Scanned Station"
                        st.session_state.status_type = "success"
                        st.rerun()
                with col_add:
                    if st.button("➕  Add", key=f"scan_add_{genre}_{i}"):
                        st.session_state.presets.append(station)
                        st.session_state.scanned_presets.remove(station)
                        save_presets(st.session_state.presets)
                        st.rerun()

# ══════════════════════════════════════════════════════════════
#  TAB 4 — SEARCH
# ══════════════════════════════════════════════════════════════
with tab2:
    st.markdown('<div class="section-label">Smart Bilingual Search</div>', unsafe_allow_html=True)
    st.caption("🔍 Type in Arabic or English — automatically maps to correct categories!")
    
    col1, col2 = st.columns([3, 1])
    with col1:
        query=st.text_input("Station name or frequency",placeholder="e.g. quran, نجوم, jazz…",label_visibility="collapsed")
    with col2:
        country_filter=st.selectbox("Country",["EG","All","SA","AE","MA"],label_visibility="collapsed")
        
    if st.button("🔍  Search Stations",key="do_search"):
        if query.strip():
            with st.spinner("Translating & Searching global databases…"):
                results=search_stations(query.strip(),country_filter,limit=10)
                    
            st.session_state.search_results=results
            st.session_state.search_done=True
            st.session_state.last_search=query.strip()
            if not results: st.warning("No stations found. Try 'All' countries or a different name/frequency.")
        else:
            st.warning("Enter a station name or frequency first.")
            
    if st.session_state.search_done:
        results=st.session_state.search_results
        if results:
            st.markdown(f'<div class="section-label">{len(results)} results for "{st.session_state.last_search}"</div>',unsafe_allow_html=True)
            for i,s in enumerate(results):
                codec=s.get("codec","?"); bitrate=int(s.get("bitrate") or 128)
                votes=s.get("votes",0); country=s.get("countrycode","??")
                name=s.get("name","Unknown")
                url=s.get("url_resolved") or s.get("url","")
                
                genre_cat = parse_genre(s.get("tags", ""), name)
                
                mb_hr=calc_bytes(3600,bitrate)/1024/1024
                is_pl=st.session_state.stream_url==url
                card_cls="station-card playing" if is_pl else "station-card"
                badge='<div class="station-playing-badge"><span class="blink-dot"></span>LIVE</div>' if is_pl else ""
                
                st.markdown(f"""<div class="{card_cls}">
                  <div class="station-name">{name}</div>
                  <div class="station-meta">
                    <span class="freq">{codec} · {bitrate} kbps</span>
                    <span class="genre" style="color:#00e5ff;">{genre_cat}</span>
                    <span>{country} · ~{mb_hr:.0f} MB/hr</span>
                  </div>{badge}
                </div>""", unsafe_allow_html=True)
                
                col_play, col_add = st.columns([3, 1])
                with col_play:
                    if st.button("▶  Play",key=f"sr_{i}"):
                        resolved=resolve_playlist(url)
                        start_playing(resolved,name,bitrate)
                        st.session_state.status_msg=f"{codec} · {bitrate} kbps · {votes} votes"
                        st.session_state.status_type="success"
                        st.rerun()
                with col_add:
                    if st.button("➕  Save", key=f"search_save_{i}"):
                        new_preset = {
                            "name": name, "english": name, "url": url, 
                            "freq": f"{codec} · {bitrate} kbps", "genre": genre_cat
                        }
                        st.session_state.presets.append(new_preset)
                        save_presets(st.session_state.presets)
                        st.toast(f"Saved {name} to Presets!")

# ══════════════════════════════════════════════════════════════
#  TAB 5 — DIRECT URL
# ══════════════════════════════════════════════════════════════
with tab3:
    st.markdown('<div class="section-label">Paste Any Stream URL</div>', unsafe_allow_html=True)
    st.info("Supports: MP3 · AAC · HLS (.m3u8) · SHOUTcast · Icecast · .pls/.m3u playlists")
    direct_url=st.text_input("Stream URL",placeholder="https://stream.server.com:8000/live.mp3",key="direct_url")
    direct_name=st.text_input("Station name (optional)",placeholder="My Custom Station",key="direct_name")
    direct_kbps=st.slider("Bitrate kbps (for data estimate)",32,320,128,step=32,key="direct_kbps")
    d_mb_hr=calc_bytes(3600,direct_kbps)/1024/1024
    st.markdown(f"""<div class="rate-row" style="margin-bottom:14px;">
      <div class="rate-pill"><span class="dot-green"></span>{calc_bytes(60,direct_kbps)/1024:.0f} KB/min</div>
      <div class="rate-pill"><span class="dot-{'yellow' if d_mb_hr>50 else 'green'}"></span>{d_mb_hr:.0f} MB/hr</div>
    </div>""", unsafe_allow_html=True)
    col_a,col_b=st.columns(2)
    with col_a:
        if st.button("▶  Play URL",key="play_direct"):
            if direct_url.strip():
                resolved=resolve_playlist(direct_url.strip())
                start_playing(resolved,direct_name.strip() or direct_url.strip(),direct_kbps)
                st.session_state.status_msg=f"Direct URL · {direct_kbps} kbps"
                st.session_state.status_type="info"
                st.rerun()
            else: st.warning("Paste a URL first.")

# ─────────────────────────────────────────────────────────────
#  PLAYER & CONTROLS
# ─────────────────────────────────────────────────────────────
st.markdown("---")
if st.session_state.stream_url:
    url=st.session_state.stream_url; name=st.session_state.station_name or "Radio"
    msg=st.session_state.status_msg; mtyp=st.session_state.status_type
    if msg:
        icons={"success":"✓","warning":"⚠","error":"✗","info":"ℹ"}
        getattr(st,mtyp)(f"{icons.get(mtyp,'')} {msg}")
    
    # Render the Player HTML
    render_player(url,name)
    
    st.markdown('<div class="section-label" style="margin-top:20px;">Controls & Sleep Timer</div>',unsafe_allow_html=True)
    
    # Standard Controls
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("🔄  Refresh Stream",key="refresh"): st.rerun()
    with col_b:
        if st.button("⏹  Stop / Clear",key="stop"):
            elapsed=get_elapsed(); used=get_session_bytes()
            if elapsed>2:
                st.session_state.history.insert(0,{"name":name,"duration_sec":elapsed,"bytes":used,"stopped_at":datetime.datetime.now().strftime("%H:%M")})
                st.session_state.history=st.session_state.history[:10]
                st.session_state.total_bytes+=used
            st.session_state.stream_url=None; st.session_state.station_name=None
            st.session_state.play_start_ts=None; st.session_state.status_msg=""
            st.session_state.sleep_target=None
            st.rerun()
            
    # Sleep Timer Interface
    sleep_opts = [0, 15, 30, 60]
    sleep_labels = ["Off", "15m", "30m", "1 hour"]
    st.markdown('<div class="btn-sleep">', unsafe_allow_html=True)
    col_s = st.columns(4)
    for i, mins in enumerate(sleep_opts):
        if col_s[i].button(f"🌙 {sleep_labels[i]}", key=f"sleep_{mins}"):
            if mins == 0:
                st.session_state.sleep_target = None
            else:
                st.session_state.sleep_target = time.time() + (mins * 60)
            st.rerun()
            
    # Custom Sleep Timer Input
    st.markdown('<div style="margin-top: 8px;"></div>', unsafe_allow_html=True)
    col_c1, col_c2 = st.columns([3, 1])
    with col_c1:
        custom_mins = st.number_input("Custom timer (minutes)", min_value=1, max_value=720, value=45, label_visibility="collapsed")
    with col_c2:
        if st.button("⏱️ Set", key="sleep_custom", use_container_width=True):
            st.session_state.sleep_target = time.time() + (custom_mins * 60)
            st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Auto-updating Countdown Fragment
    @st.fragment(run_every=1)
    def render_sleep_countdown():
        if st.session_state.sleep_target:
            rem = max(0, int(st.session_state.sleep_target - time.time()))
            if rem > 0:
                st.markdown(f'<div style="text-align:center; font-family:\'Space Mono\',monospace; font-size:12px; font-weight:700; color:#a855f7; margin-top:8px;">⏱️ Stream stops in: {seconds_to_hms(rem)}</div>', unsafe_allow_html=True)

    render_sleep_countdown()

    with st.expander("📋  Stream URL (copy)"):
        st.code(url,language=None)
else:
    st.markdown("""<div style="text-align:center;padding:44px 20px;border:1px dashed #1e1e30;border-radius:14px;
        font-family:'Space Mono',monospace;color:#2a2a45;font-size:13px;line-height:2.2;">
        📻<br>Select a preset station above<br>or search for any radio station worldwide
    </div>""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────
#  REFERENCE TABLE
# ─────────────────────────────────────────────────────────────
with st.expander("📖  Data usage reference"):
    st.markdown("""<table class="ref-table">
    <tr><th>BITRATE</th><th>PER MIN</th><th>PER HOUR</th><th>PER DAY</th><th>QUALITY</th></tr>
    <tr><td>32 kbps</td><td>0.2 MB</td><td class="g">14 MB</td><td class="g">346 MB</td><td>Low — voice only</td></tr>
    <tr><td>64 kbps</td><td>0.5 MB</td><td class="g">29 MB</td><td class="g">691 MB</td><td>Decent mono</td></tr>
    <tr><td>96 kbps</td><td>0.7 MB</td><td class="g">43 MB</td><td class="y">1.0 GB</td><td>Good mono</td></tr>
    <tr><td>128 kbps</td><td>1.0 MB</td><td class="y">58 MB</td><td class="y">1.4 GB</td><td>Standard stereo ← most Egypt stations</td></tr>
    <tr><td>192 kbps</td><td>1.4 MB</td><td class="y">86 MB</td><td class="r">2.1 GB</td><td>High quality</td></tr>
    <tr><td>320 kbps</td><td>2.4 MB</td><td class="r">144 MB</td><td class="r">3.5 GB</td><td>Near lossless</td></tr>
    </table>""", unsafe_allow_html=True)

st.markdown("""<div style="margin-top:48px;padding-top:16px;border-top:1px solid #1e1e30;
    font-family:'Space Mono',monospace;font-size:10px;color:#2a2a45;
    display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
  <span>Powered by radio.garden · egyptradio.net</span>
  <span>Egypt FM · No Antenna · No Noise</span>
</div>""", unsafe_allow_html=True)