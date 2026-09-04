from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]; P=ROOT/"data/processed"
m=pd.read_csv(P/"wc_matches_1930_2026.csv"); e=pd.read_csv(P/"wc_editions_1930_2026.csv"); s=pd.read_csv(P/"wc_top_scorers_1930_2026.csv")
team=[]
for side in ["home","away"]:
    t=m[["year",f"{side}_team",f"{side}_score"]].copy().rename(columns={f"{side}_team":"team",f"{side}_score":"gf"})
    t["ga"]=m["away_score" if side=="home" else "home_score"].values
    t["win"]=(t.gf>t.ga).astype(int); t["draw"]=(t.gf==t.ga).astype(int); t["loss"]=(t.gf<t.ga).astype(int)
    team.append(t)
t=pd.concat(team,ignore_index=True).dropna(subset=["gf","ga"])
appearances=t.groupby("team")["year"].nunique().rename("appearances")
t=t.groupby("team",as_index=False).agg(matches=("team","size"),goals_for=("gf","sum"),goals_against=("ga","sum"),wins=("win","sum"),draws=("draw","sum"),losses=("loss","sum"))
titles=e["champion"].value_counts().rename("titles")
t=t.merge(appearances,on="team",how="left").merge(titles,left_on="team",right_index=True,how="left")
t["appearances"]=t["appearances"].fillna(0).astype(int); t["titles"]=t["titles"].fillna(0).astype(int)
t["win_percentage"]=(t.wins/t.matches*100).round(2)
t=t[["team","appearances","titles","matches","wins","draws","losses","goals_for","goals_against","win_percentage"]]
t=t.sort_values(["titles","wins","goals_for"],ascending=False); t.to_csv(P/"team_all_time_statistics.csv",index=False)
e[["year","host","champion","runner_up","teams","matches","goals","goals_per_match","host_won"]].to_csv(P/"tournament_summary.csv",index=False)
s.sort_values("goals",ascending=False).to_csv(P/"top_scorers_summary.csv",index=False)
print("Analytics tables generated.")
