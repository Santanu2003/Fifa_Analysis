CREATE TABLE IF NOT EXISTS editions (year INTEGER PRIMARY KEY, host_country TEXT NOT NULL, champion TEXT, runner_up TEXT, third_place TEXT, total_teams INTEGER, total_matches INTEGER, total_goals INTEGER);
CREATE TABLE IF NOT EXISTS teams (team_id SERIAL PRIMARY KEY, team_name TEXT NOT NULL UNIQUE, confederation TEXT);
CREATE TABLE IF NOT EXISTS matches (match_id BIGSERIAL PRIMARY KEY, year INTEGER NOT NULL REFERENCES editions(year), match_date DATE, round TEXT, home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_score INTEGER NOT NULL, away_score INTEGER NOT NULL, winner TEXT, goal_diff INTEGER, total_goals INTEGER, stadium TEXT, city TEXT, attendance INTEGER, UNIQUE(year, match_date, round, home_team, away_team));
CREATE INDEX IF NOT EXISTS idx_matches_year ON matches(year);
CREATE INDEX IF NOT EXISTS idx_matches_home ON matches(home_team);
CREATE INDEX IF NOT EXISTS idx_matches_away ON matches(away_team);
