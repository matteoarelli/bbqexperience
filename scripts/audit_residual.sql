-- Verifica problemi residui dopo il cleanup iniziale
SELECT
  'blog_posts' AS t, locale, COUNT(*) AS total,
  COUNT(*) FILTER (WHERE content LIKE '%' || E'\u00AD' || '%') AS soft_hyphen,
  COUNT(*) FILTER (WHERE content ~ E'\\]\\(/(en|it|es)/(reviews|recipes|tutorials)/') AS md_link_anylocale,
  COUNT(*) FILTER (WHERE locale='it' AND content ~ E'\\]\\(/en/') AS md_link_it_to_en,
  COUNT(*) FILTER (WHERE locale='es' AND content ~ E'\\]\\(/es/(reviews|recipes|tutorials)/') AS md_link_es_wrong_slug
FROM blog_posts WHERE published_at IS NOT NULL GROUP BY locale
UNION ALL
SELECT 'tutorials', locale, COUNT(*),
  COUNT(*) FILTER (WHERE content LIKE '%' || E'\u00AD' || '%'),
  COUNT(*) FILTER (WHERE content ~ E'\\]\\(/(en|it|es)/(reviews|recipes|tutorials)/'),
  COUNT(*) FILTER (WHERE locale='it' AND content ~ E'\\]\\(/en/'),
  COUNT(*) FILTER (WHERE locale='es' AND content ~ E'\\]\\(/es/(reviews|recipes|tutorials)/')
FROM tutorials WHERE published_at IS NOT NULL GROUP BY locale
UNION ALL
SELECT 'reviews', locale, COUNT(*),
  COUNT(*) FILTER (WHERE editorial_content LIKE '%' || E'\u00AD' || '%'),
  COUNT(*) FILTER (WHERE editorial_content ~ E'\\]\\(/(en|it|es)/(reviews|recipes|tutorials)/'),
  COUNT(*) FILTER (WHERE locale='it' AND editorial_content ~ E'\\]\\(/en/'),
  COUNT(*) FILTER (WHERE locale='es' AND editorial_content ~ E'\\]\\(/es/(reviews|recipes|tutorials)/')
FROM reviews WHERE published_at IS NOT NULL GROUP BY locale
UNION ALL
SELECT 'recipes', locale, COUNT(*),
  COUNT(*) FILTER (WHERE editorial_intro LIKE '%' || E'\u00AD' || '%'),
  COUNT(*) FILTER (WHERE editorial_intro ~ E'\\]\\(/(en|it|es)/(reviews|recipes|tutorials)/'),
  COUNT(*) FILTER (WHERE locale='it' AND editorial_intro ~ E'\\]\\(/en/'),
  COUNT(*) FILTER (WHERE locale='es' AND editorial_intro ~ E'\\]\\(/es/(reviews|recipes|tutorials)/')
FROM recipes WHERE published_at IS NOT NULL GROUP BY locale
ORDER BY t, locale;
