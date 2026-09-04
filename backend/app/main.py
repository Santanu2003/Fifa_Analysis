from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import pandas as pd

app = FastAPI(title="FIFA World Cup Analytics API", version="3.0.0")
# allow_origins=["*"] together with allow_credentials=True is an invalid CORS combination
# (browsers reject wildcard-origin + credentialed responses) and isn't needed here anyway,
# since the frontend's fetch() calls never send credentials.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

# The on-disk layout differs between a native/Render run (repo checked out as-is, so
# main.py sits at <repo>/backend/app/main.py and data at <repo>/data/processed, two levels
# up) and the Docker image (backend/Dockerfile copies main.py to /app/app/main.py and data
# to /app/data/processed, one level up). Checking both candidates - plus an optional
# WC_DATA_DIR override for any other hosting layout - avoids a silent path mismatch that
# would otherwise make every endpoint fail with "Dataset not found".
_here = Path(__file__).resolve()
_candidates = [
    Path(os.environ["WC_DATA_DIR"]) if os.environ.get("WC_DATA_DIR") else None,
    _here.parents[2] / "data" / "processed",
    _here.parents[1] / "data" / "processed",
]
DATA = next((c.resolve() for c in _candidates if c and c.exists()), _candidates[1].resolve())

def read(name):
    p = DATA / name
    if not p.exists(): raise HTTPException(500, f"Dataset not found: {name}")
    return pd.read_csv(p)

def clean_records(df):
    return df.astype(object).where(pd.notna(df), None).to_dict("records")

def norm(s): return str(s).strip().casefold()

# Extra per-team podium/stage stats not present in team_all_time_statistics.csv, derived
# from the editions file (runner-up / third / fourth place finishes) and the match log
# (how many editions a team's run included a knockout-stage match vs. editions where every
# match played that year was tagged Group Stage, i.e. eliminated in the group stage).
# Recomputed per-request like every other endpoint here (dataset is small).
def team_stage_stats():
    e = read("wc_editions_1930_2026.csv")
    m = read("wc_matches_1930_2026.csv")
    stats = {}
    def blank(): return {"runner_up":0,"third_place":0,"fourth_place":0,"knockout_editions":0,"group_stage_only_editions":0}
    def bump(team, key):
        if not isinstance(team,str) or not team.strip(): return
        k = norm(team)
        stats.setdefault(k, blank())
        stats[k][key] += 1
    for _, r in e.iterrows():
        bump(r.get("runner_up"), "runner_up")
        bump(r.get("third_place"), "third_place")
        bump(r.get("fourth_place"), "fourth_place")
    long = pd.concat([
        m[["year","home_team","stage_type"]].rename(columns={"home_team":"team"}),
        m[["year","away_team","stage_type"]].rename(columns={"away_team":"team"}),
    ])
    for team, grp in long.groupby("team"):
        k = norm(team)
        stats.setdefault(k, blank())
        by_year = grp.groupby("year")["stage_type"].apply(lambda s: set(s))
        stats[k]["knockout_editions"] = int(sum(1 for s in by_year if "Knockout" in s))
        stats[k]["group_stage_only_editions"] = int(sum(1 for s in by_year if "Knockout" not in s and "Group Stage" in s))
    return stats

def with_stage_stats(df):
    extra = team_stage_stats()
    blank = {"runner_up":0,"third_place":0,"fourth_place":0,"knockout_editions":0,"group_stage_only_editions":0}
    df = df.copy()
    for key in blank:
        df[key] = df.team.map(lambda t: extra.get(norm(t), blank)[key])
    return df

@app.get("/api/health")
def health(): return {"status":"ok","service":"fifa-world-cup-api","version":"3.0.0"}

@app.get("/api/editions")
def editions(): return clean_records(read("wc_editions_1930_2026.csv").sort_values("year"))

@app.get("/api/editions/{year}")
def edition(year:int):
    d=read("wc_editions_1930_2026.csv"); r=d[d.year.eq(year)]
    if r.empty: raise HTTPException(404,"Tournament not found")
    return clean_records(r)

@app.get("/api/teams")
def teams(limit:int=Query(200,ge=1,le=300), confederation:str|None=None):
    d=read("team_all_time_statistics.csv")
    if confederation and "confederation" in d.columns: d=d[d.confederation.str.casefold().eq(confederation.casefold())]
    d=with_stage_stats(d.sort_values(["titles","wins","goals_for"],ascending=False).head(limit))
    return clean_records(d)

@app.get("/api/teams/{team}")
def team(team:str):
    d=read("team_all_time_statistics.csv"); r=d[d.team.map(norm).eq(norm(team))]
    if r.empty: raise HTTPException(404,"Team not found")
    return clean_records(with_stage_stats(r))[0]

@app.get("/api/teams/compare/{team_a}/{team_b}")
def compare(team_a:str,team_b:str):
    d=with_stage_stats(read("team_all_time_statistics.csv"))
    a=d[d.team.map(norm).eq(norm(team_a))]; b=d[d.team.map(norm).eq(norm(team_b))]
    if a.empty or b.empty: raise HTTPException(404,"One or both teams not found")
    A=clean_records(a)[0]; B=clean_records(b)[0]
    m=read("wc_matches_1930_2026.csv")
    na,nb=norm(A["team"]),norm(B["team"])
    h2h=m[(m.home_team.map(norm).eq(na)&m.away_team.map(norm).eq(nb))|(m.home_team.map(norm).eq(nb)&m.away_team.map(norm).eq(na))].sort_values(["year","date"])
    wins_a=wins_b=draws=goals_a=goals_b=0
    for _,r in h2h.iterrows():
        home_is_a=norm(r.home_team)==na
        ga,gb=(r.home_score,r.away_score) if home_is_a else (r.away_score,r.home_score)
        goals_a+=ga; goals_b+=gb
        if ga>gb: wins_a+=1
        elif gb>ga: wins_b+=1
        else: draws+=1
    return {"team_a":A,"team_b":B,"head_to_head":{
        "matches_played":len(h2h),"wins_a":wins_a,"wins_b":wins_b,"draws":draws,
        "goals_a":goals_a,"goals_b":goals_b,"matches":clean_records(h2h)
    }}

@app.get("/api/matches")
def matches(year:int|None=None, team:str|None=None, round:str|None=None, limit:int=Query(2000,ge=1,le=5000)):
    d=read("wc_matches_1930_2026.csv")
    if year is not None: d=d[d.year.eq(year)]
    if team: d=d[d.home_team.map(norm).str.contains(norm(team),na=False) | d.away_team.map(norm).str.contains(norm(team),na=False)]
    if round: d=d[d["round"].map(norm).eq(norm(round))]
    return clean_records(d.sort_values(["year","date"]).head(limit))

@app.get("/api/group-standings")
def standings(year:int|None=None, group:str|None=None):
    d=read("wc_group_standings_1930_2026.csv")
    if year is not None: d=d[d.year.eq(year)]
    if group: d=d[d["group"].map(norm).eq(norm(group))]
    return clean_records(d.sort_values(["year","group","group_rank"]))

@app.get("/api/top-scorers")
def scorers(limit:int=Query(100,ge=1,le=500)):
    d=read("wc_top_scorers_1930_2026.csv")
    return clean_records(d.sort_values("goals",ascending=False).head(limit))

@app.get("/api/leaders/goals")
def leaders_goals(): return clean_records(read("wc_alltime_top_goalscorers.csv").sort_values("rank"))

@app.get("/api/leaders/assists")
def leaders_assists(): return clean_records(read("wc_alltime_top_assisters.csv").sort_values("rank"))

@app.get("/api/leaders/assists-single-tournament")
def leaders_assists_single(): return clean_records(read("wc_single_tournament_top_assists.csv").sort_values("rank"))

@app.get("/api/squads")
def squads(year:int|None=None, team:str|None=None, limit:int=Query(500,ge=1,le=5000)):
    d=read("wc_squads_1930_2026.csv")
    if year is not None: d=d[d.tournament_year.eq(year)]
    if team: d=d[d.team.map(norm).eq(norm(team))]
    return clean_records(d.head(limit))

@app.get("/api/players/by-country/{country}")
def players_by_country(country:str, limit:int=Query(10,ge=1,le=50)):
    # Top contributors ranked by career goals aggregated from every squad appearance on
    # record for this country (1930-2026) - the only individual-player stat that exists
    # for every player in the dataset. Assists and goalkeeper saves are not tracked per
    # player here, so they can't be added to this ranking without inventing numbers;
    # goalkeeper/award recognition is instead surfaced separately via `hall_of_fame` below.
    sq = read("wc_squads_1930_2026.csv")
    sq = sq[sq.team.map(norm).eq(norm(country))]
    if sq.empty: raise HTTPException(404, f"No squad records found for team: {country}")
    g = sq.groupby("player_name").agg(
        goals=("goals","sum"),
        editions=("tournament_year","nunique"),
        first_year=("tournament_year","min"),
        last_year=("tournament_year","max"),
        positions=("position", lambda s: "/".join(sorted(set(s)))),
    ).reset_index().sort_values(["goals","editions"], ascending=False).head(limit)
    top_players = clean_records(g)

    real_team = sq.team.iloc[0]
    aw = read("wc_awards_1930_2026.csv")
    hall_of_fame = []
    award_cols = [
        ("golden_ball_player","golden_ball_country","Golden Ball (Best Player)"),
        ("silver_ball_player","silver_ball_country","Silver Ball (2nd Best Player)"),
        ("bronze_ball_player","bronze_ball_country","Bronze Ball (3rd Best Player)"),
        ("golden_boot_player","golden_boot_country","Golden Boot (Top Scorer)"),
        ("golden_glove_player","golden_glove_country","Golden Glove (Best Goalkeeper)"),
    ]
    for player_col, country_col, label in award_cols:
        if country_col not in aw.columns: continue
        matches = aw[aw[country_col].map(norm).eq(norm(real_team))]
        for _,row in matches.iterrows():
            if pd.isna(row.get(player_col)): continue
            hall_of_fame.append({"year": int(row["year"]), "award": label, "player": row[player_col]})
    for leader_file, label in [("wc_alltime_top_goalscorers.csv","All-time Top Goalscorer leaderboard"),
                                ("wc_alltime_top_assisters.csv","All-time Top Assist leaderboard")]:
        ld = read(leader_file)
        matches = ld[ld.country.map(norm).eq(norm(real_team))]
        for _,row in matches.iterrows():
            hall_of_fame.append({"year": None, "award": f"{label} (rank #{int(row['rank'])})", "player": row["player"]})
    hall_of_fame.sort(key=lambda r: (r["year"] is None, r["year"] or 0))

    return {"team": real_team, "top_contributors": top_players, "hall_of_fame": hall_of_fame}

@app.get("/api/awards")
def awards(): return clean_records(read("wc_awards_1930_2026.csv").sort_values("year"))

@app.get("/api/discipline")
def discipline(year:int|None=None, limit:int=Query(2000,ge=1,le=5000)):
    d=read("wc_match_discipline_1930_2026.csv")
    if year is not None: d=d[d.year.eq(year)]
    # Always chronological (group stage first, final last) - some editions' source rows were
    # recorded in reverse-date order, which made the front-end's round grouping start from
    # the Final for those years instead of the Group stage like every other edition.
    return clean_records(d.sort_values(["year","date"]).head(limit))

@app.get("/api/discipline/summary")
def discipline_summary():
    d=read("wc_match_discipline_1930_2026.csv")
    g=d.groupby("year")[["total_yellow_cards","total_red_cards"]].sum().reset_index()
    g["total_cards"]=g.total_yellow_cards+g.total_red_cards
    return clean_records(g.sort_values("total_cards",ascending=False))

@app.get("/api/goals")
def goals(year:int|None=None, team:str|None=None, player:str|None=None, q:str|None=None, goal_type:str|None=None, limit:int=Query(4000,ge=1,le=5000)):
    d=read("wc_goal_events_1930_2026.csv")
    if year is not None: d=d[d.year.eq(year)]
    if team: d=d[d.team.map(norm).str.contains(norm(team),na=False)]
    if player: d=d[d.player.map(norm).str.contains(norm(player),na=False)]
    # `q` is a combined free-text search matching either the team or the player (used by
    # the single "Team or player" search box on the Goal Timeline page) - kept separate
    # from `team`/`player` above so a caller who genuinely only wants one field can still
    # filter on just that field.
    if q:
        nq=norm(q)
        d=d[d.team.map(norm).str.contains(nq,na=False)|d.player.map(norm).str.contains(nq,na=False)]
    if goal_type: d=d[d.goal_type.map(norm).eq(norm(goal_type))]
    return clean_records(d.sort_values(["year","date","minute_numeric"]).head(limit))

@app.get("/api/goals/summary")
def goals_summary(year:int|None=None, team:str|None=None, player:str|None=None, q:str|None=None):
    d=read("wc_goal_events_1930_2026.csv")
    if year is not None: d=d[d.year.eq(year)]
    if team: d=d[d.team.map(norm).str.contains(norm(team),na=False)]
    if player: d=d[d.player.map(norm).str.contains(norm(player),na=False)]
    if q:
        nq=norm(q)
        d=d[d.team.map(norm).str.contains(nq,na=False)|d.player.map(norm).str.contains(nq,na=False)]
    total=len(d)
    by_type=d.goal_type.value_counts().to_dict()
    order=["1–15'","16–30'","31–45'","46–60'","61–75'","76–90'","90+' (ET/Stoppage)"]
    def bucket(m):
        if m<=15: return order[0]
        if m<=30: return order[1]
        if m<=45: return order[2]
        if m<=60: return order[3]
        if m<=75: return order[4]
        if m<=90: return order[5]
        return order[6]
    fastest=latest=None
    minute_dist=[{"bucket":k,"goals":0} for k in order]
    if total:
        fastest=clean_records(pd.DataFrame([d.sort_values("minute_numeric").iloc[0]]))[0]
        latest=clean_records(pd.DataFrame([d.sort_values("minute_numeric",ascending=False).iloc[0]]))[0]
        counts=d.minute_numeric.apply(bucket).value_counts().reindex(order,fill_value=0)
        minute_dist=[{"bucket":k,"goals":int(v)} for k,v in counts.items()]
    return {"total_goals":total,"by_type":by_type,"fastest_goal":fastest,"latest_goal":latest,"minute_distribution":minute_dist}

@app.get("/api/confederations")
def confederations(): return clean_records(read("wc_team_confederations.csv").sort_values(["confederation","team"]))

@app.get("/api/confederations/stats")
def confederation_stats():
    c=read("wc_team_confederations.csv"); e=read("wc_editions_1930_2026.csv")
    conf_of={norm(t):conf for t,conf in zip(c.team,c.confederation)}
    champ_counts={}
    for champ in e.champion.dropna():
        conf=conf_of.get(norm(champ))
        if not conf: continue
        champ_counts.setdefault(conf,{}); champ_counts[conf][champ]=champ_counts[conf].get(champ,0)+1
    rows=[]
    for conf,grp in c.groupby("confederation"):
        champs=champ_counts.get(conf,{})
        rows.append({
            "confederation":conf,
            "countries":len(grp),
            "titles":sum(champs.values()),
            "champion_teams":sorted(champs.keys(),key=lambda k:-champs[k]),
            "champions_detail":", ".join(f"{k} ({v})" for k,v in sorted(champs.items(),key=lambda kv:-kv[1]))
        })
    return sorted(rows,key=lambda r:-r["titles"])

@app.get("/api/statistics/overview")
def overview():
    e=read("wc_editions_1930_2026.csv"); m=read("wc_matches_1930_2026.csv"); s=read("wc_top_scorers_1930_2026.csv")
    teams=sorted(set(m.home_team.dropna()) | set(m.away_team.dropna()))
    top=s.sort_values(["goals","matches_played"],ascending=[False,True]).iloc[0]
    highest=m.sort_values("total_goals",ascending=False).iloc[0]
    return {"editions":len(e),"matches":len(m),"goals":int(m.total_goals.sum()),"unique_teams":len(teams),"highest_scoring_match":int(m.total_goals.max()),"top_scorer":clean_records(pd.DataFrame([top]))[0],"highest_match":clean_records(pd.DataFrame([highest]))[0]}

@app.get("/api/statistics/trends")
def trends():
    e=read("wc_editions_1930_2026.csv")
    cols=[c for c in ["year","teams","matches","goals","goals_per_match","attendance","avg_attendance"] if c in e.columns]
    return clean_records(e[cols].sort_values("year"))

