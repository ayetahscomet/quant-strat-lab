# --- src/models/alpha_capture.py ---

import pandas as pd
import numpy as np
from datetime import datetime

def load_ideas(path):
    return pd.read_csv(path, parse_dates = ["data"], index_col = 0)

def aggregate_daily_scores(ideas_df, start_date, end_date, decay_lambda = 0.5):
    """
    ideas_df columns: date, pair, sentiment, confidence, horizon, text
    Returns DataFrame: index = dates, columns = pairs, values = aggregated score
    """

    dates = pd.date_range(start = start_date, end = end_date, freq = "B")
    pairs = ideas_df['pairs'].unique().tolist()
    scores = pd.DataFrame(0.0, index = dates, columns = pairs)

    # Pre-sort ideas by date

    ideas_df = ideas_df.sort_values("date")
    for idx, idea in ideas_df.iterrows():
        idea_date = idea['date'].date() if isinstance(idea['date'], pd.Timestamp) else idea['date']
        idea_date = pd.to_datetime(idea_date)
        pair = idea['pair']
        sentiment = idea['sentiment']
        conf = idea['confidence']
        horizon = int(idea['horizon'])
        # idea contributes for horizon days (including that day)
        for d_i in range(horizon):
            day = idea_date + pd.Timedelta(days=d_i)
            if day in scores.index:
                age = d_i  # zero on same day
                weight = conf * np.exp(-decay_lambda * age)
                scores.at[day, pair] += sentiment * weight
    return scores

if __name__ == "__main__":
    from src.data.generator import save_synthetic
    from src.models.alpha_capture import aggregate_daily_scores, load_ideas
    r, reg, ideas = save_synthetic(n_days=120)
    ideas_df = load_ideas("data/synthetic/analyst_ideas.csv")
    scores = aggregate_daily_scores(ideas_df, r.index.min(), r.index.max())
    print(scores.iloc[:5])
