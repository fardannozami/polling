/*
  # Make map_url mandatory

  1. Backfill existing rows with a generic Google Maps link when missing
  2. Enforce NOT NULL on poll_options.map_url
*/

UPDATE poll_options
SET map_url = 'https://maps.google.com/'
WHERE map_url IS NULL;

ALTER TABLE poll_options
  ALTER COLUMN map_url SET NOT NULL;
