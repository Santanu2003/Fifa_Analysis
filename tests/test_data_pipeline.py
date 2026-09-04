from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
def test_required_csvs_exist():
    required={"wc_awards_1930_2026.csv","wc_editions_1930_2026.csv","wc_group_standings_1930_2026.csv","wc_match_discipline_1930_2026.csv","wc_matches_1930_2026.csv","wc_squads_1930_2026.csv","wc_team_confederations.csv","wc_top_scorers_1930_2026.csv"}
    assert required.issubset({p.name for p in DATA.rglob('*.csv')})
def test_match_scores_non_negative():
    f=next(DATA.rglob('wc_matches_1930_2026.csv')); df=pd.read_csv(f)
    assert (df.home_score>=0).all() and (df.away_score>=0).all()
