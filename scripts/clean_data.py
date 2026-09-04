from pathlib import Path
import pandas as pd, numpy as np

ROOT=Path(__file__).resolve().parents[1]; RAW=ROOT/'data/raw'; OUT=ROOT/'data/processed'; OUT.mkdir(exist_ok=True)

def clean_text(df):
    for c in df.select_dtypes(include='object').columns:
        df[c]=df[c].astype('string').str.strip().replace({'':pd.NA,'nan':pd.NA,'None':pd.NA})
    return df

for f in RAW.glob('*.csv'):
    df=pd.read_csv(f)
    df=clean_text(df).drop_duplicates().reset_index(drop=True)
    for c in df.columns:
        if c in {'year','edition','played','won','drawn','lost','goals_for','goals_against','goal_diff','points','group_rank','home_yellow_cards','away_yellow_cards','home_red_cards','away_red_cards','home_second_yellow_reds','away_second_yellow_reds','total_yellow_cards','total_red_cards','home_score','away_score','total_goals','home_penalty_shootout','away_penalty_shootout','golden_boot_goals','goals','assists','penalties','matches_played','age','birth_year'}:
            df[c]=pd.to_numeric(df[c],errors='coerce')
    for c in [x for x in ['start_date','end_date','date'] if x in df.columns]:
        df[c]=pd.to_datetime(df[c],errors='coerce')
    # Derived/validated match metrics.
    if {'home_score','away_score','total_goals'}.issubset(df.columns):
        valid=df['home_score'].notna() & df['away_score'].notna()
        df.loc[valid,'total_goals']=df.loc[valid,'home_score']+df.loc[valid,'away_score']
        # goal_diff is stored as signed home-away difference in the source.
        df.loc[valid,'goal_diff']=df.loc[valid,'home_score']-df.loc[valid,'away_score']
    df.to_csv(OUT/f.name,index=False)
print('Cleaned datasets written to data/processed/')
