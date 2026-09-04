from pathlib import Path
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]; P=ROOT/'data/processed'; OUT=P/'validation_report.txt'
checks=[]

def add(name, ok, detail): checks.append((name,'PASS' if ok else 'FAIL',detail))

e=pd.read_csv(P/'wc_editions_1930_2026.csv'); m=pd.read_csv(P/'wc_matches_1930_2026.csv'); g=pd.read_csv(P/'wc_group_standings_1930_2026.csv'); d=pd.read_csv(P/'wc_match_discipline_1930_2026.csv')
add('Edition uniqueness', e.year.is_unique, f"duplicate years={e.year.duplicated().sum()}")
add('Match key uniqueness', ~m.duplicated(['year','date','round','home_team','away_team']).any(), 'compound match key')
add('Discipline joins matches', len(m.merge(d,on=['year','date','round','home_team','away_team'],how='outer'))==len(m), 'all discipline rows match a match key')
add('Match total goals', ((m.home_score+m.away_score).fillna(0)==m.total_goals.fillna(0)).all(), 'recomputed total_goals')
add('Group standings nonnegative', (g[['played','won','drawn','lost','points']]>=0).all().all(), 'basic nonnegative check')
with OUT.open('w',encoding='utf-8') as f:
    for n,s,x in checks: f.write(f'{s}: {n} — {x}\n')
print(OUT.read_text())
