-- Audit content quality across all CMS content types
SELECT
  'blog_posts' AS type, locale, COUNT(*) AS total,
  COUNT(*) FILTER (WHERE content ~ '## ' OR content ~ '\*\*[A-Z]' OR content ~ E'\\| [A-Z]') AS md_raw,
  COUNT(*) FILTER (WHERE content ~ '<a [^>]+><a ') AS nested_a,
  COUNT(*) FILTER (WHERE locale='it' AND content ~ '"/en/') AS wrong_locale_links,
  COUNT(*) FILTER (WHERE locale='es' AND (content ~ '"/es/reviews/' OR content ~ '"/es/tutorials/' OR content ~ '"/es/recipes/')) AS wrong_slug_links
FROM blog_posts WHERE published_at IS NOT NULL GROUP BY locale
UNION ALL
SELECT 'tutorials', locale, COUNT(*),
  COUNT(*) FILTER (WHERE content ~ '## ' OR content ~ '\*\*[A-Z]' OR content ~ E'\\| [A-Z]'),
  COUNT(*) FILTER (WHERE content ~ '<a [^>]+><a '),
  COUNT(*) FILTER (WHERE locale='it' AND content ~ '"/en/'),
  COUNT(*) FILTER (WHERE locale='es' AND (content ~ '"/es/reviews/' OR content ~ '"/es/tutorials/' OR content ~ '"/es/recipes/'))
FROM tutorials WHERE published_at IS NOT NULL GROUP BY locale
UNION ALL
SELECT 'reviews', locale, COUNT(*),
  COUNT(*) FILTER (WHERE editorial_content ~ '## ' OR editorial_content ~ '\*\*[A-Z]' OR editorial_content ~ E'\\| [A-Z]'),
  COUNT(*) FILTER (WHERE editorial_content ~ '<a [^>]+><a '),
  COUNT(*) FILTER (WHERE locale='it' AND editorial_content ~ '"/en/'),
  COUNT(*) FILTER (WHERE locale='es' AND (editorial_content ~ '"/es/reviews/' OR editorial_content ~ '"/es/tutorials/' OR editorial_content ~ '"/es/recipes/'))
FROM reviews WHERE published_at IS NOT NULL GROUP BY locale
UNION ALL
SELECT 'recipes', locale, COUNT(*),
  COUNT(*) FILTER (WHERE editorial_intro ~ '## ' OR editorial_intro ~ '\*\*[A-Z]' OR editorial_intro ~ E'\\| [A-Z]'),
  COUNT(*) FILTER (WHERE editorial_intro ~ '<a [^>]+><a '),
  COUNT(*) FILTER (WHERE locale='it' AND editorial_intro ~ '"/en/'),
  COUNT(*) FILTER (WHERE locale='es' AND (editorial_intro ~ '"/es/reviews/' OR editorial_intro ~ '"/es/tutorials/' OR editorial_intro ~ '"/es/recipes/'))
FROM recipes WHERE published_at IS NOT NULL GROUP BY locale
ORDER BY type, locale;
