import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import {Trophy,Globe2,Users,Goal,CalendarDays,Search,ArrowUpRight,Menu,X,ShieldCheck,Swords,Map,Medal,BarChart3,Zap,Clock} from 'lucide-react';
import {LineChart,Line,BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid,Legend,PieChart,Pie,Cell} from 'recharts';
import './style.css';
import trophyPhoto from './assets/trophy.jpg';
const API=import.meta.env.VITE_API_URL||'/api';

// Generic data-fetching hook: cancels/ignores stale in-flight requests when `path` changes
// or the component unmounts, retries once on failure, and skips fetching entirely when
// path is null/false (used while an input is mid-edit/invalid).
function useApi(path){
  const [state,setState]=useState({data:null,loading:!!path,error:null});
  const [nonce,setNonce]=useState(0);
  useEffect(()=>{
    if(!path){setState({data:null,loading:false,error:null});return}
    let cancelled=false,retried=false;
    const controller=new AbortController();
    setState(s=>({data:s.data,loading:true,error:null}));
    const run=()=>{
      fetch(API+path,{signal:controller.signal})
        .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
        .then(json=>{if(!cancelled)setState({data:json,loading:false,error:null})})
        .catch(err=>{
          if(cancelled||err.name==='AbortError')return;
          if(!retried){retried=true;setTimeout(run,1200)}
          else setState(s=>({data:s.data,loading:false,error:err}));
        });
    };
    run();
    return ()=>{cancelled=true;controller.abort()};
  },[path,nonce]);
  return {...state,retry:()=>setNonce(n=>n+1)};
}
function Status({loading,error,retry,empty}){
  if(error)return <div className="status-msg error">Couldn't load this data. <button onClick={retry}>Retry</button></div>;
  if(loading)return <div className="status-msg">Loading…</div>;
  if(empty)return <div className="status-msg">No records match this filter.</div>;
  return null;
}

const navItems=[['Dashboard','/'],['Tournaments','/tournaments'],['Teams','/teams'],['Compare','/compare'],['Matches','/matches'],['Goal Timeline','/goal-timeline'],['Groups','/groups'],['Players','/players'],['Squads','/squads'],['Awards','/awards'],['Discipline','/discipline'],['Confederations','/confederations']];
function Layout({children}){const loc=useLocation(),nav=useNavigate(),[open,setOpen]=useState(false);return <div className="app"><aside className={open?'open':''}><div className="brand"><div className="logo">⚽</div><div><span className="eyebrow">WORLD CUP DATA PLATFORM</span><b>FIFA ANALYTICS</b><small>1930 — 2026</small></div></div><nav>{navItems.map(([n,p])=><button className={loc.pathname===p?'active':''} onClick={()=>{nav(p);setOpen(false)}} key={p}>{n}</button>)}</nav><div className="side-note"><ShieldCheck size={18}/><span>Analytical dataset</span></div></aside><main><header><button className="mobile" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><h1>{navItems.find(x=>x[1]===loc.pathname)?.[0]||'FIFA World Cup Analytics'}</h1></header>{children}</main></div>}
function Stat({icon:Icon,label,value,sub,accent}){return <div className="stat" style={accent?{'--accent':accent}:undefined}><Icon size={21}/><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>}
function Panel({title,children,action}){return <section className="panel"><div className="panel-title"><h3>{title}</h3>{action}</div>{children}</section>}
function Toolbar({placeholder,value,onChange}){return <div className="toolbar"><Search size={19}/><input placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/></div>}

// Original stylized trophy illustration (gradient cup, shine, base) — not a reproduction of
// any real tournament's trophy design, just a generic gold championship cup for the hero art.
// Original stylized trophy illustration is no longer used — replaced with a licensed
// Unsplash photo of the real trophy (see /assets/trophy.jpg, imported as trophyPhoto above).
function Dashboard(){
  const o=useApi('/statistics/overview'),t=useApi('/statistics/trends'),ed=useApi('/editions'),tm=useApi('/teams?limit=5'),gl=useApi('/leaders/goals'),dsc=useApi('/discipline/summary');
  const trends=t.data||[];
  const recentEditions=[...(ed.data||[])].sort((a,b)=>b.year-a.year).slice(0,5);
  const topTeams=tm.data||[];
  const seasons=ed.data||[];
  const maxTeams=seasons.length?seasons.reduce((m,x)=>x.teams>m.teams?x:m,seasons[0]):null;
  const maxMatches=seasons.length?seasons.reduce((m,x)=>x.matches>m.matches?x:m,seasons[0]):null;
  const maxGoals=seasons.length?seasons.reduce((m,x)=>x.goals>m.goals?x:m,seasons[0]):null;
  const maxGoalsPerMatch=seasons.length?seasons.reduce((m,x)=>x.goals_per_match>m.goals_per_match?x:m,seasons[0]):null;
  const maxCards=(dsc.data||[])[0];
  const allTimeTop=gl.data?.[0];
  return <><section className="hero"><div><span className="eyebrow">FROM THE FIRST KICK TO 2026</span><h2>Every World Cup.<br/><em>One analytical story.</em></h2><p>Explore 23 editions, matches, teams, players, awards, groups and historical trends through one interactive data platform.</p></div><div className="hero-ball"><img src={trophyPhoto} alt="World Cup trophy" className="trophy-photo"/></div></section>
  <Status loading={o.loading||t.loading} error={o.error||t.error} retry={()=>{o.retry();t.retry()}}/>
  {o.data&&<div className="stats">
    <Stat icon={Trophy} label="Editions" value={o.data.editions} accent="#f4c94f"/>
    <Stat icon={CalendarDays} label="Matches" value={o.data.matches.toLocaleString()} accent="#7dc4fa"/>
    <Stat icon={Goal} label="Goals" value={o.data.goals.toLocaleString()} accent="#5fe3a1"/>
    <Stat icon={Users} label="Teams" value={o.data.unique_teams} accent="#c893f5"/>
  </div>}
  <div className="grid2"><Panel title="Goals by edition"><Chart data={trends} dataKey="goals" x="year"/></Panel><Panel title="Participating teams"><Chart data={trends} dataKey="teams" x="year" bar/></Panel></div>
  {o.data&&<div className="highlight highlight-8">
    <div><span>HIGHEST-SCORING MATCH</span><b>{o.data.highest_match.home_team} {o.data.highest_match.home_score}–{o.data.highest_match.away_score} {o.data.highest_match.away_team}</b><small>{o.data.highest_match.year} · {o.data.highest_scoring_match} goals</small></div>
    <div><span>TOP SCORER IN A SINGLE EDITION</span><b>{o.data.top_scorer.player}</b><small>{o.data.top_scorer.goals} goals · {o.data.top_scorer.country}</small></div>
    <div><span>ALL-TIME TOP SCORER</span><b>{allTimeTop?.player||'—'}</b><small>{allTimeTop?`${allTimeTop.goals} goals · ${allTimeTop.country}`:'Loading…'}</small></div>
    <div><span>MOST TEAMS IN A SEASON</span><b>{maxTeams?.teams} teams</b><small>{maxTeams?.year} · {maxTeams?.host}</small></div>
    <div><span>MOST MATCHES IN A SEASON</span><b>{maxMatches?.matches} matches</b><small>{maxMatches?.year} · {maxMatches?.host}</small></div>
    <div><span>MOST GOALS IN A SEASON</span><b>{maxGoals?.goals} goals</b><small>{maxGoals?.year} · {maxGoals?.host}</small></div>
    <div><span>HIGHEST GOALS/MATCH IN AN EDITION</span><b>{maxGoalsPerMatch?.goals_per_match} goals/match</b><small>{maxGoalsPerMatch?.year} · {maxGoalsPerMatch?.host}</small></div>
    <div><span>MOST CARDS IN AN EDITION</span><b>🟨 {maxCards?.total_yellow_cards} · 🟥 {maxCards?.total_red_cards}</b><small>{maxCards?.year?`${maxCards.year} · ${maxCards.total_cards} total cards`:'Loading…'}</small></div>
  </div>}
  <div className="grid2">
    <Panel title="Most decorated teams">
      <Status loading={tm.loading} error={tm.error} retry={tm.retry}/>
      <div className="insight-list">{topTeams.map((x,n)=><div className="mini-insight" key={x.team}><span>0{n+1}</span><div><b>{x.team}</b><p>{x.titles} title{x.titles===1?'':'s'} · {x.appearances} appearances · {x.win_percentage}% win rate</p></div></div>)}</div>
    </Panel>
    <Panel title="Recent champions">
      <Status loading={ed.loading} error={ed.error} retry={ed.retry}/>
      <div className="insight-list">{recentEditions.map(x=><div className="mini-insight" key={x.year}><span>{x.year}</span><div><b>🏆 {x.champion}</b><p>Hosted by {x.host} · beat {x.runner_up} in the final</p></div></div>)}</div>
    </Panel>
  </div></>
}
function Chart({data,dataKey,x,bar=false}){
  const ticks=data.length?data.filter((_,i)=>i%2===0).map(d=>d[x]):undefined;
  const margin={top:5,right:22,left:-18,bottom:0};
  return <ResponsiveContainer width="100%" height={300}>{bar?<BarChart data={data} margin={margin}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey={x} ticks={ticks} interval={0}/><YAxis/><Tooltip cursor={false}/><Bar dataKey={dataKey} fill="#f0b429" radius={[4,4,0,0]} activeBar={{fill:'#eef3fb',stroke:'#f0b429',strokeWidth:2}}/></BarChart>:<LineChart data={data} margin={margin}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey={x} ticks={ticks} interval={0}/><YAxis/><Tooltip/><Line type="monotone" dataKey={dataKey} stroke="#7dc4fa" strokeWidth={3} dot={false}/></LineChart>}</ResponsiveContainer>}

// Tournaments: overall stats, a search box that also matches third/fourth place finishes
// (not just host/champion/runner-up), a clear "team search summary" bar that tallies
// exactly how many times the searched team was champion / runner-up / third / fourth /
// host among the matched editions, and the results rendered as a card grid (year, host,
// podium, and headline stats per edition) instead of a flat table. The goals/teams trend
// charts live on the Dashboard, not duplicated here.
function Tournaments(){
  const{data,loading,error,retry}=useApi('/editions'),[q,setQ]=useState('');
  const d=data||[];
  const all=useMemo(()=>[...d].sort((a,b)=>b.year-a.year),[d]);
  const qn=q.trim().toLowerCase();
  const rows=all.filter(x=>[x.year,x.host,x.champion,x.runner_up,x.third_place,x.fourth_place].join(' ').toLowerCase().includes(qn));
  const overall=useMemo(()=>{
    if(!d.length)return null;
    const champCounts={};
    d.forEach(x=>{if(x.champion)champCounts[x.champion]=(champCounts[x.champion]||0)+1});
    const mostTitled=Object.entries(champCounts).sort((a,b)=>b[1]-a[1])[0];
    const latest=[...d].sort((a,b)=>b.year-a.year)[0];
    return {total:d.length,uniqueChamps:Object.keys(champCounts).length,mostTitled,latest};
  },[d]);
  const teamSummary=useMemo(()=>{
    if(!qn)return null;
    const match=(v)=>String(v||'').toLowerCase().includes(qn);
    const champion=rows.filter(x=>match(x.champion)).length;
    const runnerUp=rows.filter(x=>match(x.runner_up)).length;
    const third=rows.filter(x=>match(x.third_place)).length;
    const fourth=rows.filter(x=>match(x.fourth_place)).length;
    const host=rows.filter(x=>match(x.host)).length;
    if(!champion&&!runnerUp&&!third&&!fourth&&!host)return null;
    return {champion,runnerUp,third,fourth,host};
  },[rows,qn]);
  return <>
    {overall&&<div className="stats">
      <Stat icon={Trophy} label="Tournaments (1930–2026)" value={overall.total} accent="#f4c94f"/>
      <Stat icon={Medal} label="Unique champions" value={overall.uniqueChamps} accent="#7dc4fa"/>
      <Stat icon={ShieldCheck} label="Most decorated" value={overall.mostTitled?.[0]||'—'} sub={overall.mostTitled?`${overall.mostTitled[1]} titles`:undefined} accent="#5fe3a1"/>
      <Stat icon={CalendarDays} label="Latest champion" value={overall.latest?.champion||'—'} sub={overall.latest?`${overall.latest.year} · hosted by ${overall.latest.host}`:undefined} accent="#c893f5"/>
    </div>}
    <Toolbar placeholder="Search year, host, champion, runner-up, third or fourth place" value={q} onChange={setQ}/>
    {teamSummary&&<div className="team-spot">
      <div><span>🏆 CHAMPION</span><b>{teamSummary.champion}×</b><small>times won it all</small></div>
      <div><span>🥈 RUNNER-UP</span><b>{teamSummary.runnerUp}×</b><small>lost in the final</small></div>
      <div><span>🥉 THIRD PLACE</span><b>{teamSummary.third}×</b><small>won the third-place match</small></div>
      <div><span>4th PLACE / HOST</span><b>{teamSummary.fourth}× / {teamSummary.host}×</b><small>fourth-place finishes · times hosted</small></div>
    </div>}
    <Status loading={loading} error={error} retry={retry} empty={!loading&&!error&&rows.length===0}/>
    <Panel title={`${rows.length} tournament${rows.length===1?'':'s'}`}>
      <div className="tournament-grid">
        {rows.map(x=><div className="tournament-card" key={x.year}>
          <div className="tournament-card-head"><span className="tournament-year">{x.year}</span></div>
          <div className="tournament-host-line">🏟️ <b>{x.host}</b>{x.host_won==='Yes'&&<span className="host-star">★ Host champions</span>}</div>
          <div className="tournament-champ"><Trophy size={16} color="#f4c94f"/><div><small style={{display:'block',color:'#8794a7',fontSize:11}}>CHAMPION</small><b>{x.champion}</b></div></div>
          <div className="tournament-places">
            <div>🥈 Runner-up<em>{x.runner_up||'—'}</em></div>
            <div>🥉 Third<em>{x.third_place||'—'}</em></div>
            <div>4th place<em>{x.fourth_place||'—'}</em></div>
            <div>Format<em>{x.format||'—'}</em></div>
          </div>
          <div className="tournament-stats-row">
            <div className="tstat"><span>{x.teams}</span><small>Teams</small></div>
            <div className="tstat"><span>{x.matches}</span><small>Matches</small></div>
            <div className="tstat"><span>{x.goals}</span><small>Goals</small></div>
            <div className="tstat"><span>{x.goals_per_match}</span><small>Goals/Match</small></div>
          </div>
        </div>)}
      </div>
    </Panel>
  </>
}
// Teams: kept every original column/feature, and added the requested podium finishes
// (runner-up, third, fourth place) plus knockout-stage vs. group-stage-exit edition counts
// per team (backend: /api/teams now returns these alongside the original stats). A
// "podium" card grid up top gives an attractive at-a-glance view of the top teams (medal
// chips + a win-rate bar + a knockout/group-stage split), while the full searchable table
// below keeps every team and every stat for detailed browsing.
function Teams(){
  const{data,loading,error,retry}=useApi('/teams'),[q,setQ]=useState('');
  const d=data||[];
  const rows=d.filter(x=>String(x.team).toLowerCase().includes(q.toLowerCase()));
  const overview=useMemo(()=>{
    if(!d.length)return null;
    const mostTitled=[...d].sort((a,b)=>b.titles-a.titles)[0];
    const bestWinPct=[...d].sort((a,b)=>b.win_percentage-a.win_percentage)[0];
    const mostRunnerUp=[...d].sort((a,b)=>(b.runner_up||0)-(a.runner_up||0))[0];
    return {teams:d.length,mostTitled,bestWinPct,mostRunnerUp};
  },[d]);
  const podium=rows.slice(0,9);
  return <>
    {overview&&<div className="stats">
      <Stat icon={Users} label="Teams tracked" value={overview.teams} accent="#7dc4fa"/>
      <Stat icon={Trophy} label="Most titles" value={overview.mostTitled?.team||'—'} sub={overview.mostTitled?`${overview.mostTitled.titles} titles`:undefined} accent="#f4c94f"/>
      <Stat icon={ShieldCheck} label="Best win rate" value={overview.bestWinPct?.team||'—'} sub={overview.bestWinPct?`${overview.bestWinPct.win_percentage}%`:undefined} accent="#5fe3a1"/>
      <Stat icon={Medal} label="Most runner-up finishes" value={overview.mostRunnerUp?.team||'—'} sub={overview.mostRunnerUp?`${overview.mostRunnerUp.runner_up}×`:undefined} accent="#c893f5"/>
    </div>}
    <Toolbar placeholder="Search team" value={q} onChange={setQ}/>
    <Status loading={loading} error={error} retry={retry} empty={!loading&&!error&&rows.length===0}/>
    <Panel title={`Podium — top ${podium.length} team${podium.length===1?'':'s'} shown`}>
      <div className="team-grid">
        {podium.map((x,i)=><div className="team-card" key={x.team}>
          <div className="team-card-head"><div className="team-rank">{i+1}</div><b>{x.team}</b></div>
          <div className="team-card-sub">{x.appearances} appearances · {x.matches} matches</div>
          <div className="medal-row">
            <span className="medal-chip" style={{'--mc':'var(--gold)'}}>🏆 {x.titles}<small>titles</small></span>
            <span className={`medal-chip${!x.runner_up?' zero':''}`} style={{'--mc':'var(--silver)'}}>🥈 {x.runner_up||0}<small>runner-up</small></span>
            <span className={`medal-chip${!x.third_place?' zero':''}`} style={{'--mc':'var(--bronze)'}}>🥉 {x.third_place||0}<small>third</small></span>
            <span className={`medal-chip${!x.fourth_place?' zero':''}`} style={{'--mc':'var(--slate)'}}>4th {x.fourth_place||0}<small>place</small></span>
          </div>
          <div className="win-bar-label"><span>Win rate</span><span>{x.win_percentage}%</span></div>
          <div className="win-bar"><span style={{width:`${x.win_percentage}%`}}/></div>
          <div className="stage-row">
            <div className="stage-pill"><b>{x.knockout_editions||0}</b>reached knockout</div>
            <div className="stage-pill"><b>{x.group_stage_only_editions||0}</b>group-stage exit</div>
          </div>
        </div>)}
      </div>
    </Panel>
    <Panel title="All-time team performance">
      <Table headers={['Team','Apps','Titles','Runner-up','Third','Fourth','Knockout Eds','Group-only Eds','Matches','Wins','Draws','Losses','Goals','Win %']}
        rows={rows.map(x=>[x.team,x.appearances,x.titles,x.runner_up||0,x.third_place||0,x.fourth_place||0,x.knockout_editions||0,x.group_stage_only_editions||0,x.matches,x.wins,x.draws,x.losses,x.goals_for,x.win_percentage+'%'])}/>
    </Panel>
  </>
}

// Compare: now pulls real head-to-head match history between the two chosen teams
// (backend: /api/teams/compare/{a}/{b}) instead of only showing the two teams'
// separate all-time stats side by side.
// Compare: same data as before (all-time profile + real head-to-head history via
// /api/teams/compare), just presented more visually — a "tale of the tape" VS card with
// side-by-side comparison bars for the headline metrics, the all-time table with the
// leading team's cell highlighted per row, and a head-to-head donut (wins A / draws /
// wins B) alongside the match list, each row now tagged with a colored result chip.
const CMP_METRICS=[['titles','Titles'],['win_percentage','Win %'],['goals_for','Goals scored'],['appearances','Appearances']];
function Compare(){
  const{data,loading,error,retry}=useApi('/teams'),[a,setA]=useState('Brazil'),[b,setB]=useState('Argentina');
  const d=data||[];
  const opts=d.map(x=>x.team);
  const A=d.find(x=>x.team===a),B=d.find(x=>x.team===b);
  const cmp=useApi(a&&b?`/teams/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`:null);
  const h2h=cmp.data?.head_to_head;
  const donut=h2h?[{name:`${a} wins`,value:h2h.wins_a,fill:'#7dc4fa'},{name:'Draws',value:h2h.draws,fill:'#8fa8c9'},{name:`${b} wins`,value:h2h.wins_b,fill:'#f4c94f'}].filter(x=>x.value>0):[];
  return <>
    <div className="compare-select"><select value={a} onChange={e=>setA(e.target.value)}>{opts.map(x=><option key={x}>{x}</option>)}</select><Swords/><select value={b} onChange={e=>setB(e.target.value)}>{opts.map(x=><option key={x}>{x}</option>)}</select></div>
    <Status loading={loading} error={error} retry={retry}/>
    {A&&B&&<div className="vs-card">
      <div className="vs-side"><div className="vs-badge"><ShieldCheck size={22}/></div><h2>{a}</h2><small>{A.titles} titles · {A.win_percentage}% win rate</small></div>
      <div className="vs-mid"><Swords size={22}/><b>VS</b></div>
      <div className="vs-side"><div className="vs-badge"><ShieldCheck size={22}/></div><h2>{b}</h2><small>{B.titles} titles · {B.win_percentage}% win rate</small></div>
    </div>}
    {A&&B&&<Panel title="Head-to-head at a glance">
      <div className="vs-bars">
        {CMP_METRICS.map(([k,label])=>{
          const va=+A[k]||0,vb=+B[k]||0,tot=va+vb||1,pa=va/tot*100,pb=vb/tot*100;
          return <div key={k}><div className="vs-label">{label}</div><div className="vs-bar-row"><b>{A[k]}</b><div className="vs-track"><span className="a" style={{width:`${pa}%`}}/><span className="b" style={{width:`${pb}%`}}/></div><b>{B[k]}</b></div></div>;
        })}
      </div>
    </Panel>}
    <Panel title="All-time profile">
      <Table headers={['Metric',a,b]} rows={A&&B?['appearances','titles','runner_up','third_place','fourth_place','matches','wins','draws','losses','goals_for','goals_against','win_percentage'].map(k=>{
        const va=+A[k]||0,vb=+B[k]||0;
        const lowerIsBetter=k==='losses'||k==='goals_against';
        const aWins=lowerIsBetter?va<vb:va>vb, bWins=lowerIsBetter?vb<va:vb>va;
        return [k.replaceAll('_',' '),<b style={aWins?{color:'#5fe3a1'}:undefined}>{A[k]??0}</b>,<b style={bWins?{color:'#5fe3a1'}:undefined}>{B[k]??0}</b>];
      }):[]}/>
    </Panel>
    <Status loading={cmp.loading} error={cmp.error} retry={cmp.retry}/>
    {h2h&&<>
      <div className="highlight">
        <div><span>HEAD-TO-HEAD MATCHES</span><b>{h2h.matches_played}</b><small>{a} {h2h.wins_a}W · {h2h.draws}D · {b} {h2h.wins_b}W</small></div>
        <div><span>GOALS SCORED HEAD-TO-HEAD</span><b>{a} {h2h.goals_a} – {h2h.goals_b} {b}</b><small>Across every World Cup meeting on record</small></div>
      </div>
      {donut.length>0&&<Panel title="Head-to-head record split">
        <div className="h2h-donut">
          <ResponsiveContainer width="55%" height={180}><PieChart><Pie data={donut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>{donut.map((x,i)=><Cell key={i} fill={x.fill} stroke="#0a0d13" strokeWidth={2}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
          <div className="h2h-legend">{donut.map((x,i)=><div key={i}><span className="h2h-dot" style={{background:x.fill}}/>{x.name} · {x.value}</div>)}</div>
        </div>
      </Panel>}
      <Panel title={`${a} vs ${b} — every World Cup meeting`}>
        <Table headers={['Year','Date','Home','Score','Away','Round','Result for '+a]} rows={h2h.matches.map(x=>{
          const homeIsA=norm2(x.home_team)===norm2(a);
          const aScore=homeIsA?x.home_score:x.away_score, bScore=homeIsA?x.away_score:x.home_score;
          const cls=aScore>bScore?'win':aScore<bScore?'loss':'draw';
          const label=aScore>bScore?'Win':aScore<bScore?'Loss':'Draw';
          return [x.year,x.date,x.home_team,`${x.home_score} — ${x.away_score}`,x.away_team,x.round,<span className={`result-chip ${cls}`}>{label}</span>];
        })}/>
      </Panel>
    </>}
    {cmp.data&&!h2h?.matches_played&&<div className="status-msg">These two teams have never met at a World Cup.</div>}
  </>
}
function norm2(s){return String(s).trim().toLowerCase()}

// Matches: a year is picked from a dropdown (defaulting to 2026), the backend returns
// every match for that year sorted chronologically, and matches are grouped by round so
// group stage -> knockout -> final reads in the order they were actually played.
// An "All Editions" option sits above the year list: choosing it (typically together with
// a team filter, e.g. "Brazil") pulls that team's full World Cup history across every
// edition from the backend in one request, shows a career-style summary line (matches,
// W/D/L, goals for/against), and groups the match list by year instead of by round, since
// "round" only makes sense to group by within a single tournament.
// Shared round-color map and small badge/score components used to make the Matches
// table more visually scannable (round now reads as a colored pill, and the score is a
// chip that bolds the winner and surfaces the penalty-shootout score when there was one)
// without changing any of the underlying filtering/grouping logic.
const ROUND_COLORS={'Final':'#f4c94f','Final stage':'#f4c94f','Third-place match':'#e3995f','Semi-finals':'#c893f5','Quarter-finals':'#7dc4fa','Round of 16':'#5fd6d6','Round of 32':'#5fd6d6','Second round':'#8fa8c9','First round':'#8fa8c9','Group stage':'#5fe3a1','First group stage':'#5fe3a1','Second group stage':'#5fe3a1','Group stage play-off':'#5fe3a1'};
function RoundBadge({round}){const c=ROUND_COLORS[round]||'#8fa0c0';return <span className="round-badge" style={{background:`color-mix(in srgb, ${c} 18%, transparent)`,color:c,border:`1px solid color-mix(in srgb, ${c} 45%, transparent)`}}>{round}</span>}
function ScoreCell({hs,as_,hp,ap}){
  const hw=+hs>+as_, aw=+as_>+hs;
  const hasPens=hp!==undefined&&hp!==null&&ap!==undefined&&ap!==null&&hp!==''&&ap!=='';
  return <span className="score-chip"><span className={hw?'win-side':''}>{hs}</span>—<span className={aw?'win-side':''}>{as_}</span>{hasPens&&<span className="pens">({hp}–{ap} pens)</span>}</span>;
}
function Matches(){
  const editionsApi=useApi('/editions');
  const years=useMemo(()=>[...(editionsApi.data||[])].map(x=>x.year).sort((a,b)=>b-a),[editionsApi.data]);
  const [year,setYear]=useState(null);
  useEffect(()=>{if(year===null&&years.length)setYear(years.includes(2026)?2026:years[0])},[years,year]);
  const [team,setTeam]=useState('');
  const isAll=year==='all';
  const apiPath=year===null?null:(isAll?`/matches?limit=1500${team?`&team=${encodeURIComponent(team)}`:''}`:`/matches?year=${year}&limit=500`);
  const{data,loading,error,retry}=useApi(apiPath);
  const all=data||[];
  const rows=isAll?all:(team?all.filter(x=>[x.home_team,x.away_team].join(' ').toLowerCase().includes(team.toLowerCase())):all);
  const summary=useMemo(()=>{
    if(!isAll||!team||!rows.length)return null;
    const t=team.toLowerCase();
    let w=0,d=0,l=0,gf=0,ga=0;
    rows.forEach(x=>{
      const isHome=String(x.home_team).toLowerCase().includes(t);
      const gfx=isHome?x.home_score:x.away_score, gax=isHome?x.away_score:x.home_score;
      gf+=gfx||0; ga+=gax||0;
      if(gfx>gax)w++; else if(gfx<gax)l++; else d++;
    });
    return {played:rows.length,w,d,l,gf,ga};
  },[isAll,team,rows]);
  const groupKeys=isAll?[...new Set(rows.map(x=>x.year))].sort((a,b)=>b-a):[...new Set(rows.map(x=>x.round))];
  return <>
    <div className="filters">
      <select value={year??''} onChange={e=>setYear(e.target.value==='all'?'all':+e.target.value)}>
        <option value="all">All Editions</option>
        {years.map(yr=><option key={yr} value={yr}>{yr}</option>)}
      </select>
      <input placeholder="Team" value={team} onChange={e=>setTeam(e.target.value)}/>
    </div>
    {isAll&&!team&&<div className="status-msg">Type a team above to see its overall performance across all editions.</div>}
    {summary&&<div className="highlight">
      <div><span>{team.toUpperCase()} — ALL-TIME AT THE WORLD CUP</span><b>{summary.played} matches</b><small>{summary.w}W · {summary.d}D · {summary.l}L</small></div>
      <div><span>GOALS</span><b>{summary.gf} – {summary.ga}</b><small>Goal difference {summary.gf-summary.ga>0?'+':''}{summary.gf-summary.ga}</small></div>
    </div>}
    <Status loading={loading||editionsApi.loading} error={error||editionsApi.error} retry={()=>{retry();editionsApi.retry()}} empty={!loading&&!error&&(!isAll||team)&&rows.length===0}/>
    {groupKeys.map(k=>{
      const krows=rows.filter(x=>isAll?x.year===k:x.round===k);
      return <Panel key={k} title={isAll?<span>{k}<span className="round-badge" style={{marginLeft:8,background:'#161d29',color:'#9aa5b5',border:'1px solid #2a3341'}}>{krows.length} match{krows.length===1?'':'es'}</span></span>:<span><RoundBadge round={k}/> · {krows.length} match{krows.length===1?'':'es'}</span>}>
        <Table headers={isAll?['Date','Round','Home','Score','Away','Result','Venue']:['Date','Home','Score','Away','Result','Venue']}
          rows={krows.map(x=>{
            const score=<ScoreCell hs={x.home_score} as_={x.away_score} hp={x.home_penalty_shootout} ap={x.away_penalty_shootout}/>;
            return isAll?[x.date,<RoundBadge round={x.round}/>,x.home_team,score,x.away_team,x.result,x.venue]:[x.date,x.home_team,score,x.away_team,x.result,x.venue];
          })}/>
      </Panel>;
    })}
  </>
}

// Goal Timeline: goal-by-goal record across all 23 editions (1930-2026), sourced from
// wc_goal_events_1930_2026.csv. A year selector (defaulting to 2026, with an "All
// Editions" option) plus a team/player search drive both the summary stats/charts above
// and the goal list below - "All Editions" groups the list by year (like Matches' overall
// view), a single year groups by round. The two charts (when-in-the-match goals are
// scored, and the run-of-play/penalty/own-goal split) share one color language with the
// rest of the app's colorful panels.
const GOAL_TYPE_COLORS={Normal:'#7dc4fa',Penalty:'#f4c94f','Own Goal':'#ff6b81'};
const BUCKET_COLORS=['#7dc4fa','#5fe3a1','#f4c94f','#c893f5','#ff9d6b','#5fd6d6','#ff6b81'];
function buildQS(pairs){
  const parts=pairs.filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>`${k}=${encodeURIComponent(v)}`);
  return parts.length?`?${parts.join('&')}`:'';
}
function GoalTimeline(){
  const editionsApi=useApi('/editions');
  const years=useMemo(()=>[...(editionsApi.data||[])].map(x=>x.year).sort((a,b)=>b-a),[editionsApi.data]);
  const[year,setYear]=useState(null);
  useEffect(()=>{if(year===null&&years.length)setYear(years.includes(2026)?2026:years[0])},[years,year]);
  const[q,setQ]=useState('');
  const isAll=year==='all';
  const listApi=useApi(year===null?null:`/goals${buildQS([['year',isAll?'':year],['q',q],['limit',3000]])}`);
  const sumApi=useApi(year===null?null:`/goals/summary${buildQS([['year',isAll?'':year],['q',q]])}`);
  const rows=listApi.data||[];
  const s=sumApi.data;
  const typeData=useMemo(()=>s?Object.entries(s.by_type||{}).map(([name,value])=>({name,value})):[],[s]);
  const fastestSub=useMemo(()=>{
    const g=s?.fastest_goal; if(!g)return undefined;
    const opp=g.team===g.home_team?g.away_team:g.home_team;
    return `${g.player} · vs ${opp} · ${g.round} · ${g.year}`;
  },[s]);
  const latestSub=useMemo(()=>{
    const g=s?.latest_goal; if(!g)return undefined;
    const opp=g.team===g.home_team?g.away_team:g.home_team;
    return `${g.player} · vs ${opp} · ${g.round} · ${g.year}`;
  },[s]);
  const groupKeys=isAll?[...new Set(rows.map(x=>x.year))].sort((a,b)=>b-a):[...new Set(rows.map(x=>x.round))];
  return <>
    <div className="filters">
      <select value={year??''} onChange={e=>setYear(e.target.value==='all'?'all':+e.target.value)}>
        <option value="all">All Editions</option>
        {years.map(yr=><option key={yr} value={yr}>{yr}</option>)}
      </select>
      <input placeholder="Team or player" value={q} onChange={e=>setQ(e.target.value)}/>
    </div>
    <Status loading={sumApi.loading||editionsApi.loading} error={sumApi.error||editionsApi.error} retry={()=>{sumApi.retry();editionsApi.retry()}}/>
    {s&&<div className="stats">
      <Stat icon={Goal} label="Goals" value={s.total_goals.toLocaleString()} accent="#7dc4fa"/>
      <Stat icon={BarChart3} label="Penalties" value={s.by_type?.Penalty||0} accent="#f4c94f"/>
      <Stat icon={X} label="Own goals" value={s.by_type?.['Own Goal']||0} accent="#ff6b81"/>
      <Stat icon={Zap} label="Fastest goal" value={s.fastest_goal?`${s.fastest_goal.minute}'`:'—'} sub={fastestSub} accent="#5fe3a1"/>
      <Stat icon={Clock} label="Latest goal" value={s.latest_goal?`${s.latest_goal.minute}'`:'—'} sub={latestSub} accent="#c893f5"/>
    </div>}
    <div className="grid2">
      <Panel title="When goals are scored">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={s?.minute_distribution||[]}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="bucket"/><YAxis allowDecimals={false}/><Tooltip cursor={false}/>
            <Bar dataKey="goals" radius={[6,6,0,0]} activeBar={{fill:'#eef3fb',stroke:'#f0b429',strokeWidth:2}}>{(s?.minute_distribution||[]).map((x,i)=><Cell key={i} fill={BUCKET_COLORS[i%BUCKET_COLORS.length]}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Goal types">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={104} paddingAngle={3} label={({name,value})=>`${name} ${value}`}>
              {typeData.map((x,i)=><Cell key={i} fill={GOAL_TYPE_COLORS[x.name]||'#8fa0c0'} stroke="#0a0d13" strokeWidth={2}/>)}
            </Pie>
            <Tooltip/><Legend/>
          </PieChart>
        </ResponsiveContainer>
      </Panel>
    </div>
    <Status loading={listApi.loading} error={listApi.error} retry={listApi.retry} empty={!listApi.loading&&!listApi.error&&rows.length===0}/>
    {groupKeys.map(k=>{
      const krows=rows.filter(x=>isAll?x.year===k:x.round===k);
      return <Panel key={k} title={isAll?<span>{k}<span className="round-badge" style={{marginLeft:8,background:'#161d29',color:'#9aa5b5',border:'1px solid #2a3341'}}>{krows.length} goal{krows.length===1?'':'s'}</span></span>:<span><RoundBadge round={k}/> · {krows.length} goal{krows.length===1?'':'s'}</span>}>
        <Table headers={isAll?['Date','Round','Match','Scorer','Team','Minute','Type']:['Date','Match','Scorer','Team','Minute','Type']}
          rows={krows.map(x=>{const match=`${x.home_team} vs ${x.away_team}`;return isAll?[x.date,x.round,match,x.player,x.team,x.minute+"'",x.goal_type]:[x.date,match,x.player,x.team,x.minute+"'",x.goal_type];})}/>
      </Panel>;
    })}
  </>
}

// Groups: fetches the (small) full dataset once and derives the year list, the phase
// list for that year, and the filtered rows entirely on the client, so switching years
// or phases never re-hits the server and only real tournament years (no WWII-cancelled
// ones) are ever offered. Defaults to 2026. Historical formats vary a lot - some editions
// have a single "Group stage", others have "First group stage" + "Second group stage"
// (1974/1978/1982) or a round-robin "Final round" in place of a knockout final (1950) -
// so phase is its own selector rather than assumed. Which teams progressed is read
// straight from each row's `advanced` flag (sourced from the historical record) rather
// than assumed from rank, since qualification rules changed across formats (e.g. only
// the second-group-stage winners advanced in some editions).
function Groups(){
  const{data,loading,error,retry}=useApi('/group-standings');
  const d=data||[];
  const years=useMemo(()=>[...new Set(d.map(x=>x.year))].sort((x,y)=>y-x),[d]);
  const [y,setY]=useState(null);
  useEffect(()=>{if(y===null&&years.length)setY(years.includes(2026)?2026:years[0])},[years,y]);
  const yearRows=useMemo(()=>d.filter(x=>x.year===y),[d,y]);
  const phases=useMemo(()=>[...new Set(yearRows.map(x=>x.phase))],[yearRows]);
  const [phase,setPhase]=useState(null);
  useEffect(()=>{setPhase(phases[0]||null)},[y]);
  const rows=yearRows.filter(x=>!phase||x.phase===phase);
  const groups=[...new Set(rows.map(x=>x.group))];
  const globalStats=useMemo(()=>{
    if(!d.length)return null;
    let best=d[0]; d.forEach(x=>{if(x.goal_diff>best.goal_diff)best=x});
    return {
      editions:new Set(d.map(x=>x.year)).size,
      teams:new Set(d.map(x=>x.team)).size,
      best,
      perfect:d.filter(x=>x.played===x.won&&x.won>0).length,
    };
  },[d]);
  return <>
    {globalStats&&<div className="stats">
      <Stat icon={CalendarDays} label="Editions with groups" value={globalStats.editions} accent="#7dc4fa"/>
      <Stat icon={Users} label="Teams tracked" value={globalStats.teams} accent="#c893f5"/>
      <Stat icon={Zap} label="Best group goal difference" value={`+${globalStats.best.goal_diff}`} sub={`${globalStats.best.team} · ${globalStats.best.year}`} accent="#5fe3a1"/>
      <Stat icon={ShieldCheck} label="Perfect group records" value={globalStats.perfect} sub="Won every group match played" accent="#f4c94f"/>
    </div>}
    <div className="filters">
      <select value={y??''} onChange={e=>setY(+e.target.value)}>{years.map(yr=><option key={yr} value={yr}>{yr}</option>)}</select>
      {phases.length>1&&<div className="phase-tabs">{phases.map(p=><button key={p} className={p===phase?'active':''} onClick={()=>setPhase(p)}>{p}</button>)}</div>}
    </div>
    <Status loading={loading} error={error} retry={retry} empty={!loading&&!error&&groups.length===0}/>
    <div className="group-grid">
      {groups.map(g=>{
        const grows=[...rows.filter(x=>x.group===g)].sort((a,b)=>a.group_rank-b.group_rank);
        const winner=grows[0];
        return <div className="group-card" key={g}>
          <div className="group-card-head">
            <div className="group-badge">{g}</div>
            <div><b>Group {g}</b><small>{winner?.phase}</small></div>
            {winner&&<div className="group-winner"><Trophy size={13}/> {winner.team}</div>}
          </div>
          <div className="group-table-wrap">
            <table className="standings-table">
              <thead><tr><th></th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
              <tbody>{grows.map(x=><tr key={x.team} className={x.advanced?'advanced':''}>
                <td><span className="rank-badge">{x.group_rank}</span></td>
                <td className="team-cell">{x.team}{x.group_rank===1&&<Trophy size={12} className="mini-trophy"/>}</td>
                <td>{x.played}</td><td>{x.won}</td><td>{x.drawn}</td><td>{x.lost}</td>
                <td>{x.goals_for}</td><td>{x.goals_against}</td><td>{x.goal_diff>0?`+${x.goal_diff}`:x.goal_diff}</td>
                <td><b>{x.points}</b></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="group-card-foot"><span className="legend-dot adv"/> Advanced <span className="legend-dot"/> Eliminated</div>
        </div>;
      })}
    </div>
  </>
}

// Players: "Top scorers in each edition" is the per-edition leading-scorer dataset.
// The three leaderboards below are real career/tournament all-time records (curated from
// FIFA/Opta-sourced rankings). Ranking now always applies the same tie-break rule
// wherever matches-played data exists: the same tally in fewer appearances ranks higher
// (rankWithTiebreak below), applied to the per-edition table, the all-time goals table and
// the single-tournament assists table. The all-time assists table has no matches-played
// figures in its source data, so genuine ties there stay tied exactly as before.
// Visual language matches the Awards/Confederations pages: RankPill gives 1st/2nd/3rd a
// colored medal pill (gold/silver/bronze) instead of plain text, and PlayerCell merges the
// player name + country into one stacked cell (name tinted for the podium spots) instead
// of two separate plain columns, across every leaderboard table on the page.
function rankWithTiebreak(rows,valueOf,matchesOf){
  const sorted=[...rows].sort((a,b)=>{
    const vd=valueOf(b)-valueOf(a);
    if(vd!==0)return vd;
    const ma=matchesOf(a),mb=matchesOf(b);
    if(ma==null&&mb==null)return 0;
    if(ma==null)return 1;
    if(mb==null)return -1;
    return ma-mb;
  });
  let rank=0,prevKey=null;
  return sorted.map((x,i)=>{
    const key=`${valueOf(x)}|${matchesOf(x)}`;
    if(key!==prevKey){rank=i+1;prevKey=key}
    return {...x,_rank:rank};
  });
}
const RANK_COLOR={1:'#f4c94f',2:'#c9d3e0',3:'#d98a52'};
function RankPill({r}){
  const c=RANK_COLOR[r];
  return <span className="rank-pill" style={c?{'--c':c}:undefined}>{r===1?'🥇':r===2?'🥈':r===3?'🥉':r}</span>;
}
function PlayerCell({name,country,rank}){
  const c=RANK_COLOR[rank];
  return <div className="player-cell"><b style={c?{color:c}:undefined}>{name}</b>{country&&<small>{country}</small>}</div>;
}
function Players(){
  const{data,loading,error,retry}=useApi('/top-scorers?limit=100');
  const goalsApi=useApi('/leaders/goals'),assistsApi=useApi('/leaders/assists'),singleApi=useApi('/leaders/assists-single-tournament');
  const teamsApi=useApi('/teams'),[country,setCountry]=useState('Brazil');
  const countryApi=useApi(country?`/players/by-country/${encodeURIComponent(country)}`:null);
  const countryOpts=(teamsApi.data||[]).map(x=>x.team);
  const contributors=useMemo(()=>rankWithTiebreak(countryApi.data?.top_contributors||[],x=>+x.goals||0,x=>-(+x.editions||0)),[countryApi.data]);
  const hallOfFame=countryApi.data?.hall_of_fame||[];
  const rows=data||[];
  const byGoals=useMemo(()=>rankWithTiebreak(rows,x=>+x.goals||0,x=>x.matches_played!=null?+x.matches_played:null),[rows]);
  const goalLeaders=useMemo(()=>rankWithTiebreak(goalsApi.data||[],x=>+x.goals||0,x=>x.matches_played!=null?+x.matches_played:null),[goalsApi.data]);
  const assistLeaders=useMemo(()=>rankWithTiebreak(assistsApi.data||[],x=>+x.assists||0,()=>null),[assistsApi.data]);
  const singleLeaders=useMemo(()=>rankWithTiebreak(singleApi.data||[],x=>+x.assists||0,x=>x.matches_played!=null?+x.matches_played:null),[singleApi.data]);
  const topScorer=goalLeaders[0],topAssist=assistLeaders[0];
  const singleEditionGA=useMemo(()=>rankWithTiebreak(rows,x=>(+x.goals||0)+(+x.assists||0),x=>x.matches_played!=null?+x.matches_played:null).slice(0,10),[rows]);
  return <>
    <Status loading={loading} error={error} retry={retry} empty={!loading&&!error&&rows.length===0}/>
    {(topScorer||topAssist)&&<div className="highlight highlight-3">
      <div><span>HIGHEST SCORER OF ALL EDITIONS</span><b>{topScorer?.player}</b><small>{topScorer?.goals} goals in {topScorer?.matches_played} matches · {topScorer?.country}</small></div>
      <div><span>HIGHEST ASSISTS OF ALL EDITIONS</span><b>{topAssist?.player}</b><small>{topAssist?.assists} assists · {topAssist?.country}</small></div>
      <div><span>BEST SINGLE-EDITION G+A</span><b>{singleEditionGA[0]?.player}</b><small>{singleEditionGA[0]?(+singleEditionGA[0].goals+ +singleEditionGA[0].assists):''} G+A · {singleEditionGA[0]?.year} · {singleEditionGA[0]?.country}</small></div>
    </div>}

    <Panel title="Top contributors by country" action={
      <select className="inline-select" value={country} onChange={e=>setCountry(e.target.value)}>{countryOpts.map(x=><option key={x}>{x}</option>)}</select>
    }>
      <p className="hint-text">Ranked by career World Cup goals (1930–2026), the only individual-contribution stat tracked for every player in this dataset. Assist and goalkeeper-save totals aren't recorded per player, so goalkeeper recognition is shown via real awards below instead of an invented save count.</p>
      <Status loading={teamsApi.loading||countryApi.loading} error={teamsApi.error||countryApi.error} retry={()=>{teamsApi.retry();countryApi.retry()}} empty={!countryApi.loading&&!countryApi.error&&contributors.length===0}/>
      <Table headers={['Rank','Player','Position','Goals','Editions','Active']} rows={contributors.map(x=>[<RankPill r={x._rank}/>,<PlayerCell name={x.player_name} rank={x._rank}/>,x.positions,x.goals,x.editions,x.first_year===x.last_year?x.first_year:`${x.first_year}–${x.last_year}`])}/>
    </Panel>
    {hallOfFame.length>0&&<Panel title={`${country} — World Cup Hall of Fame`}>
      <div className="insight-list">{hallOfFame.map((h,i)=><div className="mini-insight" key={i}><span>{h.year??'★'}</span><div><b>{h.player}</b><p>{h.award}</p></div></div>)}</div>
    </Panel>}

    <Panel title="Top scorers in each edition (ranked by goals, ties broken by fewer matches)">
      <Table headers={['Rank','Year','Player','Goals','Assists','Matches','Result']} rows={byGoals.map(x=>[<RankPill r={x._rank}/>,x.year,<PlayerCell name={x.player} country={x.country} rank={x._rank}/>,x.goals,x.assists??'—',x.matches_played,x.team_result])}/>
    </Panel>
    <Panel title="Top 10 highest goal scorers — World Cup history">
      <Status loading={goalsApi.loading} error={goalsApi.error} retry={goalsApi.retry}/>
      <Table headers={['Rank','Player','Goals','Matches','Tournaments']} rows={goalLeaders.map(x=>[<RankPill r={x._rank}/>,<PlayerCell name={x.player} country={x.country} rank={x._rank}/>,x.goals,x.matches_played,x.tournaments])}/>
    </Panel>
    <Panel title="Top 10 highest assist providers — World Cup history">
      <Status loading={assistsApi.loading} error={assistsApi.error} retry={assistsApi.retry}/>
      <Table headers={['Rank','Player','Assists','Tournaments']} rows={assistLeaders.map(x=>[<RankPill r={x._rank}/>,<PlayerCell name={x.player} country={x.country} rank={x._rank}/>,x.assists,x.tournaments])}/>
    </Panel>
    <Panel title="Top 10 most assists in a single tournament (ties broken by fewer matches)">
      <Status loading={singleApi.loading} error={singleApi.error} retry={singleApi.retry}/>
      <Table headers={['Rank','Player','Assists','Edition','Matches Played']} rows={singleLeaders.map(x=>[<RankPill r={x._rank}/>,<PlayerCell name={x.player} country={x.country} rank={x._rank}/>,x.assists,x.year,x.matches_played??'—'])}/>
    </Panel>
    <Panel title="Combined Goal Contributions (G+A) — best single edition">
      <Table headers={['Rank','Year','Player','G+A','Goals','Assists','Matches']} rows={singleEditionGA.map(x=>[<RankPill r={x._rank}/>,x.year,<PlayerCell name={x.player} country={x.country} rank={x._rank}/>,(+x.goals||0)+(+x.assists||0),x.goals,x.assists??0,x.matches_played])}/>
    </Panel>
  </>
}

// Squads: year picked from a dropdown (populated from real edition years, newest first),
// defaulting to 2026, so there's no invalid/partial-year state to guard against.
// Redesigned from a flat table into a roster showcase: a stats bar for the selected year
// (players, teams, average age, top scorer in the squad list), then every matching player
// grouped into a card per team with a colored position badge per row — much more scannable
// than one giant table, especially for editions with 30+ squads.
function posBadge(pos){
  const p=String(pos||'').toUpperCase();
  let cls='other';
  if(p.includes('GK'))cls='gk'; else if(p.includes('DF'))cls='df'; else if(p.includes('MF'))cls='mf'; else if(p.includes('FW'))cls='fw';
  return <span className={`pos-badge ${cls}`}>{pos||'—'}</span>;
}
function Squads(){
  const editionsApi=useApi('/editions');
  const years=useMemo(()=>[...(editionsApi.data||[])].map(x=>x.year).sort((a,b)=>b-a),[editionsApi.data]);
  const[y,setY]=useState(null),[q,setQ]=useState('');
  useEffect(()=>{if(y===null&&years.length)setY(years.includes(2026)?2026:years[0])},[years,y]);
  const{data,loading,error,retry}=useApi(y?`/squads?year=${y}&limit=2000`:null);
  const d=data||[];
  const rows=d.filter(x=>[x.team,x.player_name,x.position].join(' ').toLowerCase().includes(q.toLowerCase()));
  const summary=useMemo(()=>{
    if(!rows.length)return null;
    const teams=new Set(rows.map(x=>x.team)).size;
    const ages=rows.map(x=>+x.age).filter(n=>!Number.isNaN(n));
    const avgAge=ages.length?(ages.reduce((s,n)=>s+n,0)/ages.length).toFixed(1):'—';
    const top=[...rows].sort((a,b)=>(+b.goals||0)-(+a.goals||0))[0];
    return {players:rows.length,teams,avgAge,top};
  },[rows]);
  const byTeam=useMemo(()=>{
    const m={};
    rows.forEach(x=>{(m[x.team]=m[x.team]||[]).push(x)});
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
  },[rows]);
  return <>
    <div className="filters"><select value={y??''} onChange={e=>setY(+e.target.value)}>{years.map(yr=><option key={yr} value={yr}>{yr}</option>)}</select><input placeholder="Team / player / position" value={q} onChange={e=>setQ(e.target.value)}/></div>
    {summary&&<div className="stats">
      <Stat icon={Users} label="Squad records" value={summary.players} accent="#7dc4fa"/>
      <Stat icon={ShieldCheck} label="Teams" value={summary.teams} accent="#c893f5"/>
      <Stat icon={Zap} label="Average age" value={summary.avgAge} accent="#5fe3a1"/>
      <Stat icon={Goal} label="Top scorer in squad list" value={summary.top?.player_name||'—'} sub={summary.top?`${summary.top.goals||0} goals · ${summary.top.team}`:undefined} accent="#f4c94f"/>
    </div>}
    <Status loading={loading||editionsApi.loading} error={error||editionsApi.error} retry={()=>{retry();editionsApi.retry()}} empty={!loading&&!error&&rows.length===0}/>
    <Panel title={`${rows.length} squad records across ${byTeam.length} team${byTeam.length===1?'':'s'}`}>
      <div className="squad-grid">
        {byTeam.map(([team,players])=>{
          const code=(players[0]?.team_code||team).toString().slice(0,3).toUpperCase();
          const sorted=[...players].sort((a,b)=>(+b.goals||0)-(+a.goals||0));
          return <div className="squad-card" key={team}>
            <div className="squad-card-head"><div className="squad-avatar">{code}</div><div><b>{team}</b><small>{players.length} players</small></div></div>
            <div className="squad-roster">
              <table><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>Goals</th></tr></thead>
                <tbody>{sorted.map((x,i)=><tr key={i}><td>{x.player_name}</td><td>{posBadge(x.position)}</td><td>{x.age??'—'}</td><td>{x.goals??0}</td></tr>)}</tbody>
              </table>
            </div>
          </div>;
        })}
      </div>
    </Panel>
  </>
}

// Awards: split into Ball (best player) and Boot (top scorer) tables, each showing
// gold/silver/bronze, plus a separate Golden Glove table. Redesigned with a stats bar, a
// "latest edition" spotlight, and — per the historical record supplied for this update —
// each award now also shows the winner's appearances (matches played) and their
// contribution that tournament (assists for the Ball, goals already shown for the Boot,
// clean sheets/goals conceded for the Glove). A notice banner flags that Silver & Bronze
// Ball have only been awarded since 1982 and the Golden Glove only since 1994, since
// earlier "—" cells reflect the award not existing yet rather than missing data.
function topByCount(arr,key){
  const m={};
  arr.forEach(x=>{const v=x[key]; if(v)m[v]=(m[v]||0)+1});
  return Object.entries(m).sort((a,b)=>b[1]-a[1])[0];
}
const TIER_COLOR={gold:'#f4c94f',silver:'#c9d3e0',bronze:'#d98a52'};
const TIER_MEDAL={gold:'🥇',silver:'🥈',bronze:'🥉'};
function AwardCell({player,country,matches,extraLabel,extraValue,note,tier='gold'}){
  if(!player)return note?<span className="chip muted">{note}</span>:<span className="chip muted">—</span>;
  const color=TIER_COLOR[tier]||TIER_COLOR.gold;
  const players=String(player).split('|');
  if(players.length>1){
    const countries=String(country||'').split('|');
    return <div className="award-tie" style={{'--c':color}}>
      <div className="award-tie-label">{TIER_MEDAL[tier]} {players.length}-way tie{extraValue?` · ${extraValue} ${extraLabel} each`:''}</div>
      <div className="chip-list">{players.map((p,i)=><span className="chip" key={i}>{p.trim()}{countries[i]?<em> · {countries[i].trim()}</em>:null}</span>)}</div>
    </div>;
  }
  const bits=[];
  if(matches!=null&&matches!=='')bits.push(`${matches} apps`);
  if(extraValue!=null&&extraValue!==''&&!Number.isNaN(+extraValue))bits.push(`${extraValue} ${extraLabel}`);
  return <div className="award-cell" style={{'--c':color}}>
    <b>{TIER_MEDAL[tier]} {player}</b>
    {country&&<span className="award-country">{country}</span>}
    {bits.length>0&&<div className="chip-list">{bits.map((b,i)=><span className="chip" key={i}>{b}</span>)}</div>}
  </div>;
}
function Awards(){
  const{data,loading,error,retry}=useApi('/awards');
  const d=data||[];
  const latest=useMemo(()=>d.length?[...d].sort((a,b)=>b.year-a.year)[0]:null,[d]);
  const topBall=topByCount(d,'golden_ball_player'),topBoot=topByCount(d,'golden_boot_player');
  const highestBoot=useMemo(()=>d.length?[...d].sort((a,b)=>(+b.golden_boot_goals||0)-(+a.golden_boot_goals||0))[0]:null,[d]);
  const glovesTracked=d.filter(x=>x.golden_glove_player).length;
  return <>
    <Status loading={loading} error={error} retry={retry}/>
    {d.length>0&&<div className="stats">
      <Stat icon={ShieldCheck} label="Most Golden Balls" value={topBall?.[0]||'—'} sub={topBall?`${topBall[1]}×`:undefined} accent="#f4c94f"/>
      <Stat icon={Goal} label="Most Golden Boots" value={topBoot?.[0]||'—'} sub={topBoot?`${topBoot[1]}×`:undefined} accent="#7dc4fa"/>
      <Stat icon={Zap} label="Most goals · single edition" value={highestBoot?.golden_boot_goals||'—'} sub={highestBoot?`${highestBoot.golden_boot_player} · ${highestBoot.year}`:undefined} accent="#5fe3a1"/>
      <Stat icon={Medal} label="Golden Gloves awarded" value={glovesTracked} sub="Tracked since 1994" accent="#c893f5"/>
    </div>}
    {latest&&<div className="highlight highlight-3">
      <div><span>🥇 {latest.year} BEST PLAYER</span><b>{latest.golden_ball_player}</b><small>{latest.golden_ball_country}{latest.golden_ball_matches?` · ${latest.golden_ball_matches} apps`:''}</small></div>
      <div><span>🥇 {latest.year} TOP SCORER</span><b>{latest.golden_boot_player}</b><small>{latest.golden_boot_country} · {latest.golden_boot_goals} goals</small></div>
      <div><span>🧤 {latest.year} GOLDEN GLOVE</span><b>{latest.golden_glove_player||'—'}</b><small>{latest.golden_glove_country||''}{latest.golden_glove_clean_sheets?` · ${latest.golden_glove_clean_sheets} clean sheets`:''}</small></div>
    </div>}
    <div className="status-msg">ℹ️ Silver &amp; Bronze Ball have been awarded since <b>1982</b> (earlier editions recognized only one Best Player) · Golden Glove has been tracked since <b>1994</b>. Editions before those years show as not awarded rather than missing data.</div>
    <Panel title="Best Player — Golden / Silver / Bronze Ball">
      <Table headers={['Year','🥇 Golden Ball','🥈 Silver Ball','🥉 Bronze Ball']} rows={d.map(x=>[x.year,
        <AwardCell tier="gold" player={x.golden_ball_player} country={x.golden_ball_country} matches={x.golden_ball_matches} extraLabel="assists" extraValue={x.golden_ball_assists}/>,
        <AwardCell tier="silver" player={x.silver_ball_player} country={x.silver_ball_country} matches={x.silver_ball_matches} extraLabel="assists" extraValue={x.silver_ball_assists} note={x.year<1982?'Not awarded yet':undefined}/>,
        <AwardCell tier="bronze" player={x.bronze_ball_player} country={x.bronze_ball_country} matches={x.bronze_ball_matches} extraLabel="assists" extraValue={x.bronze_ball_assists} note={x.year<1982?'Not awarded yet':undefined}/>,
      ])}/>
    </Panel>
    <Panel title="Top Scorer — Golden / Silver / Bronze Boot">
      <Table headers={['Year','🥇 Golden Boot','🥈 Silver Boot','🥉 Bronze Boot']} rows={d.map(x=>[x.year,
        <AwardCell tier="gold" player={x.golden_boot_player} country={x.golden_boot_country} matches={x.golden_boot_matches} extraLabel="goals" extraValue={x.golden_boot_goals}/>,
        <AwardCell tier="silver" player={x.silver_boot_player} country={x.silver_boot_country} matches={x.silver_boot_matches} extraLabel="goals" extraValue={x.silver_boot_goals} note={x.year<1982?'Not awarded yet':undefined}/>,
        <AwardCell tier="bronze" player={x.bronze_boot_player} country={x.bronze_boot_country} matches={x.bronze_boot_matches} extraLabel="goals" extraValue={x.bronze_boot_goals} note={x.year<1982?'Not awarded yet':undefined}/>,
      ])}/>
    </Panel>
    <Panel title="Golden Glove — Best Goalkeeper">
      <Table headers={['Year','Goalkeeper']} rows={d.filter(x=>x.golden_glove_player).map(x=>[x.year,
        <div className="award-cell" style={{'--c':'#7dc4fa'}}>
          <b>🧤 {x.golden_glove_player}</b>
          {x.golden_glove_country&&<span className="award-country">{x.golden_glove_country}</span>}
          <div className="chip-list">
            {x.golden_glove_matches!=null&&x.golden_glove_matches!==''&&<span className="chip">{x.golden_glove_matches} apps</span>}
            {x.golden_glove_clean_sheets!=null&&x.golden_glove_clean_sheets!==''&&<span className="chip">🧼 {x.golden_glove_clean_sheets} clean sheets</span>}
            {x.golden_glove_goals_conceded!=null&&x.golden_glove_goals_conceded!==''&&<span className="chip">⚽ {x.golden_glove_goals_conceded} conceded</span>}
          </div>
        </div>
      ])}/>
    </Panel>
  </>
}

// Discipline: year picked from a dropdown (populated from real edition years, newest
// first), defaulting to 2026, instead of a free-text field. The "Data available?" column
// added no analytical value, so it stays dropped.
// Discipline: year picked from a dropdown (populated from real edition years, newest
// first), defaulting to 2026, instead of a free-text field. The "Data available?" column
// added no analytical value, so it stays dropped.
// The backend now returns discipline rows in true chronological order for every edition
// (some older editions' source rows were recorded newest-first, which made the round
// grouping below start at the Final instead of the Group stage for those years only —
// fixed at the source so every edition now reads Group stage -> ... -> Final the same way).
// Redesigned from a single flat table into: a stats bar (matches, cards, most-carded
// match), a cards-by-round chart, and per-round panels with colored round badges and
// yellow/red card chips instead of plain numbers.
// Discipline: the per-match table now shows cards attached to the team that actually
// conceded them (home/away split, via TeamCardCell) instead of one combined match total
// that didn't say which side it belonged to. A new "Cards by team" panel aggregates that
// same home/away split across the whole selected edition, ranked by total cards, so
// "which team" is answered at both the single-match and tournament level.
function TeamCardCell({team,yellow,red}){
  const y=+yellow||0,r=+red||0;
  return <div className="player-cell"><b>{team}</b><div className="chip-list" style={{marginTop:4}}>
    {y>0&&<span className="chip">🟨 {y}</span>}
    {r>0&&<span className="chip" style={{color:'#ff6b81',borderColor:'#5a2a35'}}>🟥 {r}</span>}
    {y===0&&r===0&&<span className="chip muted">Clean sheet</span>}
  </div></div>;
}
// Discipline: year dropdown now includes an "All Editions" option (like Matches/Goal
// Timeline), paired with a team search box - so you can pull one team's discipline
// record for a single edition (e.g. "Brazil" + "2014") or across every edition it has
// played (e.g. "England" + "All Editions"). When "All Editions" is selected, the cards
// chart groups by edition instead of by round (round only makes sense within one
// tournament), and the match list groups by year instead of by round.
function Discipline(){
  const editionsApi=useApi('/editions');
  const years=useMemo(()=>[...(editionsApi.data||[])].map(x=>x.year).sort((a,b)=>b-a),[editionsApi.data]);
  const{data,loading,error,retry}=useApi('/discipline?limit=5000'),[y,setY]=useState(null);
  useEffect(()=>{if(y===null&&years.length)setY(years.includes(2026)?2026:years[0])},[years,y]);
  const[team,setTeam]=useState('');
  const isAll=y==='all';
  const d=data||[];
  const rows=useMemo(()=>{
    const t=team.trim().toLowerCase();
    return d.filter(x=>{
      if(!isAll&&x.year!==y)return false;
      if(!t)return true;
      return String(x.home_team).toLowerCase().includes(t)||String(x.away_team).toLowerCase().includes(t);
    });
  },[d,y,isAll,team]);
  const totals=rows.reduce((a,x)=>{a.yellow+=(+x.total_yellow_cards||0);a.red+=(+x.total_red_cards||0);return a},{yellow:0,red:0});
  const mostCarded=useMemo(()=>rows.length?[...rows].sort((a,b)=>((+b.total_yellow_cards||0)+(+b.total_red_cards||0))-((+a.total_yellow_cards||0)+(+a.total_red_cards||0)))[0]:null,[rows]);
  const groupKeys=isAll?[...new Set(rows.map(x=>x.year))].sort((a,b)=>b-a):[...new Set(rows.map(x=>x.round))];
  const byGroup=useMemo(()=>groupKeys.map(k=>{
    const rr=rows.filter(x=>isAll?x.year===k:x.round===k);
    return {label:k,yellow:rr.reduce((s,x)=>s+(+x.total_yellow_cards||0),0),red:rr.reduce((s,x)=>s+(+x.total_red_cards||0),0)};
  }),[rows,groupKeys,isAll]);
  const byTeam=useMemo(()=>{
    const agg={};
    const add=(t,yel,red)=>{
      if(!t)return;
      if(!agg[t])agg[t]={team:t,matches:0,yellow:0,red:0};
      agg[t].matches+=1; agg[t].yellow+=(+yel||0); agg[t].red+=(+red||0);
    };
    rows.forEach(x=>{add(x.home_team,x.home_yellow_cards,x.home_red_cards);add(x.away_team,x.away_yellow_cards,x.away_red_cards)});
    return Object.values(agg).sort((a,b)=>(b.yellow+b.red)-(a.yellow+a.red));
  },[rows]);
  return <>
    <div className="filters">
      <select value={y??''} onChange={e=>setY(e.target.value==='all'?'all':+e.target.value)}>
        <option value="all">All Editions</option>
        {years.map(yr=><option key={yr} value={yr}>{yr}</option>)}
      </select>
      <input placeholder="Team (e.g. Brazil)" value={team} onChange={e=>setTeam(e.target.value)}/>
    </div>
    <Status loading={loading||editionsApi.loading} error={error||editionsApi.error} retry={()=>{retry();editionsApi.retry()}} empty={!loading&&!error&&rows.length===0}/>
    {rows.length>0&&<div className="stats">
      <Stat icon={CalendarDays} label="Matches" value={rows.length} accent="#7dc4fa"/>
      <Stat icon={BarChart3} label="Yellow cards" value={totals.yellow} accent="#f4c94f"/>
      <Stat icon={X} label="Red cards" value={totals.red} accent="#ff6b81"/>
      <Stat icon={Zap} label="Most-carded match" value={mostCarded?`${mostCarded.home_team} vs ${mostCarded.away_team}`:'—'} sub={mostCarded?`🟨 ${mostCarded.total_yellow_cards} · 🟥 ${mostCarded.total_red_cards}${isAll?` · ${mostCarded.year}`:''}`:undefined} accent="#c893f5"/>
    </div>}
    <Panel title={isAll?`Cards by edition${team?` · ${team}`:''}`:`Cards by round · ${y}`}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={byGroup}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis dataKey="label" tick={{fontSize:11}}/><YAxis allowDecimals={false}/><Tooltip cursor={false}/><Legend/>
          <Bar dataKey="yellow" name="Yellow" fill="#f4c94f" radius={[4,4,0,0]} activeBar={{fill:'#eef3fb',stroke:'#f4c94f',strokeWidth:2}}/>
          <Bar dataKey="red" name="Red" fill="#ff6b81" radius={[4,4,0,0]} activeBar={{fill:'#eef3fb',stroke:'#ff6b81',strokeWidth:2}}/>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
    <Panel title={isAll?`Cards by team${team?` matching "${team}"`:''}`:`Cards by team · ${y}`}>
      <Table headers={['Team','Matches','Yellow','Red','Total']} rows={byTeam.map(x=>[x.team,x.matches,x.yellow,x.red>0?<span style={{color:'#ff6b81',fontWeight:700}}>{x.red}</span>:0,x.yellow+x.red])}/>
    </Panel>
    {groupKeys.map(k=>{
      const rr=rows.filter(x=>isAll?x.year===k:x.round===k);
      return <Panel key={k} title={isAll?<span>{k}<span className="round-badge" style={{marginLeft:8,background:'#161d29',color:'#9aa5b5',border:'1px solid #2a3341'}}>{rr.length} match{rr.length===1?'':'es'}</span></span>:<span><RoundBadge round={k}/> · {rr.length} match{rr.length===1?'':'es'}</span>}>
        <Table headers={isAll?['Date','Round','Home','Away']:['Date','Home','Away']} rows={rr.map(x=>{
          const home=<TeamCardCell team={x.home_team} yellow={x.home_yellow_cards} red={x.home_red_cards}/>;
          const away=<TeamCardCell team={x.away_team} yellow={x.away_yellow_cards} red={x.away_red_cards}/>;
          return isAll?[x.date,x.round,home,away]:[x.date,home,away];
        })}/>
      </Panel>;
    })}
  </>
}

// Confederations: added a search box over the directory, plus a confederation-wise
// analysis panel (countries per confederation, World Cup titles, and which teams won
// them) backed by the new /api/confederations/stats endpoint.
// Confederations: redesigned as a visual showcase rather than a plain table — colorful
// donut + bar charts (both keyed off the same confederation color palette), a card grid
// summarizing each confederation (countries, titles, champion chips), and the searchable
// directory table now carries a colored confederation badge per row instead of plain text.
const CONFED_COLORS={UEFA:'#7dc4fa',CONMEBOL:'#f4c94f',CAF:'#5fe3a1',AFC:'#c893f5',CONCACAF:'#ff9d6b',OFC:'#5fd6d6'};
const CONFED_ICON={UEFA:'🌍',CONMEBOL:'🌎',CAF:'🌍',AFC:'🌏',CONCACAF:'🌎',OFC:'🌏'};
const confedColor=c=>CONFED_COLORS[c]||'#8fa0c0';
function Confederations(){
  const{data,loading,error,retry}=useApi('/confederations');
  const statsApi=useApi('/confederations/stats');
  const[q,setQ]=useState('');
  const d=data||[];
  const rows=d.filter(x=>[x.team,x.confederation,x.continent].join(' ').toLowerCase().includes(q.toLowerCase()));
  const c=useMemo(()=>{const m={};d.forEach(x=>m[x.confederation]=(m[x.confederation]||0)+1);return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);},[d]);
  const stats=[...(statsApi.data||[])].sort((a,b)=>b.titles-a.titles);
  const totalTitles=stats.reduce((s,x)=>s+x.titles,0);
  const top=stats[0];
  return <>
    <div className="stats">
      <Stat icon={Globe2} label="Confederations" value={stats.length||6} accent="#7dc4fa"/>
      <Stat icon={Users} label="Countries tracked" value={d.length} accent="#c893f5"/>
      <Stat icon={Trophy} label="World Cup titles awarded" value={totalTitles} accent="#f4c94f"/>
      <Stat icon={Medal} label="Most decorated" value={top?.confederation||'—'} sub={top?`${top.titles} titles`:undefined} accent={confedColor(top?.confederation)}/>
    </div>
    <div className="grid2">
      <Panel title="Teams by confederation">
        <Status loading={loading} error={error} retry={retry}/>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={c} dataKey="value" nameKey="name" innerRadius={62} outerRadius={112} paddingAngle={3} label={({name,value})=>`${name} ${value}`}>
              {c.map((x,i)=><Cell key={i} fill={confedColor(x.name)} stroke="#0a0d13" strokeWidth={2}/>)}
            </Pie>
            <Tooltip/><Legend/>
          </PieChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="World Cup titles by confederation">
        <Status loading={statsApi.loading} error={statsApi.error} retry={statsApi.retry}/>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="confederation"/><YAxis allowDecimals={false}/><Tooltip cursor={false}/>
            <Bar dataKey="titles" radius={[6,6,0,0]} activeBar={{fill:'#eef3fb',stroke:'#f0b429',strokeWidth:2}}>{stats.map((x,i)=><Cell key={i} fill={confedColor(x.confederation)}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
    <Status loading={statsApi.loading} error={statsApi.error} retry={statsApi.retry}/>
    <div className="confed-grid">
      {stats.map(x=><div className="confed-card" key={x.confederation} style={{'--c':confedColor(x.confederation)}}>
        <div className="confed-card-head"><span className="confed-icon">{CONFED_ICON[x.confederation]||'⚽'}</span><div><b>{x.confederation}</b><small>{x.countries} countries</small></div><span className="confed-titles">{x.titles}<em>title{x.titles===1?'':'s'}</em></span></div>
        <div className="chip-list">
          {x.champions_detail?x.champions_detail.split(', ').map((ch,i)=><span className="chip" key={i}>🏆 {ch}</span>):<span className="chip muted">No titles yet</span>}
        </div>
      </div>)}
    </div>
    <Toolbar placeholder="Search country or confederation" value={q} onChange={setQ}/>
    <Status loading={loading} error={error} retry={retry} empty={!loading&&!error&&rows.length===0}/>
    <Panel title={`Confederation directory (${rows.length})`}>
      <Table headers={['Team','Confederation','Continent']} rows={rows.map(x=>[x.team,<span className="confed-badge" style={{'--c':confedColor(x.confederation)}}>{x.confederation}</span>,x.continent])}/>
    </Panel>
  </>
}
function Table({headers,rows}){return <div className="tablewrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v??'—'}</td>)}</tr>)}</tbody></table></div>}
function Routes(){const p=useLocation().pathname;if(p==='/')return <Dashboard/>;if(p==='/tournaments')return <Tournaments/>;if(p==='/teams')return <Teams/>;if(p==='/compare')return <Compare/>;if(p==='/matches')return <Matches/>;if(p==='/goal-timeline')return <GoalTimeline/>;if(p==='/groups')return <Groups/>;if(p==='/players')return <Players/>;if(p==='/squads')return <Squads/>;if(p==='/awards')return <Awards/>;if(p==='/discipline')return <Discipline/>;if(p==='/confederations')return <Confederations/>;return <Dashboard/>}
function App(){return <Layout><Routes/></Layout>}
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);
