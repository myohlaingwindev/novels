CREATE TABLE IF NOT EXISTS genres (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  label_my TEXT NOT NULL DEFAULT ''
);

INSERT INTO genres (slug, label, label_my) VALUES
  ('xianxia', 'Xianxia', 'ရှန်းရှား'),
  ('wuxia', 'Wuxia', 'ဝူရှား'),
  ('english', 'English fiction', 'အင်္ဂလိပ်ဝတ္ထု')
ON CONFLICT (slug) DO NOTHING;
