CREATE TABLE IF NOT EXISTS healing_events (
  id SERIAL PRIMARY KEY,
  test_case_id INTEGER REFERENCES test_cases(id),
  old_selector TEXT NOT NULL,
  new_selector TEXT,
  confidence TEXT, -- 'high', 'medium', 'low'
  reasoning TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);



CREATE TABLE IF NOT EXISTS test_cases (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  source_story TEXT,
  generated_by TEXT, -- 'human' or 'ai:groq' or 'ai:anthropic'
  created_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS test_runs (
  id SERIAL PRIMARY KEY,
  test_case_id INTEGER REFERENCES test_cases(id),
  status TEXT NOT NULL, -- 'passed', 'failed', 'flaky'
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  browser TEXT
);

CREATE TABLE IF NOT EXISTS failures (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES test_runs(id),
  error_message TEXT,
  screenshot_path TEXT,
  trace_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);