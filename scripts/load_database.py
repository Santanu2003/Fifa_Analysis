import os
from pathlib import Path
import pandas as pd
import psycopg2

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'/'processed'
DB=os.getenv('DATABASE_URL','postgresql://fifa:fifa_password@localhost:5432/fifa_world_cup')
TABLES={
 'wc_editions_1930_2026.csv':'editions','wc_matches_1930_2026.csv':'matches',
 'wc_group_standings_1930_2026.csv':'group_standings','wc_top_scorers_1930_2026.csv':'top_scorers',
 'wc_awards_1930_2026.csv':'awards','wc_squads_1930_2026.csv':'squads','wc_match_discipline_1930_2026.csv':'match_discipline'
}

def clean(df, table):
    df=df.copy(); df.columns=[c.lower() for c in df.columns]
    if 'goal_diff' in df and 'home_score' in df: df['goal_diff']=df.home_score-df.away_score
    if 'data_available' in df: df['data_available']=df.data_available.fillna(False).astype(bool)
    if table=='editions': df['host_won']=df['host_won'].astype(str)
    df=df.where(pd.notna(df),None)
    return df

def insert(cur, table, df):
    cols=list(df.columns); sql=f"INSERT INTO {table} ({','.join(cols)}) VALUES ({','.join(['%s']*len(cols))}) ON CONFLICT DO NOTHING"
    cur.executemany(sql,[tuple(row) for row in df.itertuples(index=False,name=None)])

with psycopg2.connect(DB) as conn:
  with conn.cursor() as cur:
    cur.execute((ROOT/'database'/'schema.sql').read_text())
    for file,table in TABLES.items():
      df=clean(pd.read_csv(DATA/file),table)
      insert(cur,table,df)
    teams=set()
    m=pd.read_csv(DATA/'wc_matches_1930_2026.csv')
    teams |= set(m.home_team.dropna()) | set(m.away_team.dropna())
    conf=pd.read_csv(DATA/'wc_team_confederations.csv')
    confmap=conf.set_index('team').to_dict('index')
    for t in sorted(teams):
      x=confmap.get(t,{})
      cur.execute('INSERT INTO teams(team_name,confederation,continent) VALUES(%s,%s,%s) ON CONFLICT(team_name) DO UPDATE SET confederation=EXCLUDED.confederation, continent=EXCLUDED.continent',(t,x.get('confederation'),x.get('continent')))
  conn.commit()
print('Database loaded successfully.')
