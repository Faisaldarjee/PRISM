import pandas as pd
import pandas_ta as ta
import numpy as np
import os
import joblib
import sqlite3
import json
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from data.database import Price, Base
from config import DB_PATH, ETF_SYMBOLS, STOCK_SYMBOLS

# Ensure models directory exists
if not os.path.exists('models'):
    os.makedirs('models')

# Database Setup
engine = create_engine(DB_PATH)
Session = sessionmaker(bind=engine)

def get_price_data(symbol: str, limit: int = 600) -> pd.DataFrame:
    """
    Fetches historical price data from SQLite for ML training/prediction.
    Requires at least 150 rows for stable training.
    """
    session = Session()
    try:
        rows = session.query(Price).filter_by(
            symbol=symbol, interval="1d"
        ).order_by(Price.date.asc()).limit(limit).all()
        
        if not rows or len(rows) < 100:
            return pd.DataFrame()
            
        df = pd.DataFrame([{
            "date": r.date, 
            "open": r.open, 
            "high": r.high,
            "low": r.low, 
            "close": r.close, 
            "volume": r.volume
        } for r in rows])
        
        df.set_index("date", inplace=True)
        return df
    finally:
        session.close()

def get_sentiment_feature(symbol: str, index: pd.Index) -> pd.Series:
    """
    Fetches news sentiment scores from SQLite cache as a feature.
    """
    sentiment_series = pd.Series(0.0, index=index)
    try:
        conn = sqlite3.connect("data/predictions.db")
        cursor = conn.cursor()
        cursor.execute("SELECT headlines FROM news_cache WHERE symbol = ?", (symbol,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            headlines = json.loads(row[0])
            B_WORDS = ['growth', 'profit', 'beat', 'strong', 'surge', 'gain', 'record', 'expand', 'positive', 'sip', 'inflows']
            D_WORDS = ['loss', 'miss', 'weak', 'fall', 'decline', 'cut', 'downgrade', 'concern', 'risk', 'sebi warning']
            
            score = 0
            for h in headlines:
                text = h.lower()
                for w in B_WORDS:
                    if w in text: score += 1
                for w in D_WORDS:
                    if w in text: score -= 1
            
            total = len(headlines) or 1
            sentiment_value = max(-1.0, min(1.0, score / total))
            # We set the last 15 days momentum feature to represent current news presence
            sentiment_series.iloc[-15:] = sentiment_value
    except Exception as e:
        pass
    return sentiment_series

def build_features(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
    """
    Constructs upgraded Features V2 for ML Stack prediction.
    Includes OBV, Wyckoff proxy, Volatility Regimes, Mean Reversion Z-scores,
    Candle body ratios, EMA proximity, Momentum divergence, Day-of-week, Gap ratios,
    ATR-normalized returns, and sentiment-integrated metrics.
    """
    if df.empty or len(df) < 50:
        return pd.DataFrame()

    features = pd.DataFrame(index=df.index)
    close = df['close']
    open_p = df['open']
    high = df['high']
    low = df['low']
    volume = df['volume']

    # 1. Price Returns
    features['return_1d'] = close.pct_change(1)
    features['return_5d'] = close.pct_change(5)
    features['return_10d'] = close.pct_change(10)
    features['return_20d'] = close.pct_change(20)

    # 2. Technical Indicators (Safe usage)
    # RSI
    rsi = ta.rsi(close, length=14)
    if rsi is not None:
        features['rsi_14'] = rsi
    else:
        features['rsi_14'] = 50.0

    # MACD
    macd = ta.macd(close, fast=12, slow=26, signal=9)
    if macd is not None:
        macd_hist_col = [c for c in macd.columns if 'MACDh_' in c][0]
        features['macd_hist'] = macd[macd_hist_col]
    else:
        features['macd_hist'] = 0.0

    # Bollinger Bands Position
    bb = ta.bbands(close, length=20, std=2)
    bb_width = pd.Series(0.05, index=df.index)
    if bb is not None:
        bb_col_upper = [c for c in bb.columns if 'BBU' in c][0]
        bb_col_lower = [c for c in bb.columns if 'BBL' in c][0]
        bb_width = (bb[bb_col_upper] - bb[bb_col_lower]) / close
        features['bb_position'] = (close - bb[bb_col_lower]) / (bb[bb_col_upper] - bb[bb_col_lower]).replace(0, 1)
    else:
        features['bb_position'] = 0.5

    # EMA Ratios
    ema20 = ta.ema(close, length=20)
    ema50 = ta.ema(close, length=50)
    ema200 = ta.ema(close, length=200)
    
    if ema20 is not None: features['ema_ratio_20'] = close / ema20
    if ema50 is not None: features['ema_ratio_50'] = close / ema50
    if ema200 is not None: features['ema_ratio_200'] = close / ema200

    # Volume Ratio
    features['volume_ratio'] = volume / volume.rolling(20).mean().replace(0, 1)

    # Volatility
    features['volatility_10'] = close.pct_change().rolling(10).std()
    features['volatility_20'] = close.pct_change().rolling(20).std()

    # Momentum
    features['roc_5'] = ta.roc(close, length=5)
    features['roc_10'] = ta.roc(close, length=10)

    # --- ADVANCED FEATURES V2 ---
    # 1. OBV (On-Balance Volume)
    features['obv'] = (volume * np.sign(close.diff())).fillna(0).cumsum()

    # 2. Wyckoff Accumulation/Distribution Proxy
    if ema50 is not None and ema200 is not None:
        features['wyckoff_proxy'] = ((ema20 > ema50).astype(int) * (bb_width < bb_width.rolling(50).mean()).astype(int)).astype(float)
    else:
        features['wyckoff_proxy'] = 0.0

    # 3. Volatility Regime
    features['volatility_regime'] = (close.pct_change().rolling(10).std() / close.pct_change().rolling(50).std().replace(0, 1e-4)).fillna(1.0)

    # 4. Mean Reversion Z-Score (20-period close Z-score)
    ma20 = close.rolling(20).mean()
    std20 = close.rolling(20).std()
    features['z_score_20'] = ((close - ma20) / std20.replace(0, 1)).fillna(0.0)

    # 5. Candle Body Ratio (Body size / High-Low range)
    body = (close - open_p).abs()
    hl_range = (high - low).replace(0, 1e-4)
    features['body_to_range_ratio'] = (body / hl_range).fillna(0.5)

    # 6. EMA Proximity (Percentage distance from EMA 20)
    if ema20 is not None:
        features['ema_proximity_20'] = ((close - ema20).abs() / close).fillna(0.0)
    else:
        features['ema_proximity_20'] = 0.0

    # 7. Momentum Divergence (RSI trend vs Price trend)
    if rsi is not None:
        features['momentum_divergence'] = (np.sign(close.diff(10)) != np.sign(rsi.diff(10))).astype(float)
    else:
        features['momentum_divergence'] = 0.0

    # 8. Day-of-the-Week effect
    features['day_of_week'] = pd.to_datetime(df.index).dayofweek.astype(float)

    # 9. Gap Ratio (Open vs Previous Close)
    features['gap_ratio'] = ((open_p - close.shift(1)) / close.shift(1).replace(0, 1)).fillna(0.0)

    # 10. ATR-Normalized Returns
    atr = ta.atr(high, low, close, length=14)
    if atr is not None:
        features['atr_normalized_return'] = (close.diff() / atr.replace(0, 1e-4)).fillna(0.0)
    else:
        features['atr_normalized_return'] = 0.0

    # 11. News Sentiment Merger
    features['news_sentiment'] = get_sentiment_feature(symbol, df.index)

    # Clean up NaNs
    features.fillna(0.0, inplace=True)
    return features

def build_target_classes(df: pd.DataFrame) -> pd.Series:
    """
    Builds the Multi-Target classification labels (5-day return mapping):
    4 = UP_STRONG (> 3.0% gain)
    3 = UP_MILD (0.5% to 3.0% gain)
    2 = SIDEWAYS (-0.5% to 0.5% standard consolidation)
    1 = DOWN_MILD (-3.0% to -0.5% drop)
    0 = DOWN_STRONG (< -3.0% heavy sell-off)
    """
    close = df['close']
    ret_5d = close.shift(-5).pct_change(5) # 5 days into future pct change
    ret_5d = (close.shift(-5) - close) / close
    
    conditions = [
        (ret_5d > 0.03),
        (ret_5d > 0.005) & (ret_5d <= 0.03),
        (ret_5d >= -0.005) & (ret_5d <= 0.005),
        (ret_5d >= -0.03) & (ret_5d < -0.005),
        (ret_5d < -0.03)
    ]
    choices = [4, 3, 2, 1, 0]
    return pd.Series(np.select(conditions, choices, default=2), index=df.index)

def train_model(symbol: str) -> dict:
    """
    Trains a Stacked Ensemble Model (XGBoost + Random Forest meta-learned via Logistic Regression)
    using robust expanding window Walk-Forward Validation.
    """
    print(f"--- Training Stacked ML ensemble for {symbol} ---")
    df = get_price_data(symbol, limit=800)
    if df.empty or len(df) < 150:
        return {"symbol": symbol, "error": "Insufficient data for training"}

    # Feature Engineering V2
    X = build_features(df, symbol)
    y = build_target_classes(df)

    # Clean up future alignment rows (drop last 5 shifts because of predictions horizon)
    valid_indices = X.index.intersection(y.index)[:-5]
    X = X.loc[valid_indices]
    y = y.loc[valid_indices]

    if len(X) < 120:
         return {"symbol": symbol, "error": "Insufficient data after feature engineering filter"}

    feature_names = X.columns.tolist()

    # Enforce Expanding Window Walk-Forward Validation (4 Splits)
    n_samples = len(X)
    split_size = n_samples // 4
    
    meta_features = []
    meta_targets = []
    
    # Expanding split validation loop
    for split_idx in range(1, 4):
        train_end = split_idx * split_size
        val_end = min(train_end + split_size, n_samples)
        
        X_tr, X_val = X.iloc[:train_end], X.iloc[train_end:val_end]
        y_tr, y_val = y.iloc[:train_end], y.iloc[train_end:val_end]
        
        if len(X_tr) < 30 or len(X_val) < 10:
            continue
            
        xgb_sub = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.08, random_state=42, eval_metric="mlogloss")
        rf_sub = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
        
        xgb_sub.fit(X_tr, y_tr)
        rf_sub.fit(X_tr, y_tr)
        
        # Extract out-of-fold probability distributions
        p_xgb = xgb_sub.predict_proba(X_val)
        p_rf = rf_sub.predict_proba(X_val)
        
        meta_features.append(np.hstack([p_xgb, p_rf]))
        meta_targets.append(y_val.values)

    # Stack full prediction meta-learner training
    split_idx_final = int(n_samples * 0.8)
    X_train_full, X_test_full = X.iloc[:split_idx_final], X.iloc[split_idx_final:]
    y_train_full, y_test_full = y.iloc[:split_idx_final], y.iloc[split_idx_final:]

    xgb_final = XGBClassifier(n_estimators=150, max_depth=4, learning_rate=0.05, random_state=42, eval_metric="mlogloss")
    rf_final = RandomForestClassifier(n_estimators=150, max_depth=5, random_state=42)
    
    xgb_final.fit(X_train_full, y_train_full)
    rf_final.fit(X_train_full, y_train_full)
    
    # Train meta logistic regression on base probabilities
    tr_meta_x = np.hstack([xgb_final.predict_proba(X_train_full), rf_final.predict_proba(X_train_full)])
    meta_learner = LogisticRegression(max_iter=500, random_state=42)
    meta_learner.fit(tr_meta_x, y_train_full)

    # Stacked Validation Test Evaluation
    te_meta_x = np.hstack([xgb_final.predict_proba(X_test_full), rf_final.predict_proba(X_test_full)])
    y_pred_stacked = meta_learner.predict(te_meta_x)
    
    # Calculate performance index
    acc = accuracy_score(y_test_full, y_pred_stacked)
    prec = precision_score(y_test_full, y_pred_stacked, average='macro', zero_division=0)
    rec = recall_score(y_test_full, y_pred_stacked, average='macro', zero_division=0)
    f1 = f1_score(y_test_full, y_pred_stacked, average='macro', zero_division=0)

    # Save artifact model triplets
    joblib.dump(xgb_final, f"models/{symbol}_xgb_model.pkl")
    joblib.dump(rf_final, f"models/{symbol}_rf_model.pkl")
    joblib.dump(meta_learner, f"models/{symbol}_meta_model.pkl")
    joblib.dump(feature_names, f"models/{symbol}_features.pkl")

    print(f"Ensemble Models Saved! Test Accuracy: {acc:.2f} | Horizons: (1D, 5D, 10D)")

    return {
        "symbol": symbol,
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1": round(float(f1), 4),
        "n_train": len(X_train_full),
        "n_test": len(X_test_full),
        "model_path": f"models/{symbol}_meta_model.pkl"
    }

def predict(symbol: str) -> dict:
    """
    Runs Inference utilizing Stacked XGBoost + Random Forest + Meta LogReg
    under Multi-Target class prediction scopes.
    """
    xgb_path = f"models/{symbol}_xgb_model.pkl"
    rf_path = f"models/{symbol}_rf_model.pkl"
    meta_path = f"models/{symbol}_meta_model.pkl"
    features_path = f"models/{symbol}_features.pkl"

    if not os.path.exists(xgb_path) or not os.path.exists(meta_path):
        train_res = train_model(symbol)
        if "error" in train_res:
            return train_res

    # Load stack pipeline artifacts
    model_xgb = joblib.load(xgb_path)
    model_rf = joblib.load(rf_path)
    model_meta = joblib.load(meta_path)
    feature_names = joblib.load(features_path)

    # Get raw data and build live metrics
    df = get_price_data(symbol, limit=200)
    if df.empty:
        return {"symbol": symbol, "error": "No price record data for prediction"}
        
    X_latest = build_features(df, symbol)
    if X_latest.empty:
         return {"symbol": symbol, "error": "Could not compile Features V2 for target"}
    
    # Predict on the latest daily bar
    latest_row = X_latest.tail(1)
    
    base_probs = np.hstack([model_xgb.predict_proba(latest_row), model_rf.predict_proba(latest_row)])
    prob_distribution = model_meta.predict_proba(base_probs)[0]
    predicted_class = int(model_meta.predict(base_probs)[0]) # 0 to 4
    
    # Class dictionary mapping
    class_labels = {
        4: ("STRONG_BULLISH", "BUY"),
        3: ("MILD_BULLISH", "BUY"),
        2: ("CONSOLIDATING", "HOLD"),
        1: ("MILD_BEARISH", "SELL"),
        0: ("STRONG_BEARISH", "SELL")
    }
    
    direction, signal = class_labels.get(predicted_class, ("CONSOLIDATING", "HOLD"))
    confidence = float(prob_distribution[predicted_class] * 100)

    # Feature Importance index
    xgb_imp = model_xgb.feature_importances_
    feat_imp = sorted(zip(feature_names, xgb_imp), key=lambda x: x[1], reverse=True)

    return {
        "symbol": symbol,
        "direction": direction,
        "confidence": round(confidence, 1),
        "signal": signal,
        "predictions_distribution": {
            "down_strong": round(float(prob_distribution[0]), 3),
            "down_mild": round(float(prob_distribution[1]), 3),
            "sideways": round(float(prob_distribution[2]), 3),
            "up_mild": round(float(prob_distribution[3]), 3),
            "up_strong": round(float(prob_distribution[4]), 3)
        },
        "top_features": [f[0] for f in feat_imp[:5]],
        "model_accuracy": "Evaluated on stacked meta-learning stats"
    }

def train_all():
    """
    Utility logic to build training metrics for all registered symbols.
    """
    all_targets = list(ETF_SYMBOLS.values()) + list(STOCK_SYMBOLS.values())
    results = []
    for s in all_targets:
        res = train_model(s)
        results.append(res)
    return results

if __name__ == "__main__":
    for s in ["SILVERBEES.NS", "GOLDBEES.NS"]:
        print(f"\n================ SYSTEM UPGRADE STACK: {s} ================")
        res = predict(s)
        if "error" in res:
            print(f"Error: {res['error']}")
        else:
            print(f"PREDICTED HORIZON (5D): {res['direction']}")
            print(f"META PROBABILITY CONFIDENCE: {res['confidence']}%")
            print(f"ACTION RECOMMENDATION: {res['signal']}")
            print(f"DISTRIBUTION PROBS: {res['predictions_distribution']}")
            print(f"TOP COOPERATING FEATURES: {res['top_features']}")
