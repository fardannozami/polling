/*
  # Improve poll visibility and voter detail

  1. Make poll data readable by unauthenticated visitors so the homepage can show results
  2. Store optional voter identity details (email / name) alongside votes for display
*/

-- Allow unauthenticated (anon) visitors to read poll options and votes
DROP POLICY IF EXISTS "Public can view poll options" ON poll_options;
CREATE POLICY "Public can view poll options"
  ON poll_options FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can view votes" ON votes;
CREATE POLICY "Public can view votes"
  ON votes FOR SELECT
  TO anon
  USING (true);

-- Optional voter metadata for richer UI
ALTER TABLE votes ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS user_name text;
