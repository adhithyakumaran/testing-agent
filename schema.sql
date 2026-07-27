CREATE TABLE IF NOT EXISTS test_cases (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  source_story TEXT,
  generated_by TEXT, -- 'human' or 'ai:groq' or 'ai:anthropic'
  app_name TEXT NOT NULL DEFAULT 'saucedemo',
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

CREATE TABLE IF NOT EXISTS healing_events (
  id SERIAL PRIMARY KEY,
  test_case_id INTEGER REFERENCES test_cases(id),
  old_selector TEXT,
  new_selector TEXT,
  confidence TEXT, -- 'high', 'medium', 'low'
  reasoning TEXT,
  failure_category TEXT,
  classification_reasoning TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llm_calls (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  caller TEXT, -- which agent made the call, e.g. 'generator', 'classifier', 'healer'
  input_tokens INTEGER,
  output_tokens INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
