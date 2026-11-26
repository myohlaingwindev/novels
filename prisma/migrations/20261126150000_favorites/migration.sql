CREATE TABLE IF NOT EXISTS favorites (
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  novel_id BIGINT NOT NULL REFERENCES novels (id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, novel_id)
);
