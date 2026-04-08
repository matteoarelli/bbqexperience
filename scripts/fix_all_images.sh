#!/bin/bash
# Fix tutte le immagini mancanti su blog posts, reviews e tutorials
# Scarica da Pexels CDN e carica su Strapi
set -o pipefail

TOKEN="60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9"
CMS="https://cms.bbq-experience.com"

# Pool di ID Pexels BBQ verificati e funzionanti
PIDS=(1435901 1437590 1482803 2233729 2338407 2491273 2641886 3186654 3298637 410648 1105325 3659862 1853899 8753119 1111315 2901854 3535383 5407359 1878484 1267320 1639565 2313686 6941010 8694606 698308 60616 2673353 3655916 3296279 725991 1516415 3843224 5419333 1640777 3872373 1656666)
IDX=0
DONE=0
FAIL=0

upload_one() {
  local CT="$1"
  local FIELD="$2"
  local DOC="$3"
  local SLUG="$4"

  local PID=${PIDS[$((IDX % ${#PIDS[@]}))]}
  IDX=$((IDX+1))
  local TMP="/tmp/img-${SLUG:0:30}.jpg"

  curl -sL "https://images.pexels.com/photos/${PID}/pexels-photo-${PID}.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop" -o "$TMP"
  local SZ
  SZ=$(stat -c%s "$TMP" 2>/dev/null || echo 0)
  if [ "$SZ" -lt 5000 ]; then
    echo "FAIL download: $SLUG (pexels:$PID ${SZ}b)"
    rm -f "$TMP"
    FAIL=$((FAIL+1))
    return
  fi

  local FID
  FID=$(curl -s --max-time 60 -X POST "${CMS}/api/upload" \
    -H "Authorization: Bearer ${TOKEN}" \
    -F "files=@${TMP};filename=${SLUG}.jpg" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)
  rm -f "$TMP"

  if [ -z "$FID" ]; then
    echo "FAIL upload: $SLUG"
    FAIL=$((FAIL+1))
    return
  fi

  curl -s --max-time 10 -X PUT "${CMS}/api/${CT}/${DOC}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"data\":{\"${FIELD}\":${FID}}}" > /dev/null 2>&1

  echo "OK: $SLUG -> pexels:$PID file:$FID"
  DONE=$((DONE+1))
  sleep 0.3
}

echo "=== BLOG POSTS ==="
docker exec postgres psql -U bbqexperience -d bbqexperience -t -A -F"|" -c \
  "SELECT bp.document_id, bp.slug FROM blog_posts bp LEFT JOIN files_related_mph frm ON frm.related_id = bp.id AND frm.related_type = 'api::blog-post.blog-post' AND frm.field = 'cover_image' WHERE bp.published_at IS NOT NULL AND bp.locale = 'en' AND frm.file_id IS NULL;" \
  | while IFS="|" read -r DOC SLUG; do
    [ -z "$DOC" ] && continue
    upload_one "blog-posts" "cover_image" "$DOC" "$SLUG"
  done

echo ""
echo "=== REVIEWS ==="
docker exec postgres psql -U bbqexperience -d bbqexperience -t -A -F"|" -c \
  "SELECT r.document_id, r.slug FROM reviews r LEFT JOIN files_related_mph frm ON frm.related_id = r.id AND frm.related_type = 'api::review.review' AND frm.field = 'gallery' WHERE r.published_at IS NOT NULL AND r.locale = 'en' AND frm.file_id IS NULL;" \
  | while IFS="|" read -r DOC SLUG; do
    [ -z "$DOC" ] && continue
    upload_one "reviews" "gallery" "$DOC" "$SLUG"
  done

echo ""
echo "=== TUTORIALS ==="
docker exec postgres psql -U bbqexperience -d bbqexperience -t -A -F"|" -c \
  "SELECT t.document_id, t.slug FROM tutorials t LEFT JOIN files_related_mph frm ON frm.related_id = t.id AND frm.related_type = 'api::tutorial.tutorial' AND frm.field = 'cover_image' WHERE t.published_at IS NOT NULL AND t.locale = 'en' AND frm.file_id IS NULL;" \
  | while IFS="|" read -r DOC SLUG; do
    [ -z "$DOC" ] && continue
    upload_one "tutorials" "cover_image" "$DOC" "$SLUG"
  done

echo ""
echo "=== TOTALE: $DONE OK, $FAIL FAIL ==="
