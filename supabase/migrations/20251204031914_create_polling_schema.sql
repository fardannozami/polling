/*
  # Coffee Polling Schema

  1. New Tables
    - `poll_options`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the coffee shop/place
      - `location` (text) - Location description
      - `map_url` (text) - Google Maps URL or coordinates
      - `created_by` (uuid) - User who added this option
      - `created_at` (timestamptz)
      - `vote_count` (integer) - Cached vote count for performance
    
    - `votes`
      - `id` (uuid, primary key)
      - `option_id` (uuid, foreign key to poll_options)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - Unique constraint on (option_id, user_id) to prevent duplicate votes

  2. Security
    - Enable RLS on all tables
    - `poll_options`: Anyone authenticated can read, insert. Creator can delete their own options
    - `votes`: Users can insert their own votes, read all votes, delete their own votes
*/

CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  map_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  vote_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(option_id, user_id)
);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view poll options"
  ON poll_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add poll options"
  ON poll_options FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own options"
  ON poll_options FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Anyone authenticated can view votes"
  ON votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_votes_option_id ON votes(option_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_created_by ON poll_options(created_by);

-- Ensure clean state when reapplying
DROP TRIGGER IF EXISTS trigger_update_vote_count ON votes;

CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options SET vote_count = vote_count - 1 WHERE id = OLD.option_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_count
AFTER INSERT OR DELETE ON votes
FOR EACH ROW
EXECUTE FUNCTION update_vote_count();
