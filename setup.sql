CREATE TABLE IF NOT EXISTS bots (id TEXT, grammar JSON, token TEXT, secret TEXT, updated_on timestamp default CURRENT_TIMESTAMP not null);

-- Make sure all columns exist
ALTER TABLE IF EXISTS bots
    ADD COLUMN IF NOT EXISTS id TEXT,
    ADD COLUMN IF NOT EXISTS grammar JSON,
    ADD COLUMN IF NOT EXISTS token TEXT,
    ADD COLUMN IF NOT EXISTS secret TEXT,
    ADD COLUMN updated_on timestamp default CURRENT_TIMESTAMP not null;