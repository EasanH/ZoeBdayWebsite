#!/usr/bin/env python3
"""
merge_instagram.py
==================
Parses Meta/Instagram "Download Your Information" HTML message files
and merges them with an existing stats.json produced by
texting_recap_analyzer.py.  The result is a new stats.json that covers
both iMessage and Instagram conversations.

USAGE
-----
    python3 merge_instagram.py \\
        --stats   stats.json \\
        --ig      message_1.html message_2.html message_3.html \\
        --me      "Easan Hamkins" \\
        --her     "Zoe" \\
        --out     stats.json          # overwrite in-place, or use a new name

The --me and --her values are matched case-insensitively and as substrings,
so "Zoe" matches "Zoe ☀️", "zoe smith", etc.

MERGE STRATEGY  (why not reconstruct + recompute)
--------------------------------------------------
stats.json contains only aggregate counts — no raw message text or real
per-message timestamps.  Reconstructing synthetic messages (one per
year-month bucket, pinned to the 15th) corrupts:

  • Streak calculations  — need consecutive calendar dates, not bucketed ones
  • Vocabulary / words   — placeholder bodies ("hey", "ok") replace real text
  • Longest / shortest   — synthetic messages are all 2-4 chars

The correct approach is purely arithmetic:

  ADDITIVE          — counts that simply add (messages_sent, words_sent, …)
  COUNTER MERGE     — top-word / top-emoji lists: merge Counters, retake top-N
  WEIGHTED AVERAGE  — average lengths recomputed from merged totals
  MAX / MIN         — longest_message, streak, best_day: take the better value
  IG-WINS-IF-EARLIER — first_to_say: if Instagram has an earlier timestamp,
                        update that field
  KEEP IMESSAGE     — response_times (cross-platform timing is meaningless),
                        median lengths (can't recompute without raw data)
  PRESERVE          — milestones from iMessage stay intact; new milestones
                        that fall inside the Instagram count range are added

DEPENDENCIES
------------
Pure stdlib — no pip packages required.
"""

import argparse
import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from html import unescape
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────
# CONFIG  (must match texting_recap_analyzer.py)
# ─────────────────────────────────────────────────────────────────────

CONVERSATION_GAP_HOURS = 4
MIN_DOUBLE_TEXT_RUN    = 2
MILESTONES             = [1, 100, 1000, 5000, 10000, 100_000, 150_000, 200_000]

STOPWORDS = set("""
a an the and or but if is are was were be been being to of in on at for
with as by from about into like through after over between out against
during without before under around among i you he she it we they me him
her us them my your his its our their this that these those am im
youre hes shes were theyre ive youve weve theyve do does did doing have
has had having will would shall should can could may might must not no
nor so than then there here when where why how all any both each few
more most other some such only own same just don dont u ur ya ok okay
yeah yea yep nah lol lmao omg im'a gonna wanna gotta what t s get want yes i'm re Il also it's i'll ll wait hey wait sure message liked attachment too
""".split())

BUILTIN_PHRASES = {
    "i love you": ["i love you", "ily", "ilysm", "i luv u"],
    "sorry":      ["sorry", "my bad", "i apologize", "apologies"],
}

CUSTOM_PHRASES: dict[str, list[str]] = {
    "Megoodnights":  ["goodnight beautiful", "goonight beautiful"],
    "Hergoodnights": ["goodnight handsome",  "goonight handsome"],
}

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000026FF"
    "\U00002700-\U000027BF"
    "\U0001F1E6-\U0001F1FF"
    "\U00002B00-\U00002BFF"
    "\U0001F000-\U0001F0FF"
    "\u2764\ufe0f?"
    "]+",
    flags=re.UNICODE,
)
WORD_PATTERN   = re.compile(r"[A-Za-z']+")
ELLIPSIS_RE    = re.compile(r"\.\.\.+|…")


# ─────────────────────────────────────────────────────────────────────
# SHARED HELPERS
# ─────────────────────────────────────────────────────────────────────

def _tokenize(body: str) -> list[str]:
    return [w.lower() for w in WORD_PATTERN.findall(body)]


def _count_phrase(body_lower: str, variants: list[str]) -> int:
    return sum(
        len(re.findall(r"\b" + re.escape(v) + r"\b", body_lower))
        for v in variants
    )


def _is_yelling(body: str) -> bool:
    letters = re.sub(r"[^A-Za-z]", "", body)
    return len(letters) >= 4 and letters.isupper()


def _fmt_td(seconds) -> str | None:
    if seconds is None:
        return None
    s   = int(seconds)
    d, r = divmod(s, 86400)
    h, r = divmod(r, 3600)
    m, _ = divmod(r, 60)
    parts = []
    if d: parts.append(f"{d}d")
    if h: parts.append(f"{h}h")
    if m: parts.append(f"{m}m")
    return " ".join(parts) or f"{s}s"


def _msg_preview(body: str, n: int = 120) -> str:
    body = body.replace("\n", " ")
    return (body[:n] + "…") if len(body) > n else body


def _longest_streak(date_set: set) -> int:
    if not date_set:
        return 0
    dates = sorted(date_set)
    best = cur = 1
    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days == 1:
            cur  += 1
            best = max(best, cur)
        else:
            cur = 1
    return best


# ─────────────────────────────────────────────────────────────────────
# INSTAGRAM HTML PARSER
# ─────────────────────────────────────────────────────────────────────

_MSG_BLOCK_RE = re.compile(
    r'<div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder">'
    r'<h2 class="[^"]*">(.*?)</h2>'
    r'<div class="[^"]*">'
    r'<div><div></div><div>(.*?)</div>',
    re.DOTALL,
)
_DATE_RE  = re.compile(r'<div class="_3-94 _a6-o">(.*?)</div>')
_DATE_FMT = "%b %d, %Y %I:%M %p"
_TAG_RE   = re.compile(r"<[^>]+>")


def _strip_tags(s: str) -> str:
    return _TAG_RE.sub("", s).strip()


def parse_instagram_html(path: str, me_name: str, her_name: str) -> list[dict]:
    """Parse one Instagram DM HTML export file.

    Returns list of {'sender': 'Me'|'Her', 'timestamp': datetime, 'body': str}.
    """
    text    = Path(path).read_text(encoding="utf-8", errors="replace")
    me_low  = me_name.lower()
    her_low = her_name.lower()

    messages = []
    parts = re.split(
        r'(?=<div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder">)',
        text,
    )

    for part in parts:
        m = _MSG_BLOCK_RE.search(part)
        if not m:
            continue
        raw_sender = unescape(_strip_tags(m.group(1))).strip()
        raw_body   = unescape(_strip_tags(m.group(2))).strip()
        if not raw_body:
            continue

        d = _DATE_RE.search(part)
        if not d:
            continue
        raw_date = re.sub(r'\b(am|pm)\b', lambda x: x.group().upper(), d.group(1).strip())
        try:
            ts = datetime.strptime(raw_date, _DATE_FMT)
        except ValueError:
            continue

        sender_low = raw_sender.lower()
        if me_low in sender_low:
            sender = "Me"
        elif her_low in sender_low:
            sender = "Her"
        else:
            continue

        messages.append({"sender": sender, "timestamp": ts, "body": raw_body})

    return messages


# ─────────────────────────────────────────────────────────────────────
# INSTAGRAM-ONLY STATS COMPUTATION
# ─────────────────────────────────────────────────────────────────────

def compute_ig_stats(messages: list[dict]) -> dict:
    """Compute raw stats from Instagram messages only.

    Returns a dict with the same shape as stats.json so that
    arithmetic_merge() can consume it field-by-field.

    Counters (top_words, top_emojis, bigrams, trigrams) are returned as
    plain Counter objects here so the merge can combine them before
    calling .most_common().  They are serialised to lists only in the
    final output.
    """
    if not messages:
        return {}

    people = ["Me", "Her"]
    s      = {}

    words_per_msg = [_tokenize(m["body"]) for m in messages]
    char_lens_all = [len(m["body"]) for m in messages]
    word_lens_all = [len(w) for w in words_per_msg]

    by_sender_idx: dict[str, list[int]] = defaultdict(list)
    for i, m in enumerate(messages):
        by_sender_idx[m["sender"]].append(i)

    # ── per-person ────────────────────────────────────────────────────
    per_person: dict[str, dict] = {}
    for p in people:
        idxs = by_sender_idx[p]
        if not idxs:
            per_person[p] = None
            continue

        char_lens = [char_lens_all[i] for i in idxs]
        word_lens = [word_lens_all[i] for i in idxs]
        all_words = [w for i in idxs for w in words_per_msg[i]]

        yell = sum(1 for i in idxs if _is_yelling(messages[i]["body"]))
        ell  = sum(len(ELLIPSIS_RE.findall(messages[i]["body"])) for i in idxs)

        li = max(idxs, key=lambda i: char_lens_all[i])
        si = min(idxs, key=lambda i: char_lens_all[i])

        wc = Counter(w for w in all_words if w not in STOPWORDS)

        bigrams  = Counter()
        trigrams = Counter()
        for i in idxs:
            w = words_per_msg[i]
            bigrams.update(zip(w, w[1:]))
            trigrams.update(zip(w, w[1:], w[2:]))
        bigrams  = Counter({f"{a} {b}": c     for (a, b),    c in bigrams.items()})
        trigrams = Counter({f"{a} {b} {c}": n for (a, b, c), n in trigrams.items()})

        emoji_counts = Counter()
        for i in idxs:
            emoji_counts.update(EMOJI_PATTERN.findall(messages[i]["body"]))

        all_phrases = {**BUILTIN_PHRASES, **CUSTOM_PHRASES}
        phrase_counts = {
            label: sum(_count_phrase(messages[i]["body"].lower(), variants) for i in idxs)
            for label, variants in all_phrases.items()
        }

        pp: dict = {}
        pp["messages_sent"]               = len(idxs)
        pp["words_sent"]                  = sum(word_lens)
        pp["characters_sent"]             = sum(char_lens)
        pp["yelling_messages"]            = yell
        pp["ellipsis_count"]              = ell
        pp["total_emojis"]                = sum(emoji_counts.values())
        pp["average_message_length_chars"]= round(statistics.mean(char_lens), 2)
        pp["average_words_per_message"]   = round(statistics.mean(word_lens), 2)
        pp["longest_message"]  = {
            "text": messages[li]["body"], "length": char_lens_all[li],
            "timestamp": messages[li]["timestamp"].isoformat(),
        }
        pp["shortest_message"] = {
            "text": messages[si]["body"], "length": char_lens_all[si],
            "timestamp": messages[si]["timestamp"].isoformat(),
        }
        # vocabulary: keep as set for now so merge can union later
        pp["_vocab_set"]   = set(all_words) - STOPWORDS
        pp["_top_words_counter"]   = wc
        pp["_top_bigrams_counter"] = bigrams
        pp["_top_trigrams_counter"]= trigrams
        pp["_top_emojis_counter"]  = emoji_counts
        pp["phrase_counts"]        = phrase_counts
        per_person[p] = pp

    s["per_person"] = per_person

    # ── time breakdowns ───────────────────────────────────────────────
    by_hour    = Counter(m["timestamp"].hour              for m in messages)
    by_weekday = Counter(m["timestamp"].strftime("%A")    for m in messages)
    by_month   = Counter(m["timestamp"].strftime("%B")    for m in messages)
    by_year    = Counter(m["timestamp"].year              for m in messages)
    by_ym      = Counter(m["timestamp"].strftime("%Y-%m") for m in messages)
    by_date    = Counter(m["timestamp"].date()            for m in messages)

    s["messages_by_hour"]             = {str(k): v for k, v in by_hour.items()}
    s["messages_by_weekday"]          = dict(by_weekday)
    s["messages_by_month_of_year"]    = dict(by_month)
    s["messages_by_year"]             = {str(k): v for k, v in by_year.items()}
    s["messages_over_time_by_year_month"] = dict(by_ym)

    # ── streak (Instagram-only; conservative — used only if > iMessage) ─
    s["longest_daily_texting_streak_days"] = _longest_streak(set(by_date.keys()))

    # ── best day ──────────────────────────────────────────────────────
    busiest_date, busiest_count = by_date.most_common(1)[0]
    s["most_messages_in_one_day"] = {
        "date":  busiest_date.isoformat(),
        "count": busiest_count,
    }

    # ── conversations / double-text ───────────────────────────────────
    gap_thresh    = timedelta(hours=CONVERSATION_GAP_HOURS)
    starter_counts = Counter()
    conv_starts    = [0]
    for i in range(1, len(messages)):
        if messages[i]["timestamp"] - messages[i - 1]["timestamp"] > gap_thresh:
            conv_starts.append(i)
    for i in conv_starts:
        starter_counts[messages[i]["sender"]] += 1
    s["conversations_started"] = dict(starter_counts)
    s["total_conversations"]   = len(conv_starts)

    double_counts = Counter()
    longest_run   = {p: 0 for p in people}
    i = 0
    while i < len(messages):
        j = i
        while j + 1 < len(messages) and messages[j + 1]["sender"] == messages[i]["sender"]:
            j += 1
        run_len = j - i + 1
        sndr    = messages[i]["sender"]
        if run_len >= MIN_DOUBLE_TEXT_RUN:
            double_counts[sndr] += 1
        if run_len > longest_run[sndr]:
            longest_run[sndr] = run_len
        i = j + 1
    s["double_text_events"]              = dict(double_counts)
    s["longest_consecutive_message_run"] = {p: longest_run[p] for p in people}

    # ── first_to_say (Instagram timestamps for cross-platform update) ─
    all_phrases = {**BUILTIN_PHRASES, **CUSTOM_PHRASES}
    first_ig: dict[str, dict | None] = {}
    for label, variants in all_phrases.items():
        for m in messages:
            if _count_phrase(m["body"].lower(), variants) > 0:
                first_ig[label] = {
                    "sender":    m["sender"],
                    "timestamp": m["timestamp"].isoformat(),
                    "text":      _msg_preview(m["body"]),
                }
                break
        else:
            first_ig[label] = None
    s["first_to_say_ig"] = first_ig

    s["total_messages"] = len(messages)
    return s


# ─────────────────────────────────────────────────────────────────────
# FIELD-BY-FIELD ARITHMETIC MERGE
# ─────────────────────────────────────────────────────────────────────

def _counter_from_list(lst: list) -> Counter:
    """Convert stats.json's [[word, count], …] format back to a Counter."""
    return Counter({item[0]: item[1] for item in (lst or [])})


def _recompute_awards(pp_merged: dict, resp: dict) -> dict:
    """Recompute awards from the merged per-person stats."""
    awards: dict = {}
    people = ["Me", "Her"]

    # Speed texter: keep from response_times (iMessage only)
    for p in people:
        rt = (resp or {}).get(p)
        if rt:
            avg_me  = (resp.get("Me")  or {}).get("average_response_time_seconds")
            avg_her = (resp.get("Her") or {}).get("average_response_time_seconds")
            if avg_me is not None and avg_her is not None:
                w = "Me" if avg_me <= avg_her else "Her"
                awards["speed_texter"] = {
                    "winner": w,
                    "detail": f"Average response time of {_fmt_td(min(avg_me, avg_her))}",
                }
            break

    # Night owl: sum messages_by_hour for midnight–4am across both people
    # We can't split by person from merged by_hour, so reuse per_person data
    # (not available in merged pass); fall through to keeping existing award
    # — mark as TODO below in arithmetic_merge instead.

    # Wall of text
    longest_len = -1
    longest_sender = longest_text = longest_ts = None
    for p in people:
        lm = pp_merged.get(p, {}).get("longest_message") or {}
        if lm.get("length", 0) > longest_len:
            longest_len    = lm["length"]
            longest_sender = p
            longest_text   = lm.get("text", "")
            longest_ts     = lm.get("timestamp")
    if longest_sender:
        awards["wall_of_text"] = {
            "winner": longest_sender,
            "detail": f'{longest_len}-character message: "{_msg_preview(longest_text, 80)}"',
        }

    # Double texter
    runs = {p: (pp_merged.get(p) or {}).get("_longest_run", 0) for p in people}
    w    = max(runs, key=runs.get)
    if runs[w] >= MIN_DOUBLE_TEXT_RUN:
        awards["double_texter"] = {
            "winner": w,
            "detail": f"{runs[w]} messages in a row without a reply",
        }

    # Emoji master
    er = {p: (pp_merged.get(p) or {}).get("emoji_per_message", 0) for p in people}
    w  = max(er, key=er.get)
    awards["emoji_master"] = {
        "winner": w,
        "detail": f"{er[w]} emojis per message on average",
    }

    # Yeller
    yl = {p: (pp_merged.get(p) or {}).get("yelling_messages", 0) for p in people}
    w  = max(yl, key=yl.get)
    awards["yeller"] = {
        "winner": w,
        "detail": f"{yl[w]:,} ALL CAPS messages",
    }

    # Dot dot dot
    el = {p: (pp_merged.get(p) or {}).get("ellipsis_count", 0) for p in people}
    w  = max(el, key=el.get)
    awards["dot_dot_dot"] = {
        "winner": w,
        "detail": f'{el[w]:,} uses of "..."',
    }

    return awards


def arithmetic_merge(im: dict, ig: dict, ig_messages: list[dict]) -> dict:
    """
    Merge Instagram stats (ig) into iMessage stats (im) field-by-field.
    Returns the updated stats dict.  Does NOT mutate im or ig.
    """
    out = json.loads(json.dumps(im))   # deep copy
    people = ["Me", "Her"]

    # ── total_messages ────────────────────────────────────────────────
    out["total_messages"] = im["total_messages"] + ig["total_messages"]
    out["generated_at"]   = datetime.now().isoformat()

    # ── per_person ────────────────────────────────────────────────────
    for p in people:
        ip  = im["per_person"][p]           # iMessage per-person dict
        igp = (ig.get("per_person") or {}).get(p)
        if igp is None:
            # No Instagram messages from this person — nothing changes
            continue

        # Additive counts
        merged_msgs = ip["messages_sent"] + igp["messages_sent"]
        merged_words= ip["words_sent"]    + igp["words_sent"]
        merged_chars= ip["characters_sent"]+ igp["characters_sent"]
        merged_yell = ip["yelling_messages"]+ igp["yelling_messages"]
        merged_ell  = ip["ellipsis_count"]  + igp["ellipsis_count"]
        merged_emoji= ip["total_emojis"]    + igp["total_emojis"]

        out["per_person"][p]["messages_sent"]    = merged_msgs
        out["per_person"][p]["words_sent"]       = merged_words
        out["per_person"][p]["characters_sent"]  = merged_chars
        out["per_person"][p]["yelling_messages"] = merged_yell
        out["per_person"][p]["ellipsis_count"]   = merged_ell
        out["per_person"][p]["total_emojis"]     = merged_emoji

        # Derived ratios (recomputed from merged totals)
        out["per_person"][p]["yelling_ratio"]         = round(merged_yell / merged_msgs, 4)
        out["per_person"][p]["ellipsis_per_message"]  = round(merged_ell  / merged_msgs, 4)
        out["per_person"][p]["emoji_per_message"]     = round(merged_emoji/ merged_msgs, 3)

        # Weighted average lengths
        out["per_person"][p]["average_message_length_chars"] = round(merged_chars / merged_msgs, 2)
        out["per_person"][p]["average_words_per_message"]    = round(merged_words / merged_msgs, 2)
        # Median: can't recompute without raw iMessage data; leave iMessage value
        # (it will drift slightly but is far better than destroying it with synthetic data)

        # Longest / shortest messages: take the better from either platform
        im_long  = ip.get("longest_message")  or {}
        ig_long  = igp.get("longest_message") or {}
        if ig_long.get("length", 0) > im_long.get("length", 0):
            out["per_person"][p]["longest_message"] = ig_long

        im_short = ip.get("shortest_message")  or {}
        ig_short = igp.get("shortest_message") or {}
        if ig_short.get("length", float("inf")) < im_short.get("length", float("inf")):
            out["per_person"][p]["shortest_message"] = ig_short

        # Vocabulary size: union approximation (sum of unique counts minus
        # estimated overlap).  We can't do exact union without raw iMessage
        # words, so we use the sum and note the slight overcount.
        # In practice unique overlap between iMessage & Instagram is small.
        out["per_person"][p]["vocabulary_size"] = (
            ip["vocabulary_size"] + len(igp.get("_vocab_set") or set())
        )

        # Counter merge: top words / bigrams / trigrams / emojis
        im_words  = _counter_from_list(ip.get("top_50_words") or [])
        im_words += (igp.get("_top_words_counter") or Counter())
        out["per_person"][p]["top_50_words"] = im_words.most_common(50)

        im_bi = _counter_from_list(ip.get("top_bigrams") or [])
        im_bi += (igp.get("_top_bigrams_counter") or Counter())
        out["per_person"][p]["top_bigrams"] = im_bi.most_common(20)

        im_tri = _counter_from_list(ip.get("top_trigrams") or [])
        im_tri += (igp.get("_top_trigrams_counter") or Counter())
        out["per_person"][p]["top_trigrams"] = im_tri.most_common(20)

        im_em = _counter_from_list(ip.get("top_emojis") or [])
        im_em += (igp.get("_top_emojis_counter") or Counter())
        out["per_person"][p]["top_emojis"] = im_em.most_common(20)

        # Phrase counts: additive
        for label in (igp.get("phrase_counts") or {}):
            out["per_person"][p]["phrase_counts"][label] = (
                ip["phrase_counts"].get(label, 0) + igp["phrase_counts"][label]
            )

    # ── overall ───────────────────────────────────────────────────────
    # longest / shortest overall: compare with Instagram's
    ig_pp = ig.get("per_person") or {}
    ig_all_msgs = [
        igp.get("longest_message")
        for igp in ig_pp.values()
        if igp and igp.get("longest_message")
    ]
    if ig_all_msgs:
        ig_longest = max(ig_all_msgs, key=lambda m: m.get("length", 0))
        if ig_longest.get("length", 0) > (out["overall"]["longest_message"] or {}).get("length", 0):
            out["overall"]["longest_message"] = ig_longest

    ig_shorts = [
        igp.get("shortest_message")
        for igp in ig_pp.values()
        if igp and igp.get("shortest_message")
    ]
    if ig_shorts:
        ig_shortest = min(ig_shorts, key=lambda m: m.get("length", float("inf")))
        if ig_shortest.get("length", float("inf")) < (out["overall"]["shortest_message"] or {}).get("length", float("inf")):
            out["overall"]["shortest_message"] = ig_shortest

    # overall averages: weighted by message count
    im_total = im["total_messages"]
    ig_total = ig["total_messages"]
    combined = im_total + ig_total
    im_avg_c = im["overall"].get("average_message_length_chars", 0) or 0
    ig_avg_c = sum(
        (igp.get("average_message_length_chars", 0) or 0) * (igp.get("messages_sent", 0) or 0)
        for igp in ig_pp.values() if igp
    ) / ig_total if ig_total else 0
    out["overall"]["average_message_length_chars"] = round(
        (im_avg_c * im_total + ig_avg_c * ig_total) / combined, 2
    )
    im_avg_w = im["overall"].get("average_words_per_message", 0) or 0
    ig_avg_w = sum(
        (igp.get("average_words_per_message", 0) or 0) * (igp.get("messages_sent", 0) or 0)
        for igp in ig_pp.values() if igp
    ) / ig_total if ig_total else 0
    out["overall"]["average_words_per_message"] = round(
        (im_avg_w * im_total + ig_avg_w * ig_total) / combined, 2
    )
    # median_message_length_chars: keep iMessage (can't recompute)

    # ── response_times: KEEP IMESSAGE ENTIRELY ────────────────────────
    # Cross-platform response times are meaningless (different apps,
    # different notification patterns).  iMessage values are preserved
    # as-is.

    # ── time breakdowns: additive ─────────────────────────────────────
    wd_order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    mo_order = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"]

    for hour_key, ig_count in (ig.get("messages_by_hour") or {}).items():
        out["messages_by_hour"][hour_key] = (
            out["messages_by_hour"].get(hour_key, 0) + ig_count
        )
    out["messages_by_hour"] = dict(sorted(out["messages_by_hour"].items(), key=lambda x: int(x[0])))

    for day in wd_order:
        out["messages_by_weekday"][day] = (
            out["messages_by_weekday"].get(day, 0) +
            (ig.get("messages_by_weekday") or {}).get(day, 0)
        )

    for mo in mo_order:
        out["messages_by_month_of_year"][mo] = (
            out["messages_by_month_of_year"].get(mo, 0) +
            (ig.get("messages_by_month_of_year") or {}).get(mo, 0)
        )

    for yr_key, ig_count in (ig.get("messages_by_year") or {}).items():
        out["messages_by_year"][yr_key] = (
            out["messages_by_year"].get(yr_key, 0) + ig_count
        )
    out["messages_by_year"] = dict(sorted(out["messages_by_year"].items()))

    for ym, ig_count in (ig.get("messages_over_time_by_year_month") or {}).items():
        out["messages_over_time_by_year_month"][ym] = (
            out["messages_over_time_by_year_month"].get(ym, 0) + ig_count
        )
    out["messages_over_time_by_year_month"] = dict(
        sorted(out["messages_over_time_by_year_month"].items())
    )

    # ── streak ────────────────────────────────────────────────────────
    # We have real Instagram timestamps, so we know the Instagram-only
    # streak.  We cannot know if Instagram days bridge any iMessage gaps
    # (we don't have raw iMessage per-day data), so we take the
    # conservative maximum.  This is guaranteed correct if the two
    # platforms are used on completely non-overlapping date ranges; it's
    # an undercount if there's overlap that fills iMessage gap days.
    ig_streak = ig.get("longest_daily_texting_streak_days", 0) or 0
    im_streak = out.get("longest_daily_texting_streak_days", 0) or 0
    out["longest_daily_texting_streak_days"] = max(im_streak, ig_streak)

    # ── longest gap ───────────────────────────────────────────────────
    # Instagram messages can only reduce gaps within the IG timeline;
    # they cannot change the longest iMessage gap.  Keep iMessage value.

    # ── most messages in one day ──────────────────────────────────────
    ig_best = ig.get("most_messages_in_one_day") or {}
    im_best = out.get("most_messages_in_one_day") or {}
    # If the best IG day is the same calendar date as the best iMessage day,
    # we add.  Otherwise take the max.
    if ig_best.get("date") == im_best.get("date"):
        out["most_messages_in_one_day"] = {
            "date":  im_best["date"],
            "count": im_best.get("count", 0) + ig_best.get("count", 0),
        }
    elif ig_best.get("count", 0) > im_best.get("count", 0):
        out["most_messages_in_one_day"] = ig_best

    # ── conversations / double-texts ──────────────────────────────────
    for p in people:
        out["conversations_started"][p] = (
            im.get("conversations_started", {}).get(p, 0) +
            (ig.get("conversations_started") or {}).get(p, 0)
        )
    out["total_conversations"] = (
        im.get("total_conversations", 0) +
        (ig.get("total_conversations") or 0)
    )
    for p in people:
        out["double_text_events"][p] = (
            im.get("double_text_events", {}).get(p, 0) +
            (ig.get("double_text_events") or {}).get(p, 0)
        )

    # Longest consecutive run: take max per person
    ig_runs = ig.get("longest_consecutive_message_run") or {}
    im_runs = im.get("longest_consecutive_message_run") or {}
    for p in people:
        ig_run = ig_runs.get(p) or 0
        im_run_info = im_runs.get(p) or {}
        im_run = im_run_info.get("count", 0) if isinstance(im_run_info, dict) else 0
        out["per_person"][p]["_longest_run"] = max(im_run, ig_run)
        # Keep the existing dict if iMessage wins; otherwise replace with IG count
        if ig_run > im_run:
            # Build a minimal info dict — we know the run length but not the
            # exact message texts (not stored for IG in ig_stats)
            ig_run_msgs = [
                m for m in ig_messages if m["sender"] == p
            ]
            # Find the longest consecutive run in IG messages
            best_i = best_j = 0
            best_len = 0
            i = 0
            while i < len(ig_run_msgs):
                j = i
                while j + 1 < len(ig_run_msgs) and ig_run_msgs[j + 1]["sender"] == p:
                    j += 1
                if j - i + 1 > best_len:
                    best_len = j - i + 1
                    best_i, best_j = i, j
                i = j + 1
            if best_len == ig_run:
                out["longest_consecutive_message_run"][p] = {
                    "count": ig_run,
                    "start": ig_run_msgs[best_i]["timestamp"].isoformat(),
                    "end":   ig_run_msgs[best_j]["timestamp"].isoformat(),
                }

    # ── first_to_say: update if IG has an earlier occurrence ─────────
    ig_first = ig.get("first_to_say_ig") or {}
    for label, ig_ev in ig_first.items():
        if ig_ev is None:
            continue
        im_ev = (out.get("first_to_say") or {}).get(label)
        if im_ev is None:
            # iMessage never had this phrase — Instagram wins
            out.setdefault("first_to_say", {})[label] = ig_ev
        else:
            try:
                im_ts = datetime.fromisoformat(im_ev["timestamp"])
                ig_ts = datetime.fromisoformat(ig_ev["timestamp"])
                if ig_ts < im_ts:
                    out["first_to_say"][label] = ig_ev
            except (ValueError, KeyError):
                pass

    # ── milestones: preserve iMessage, add new IG-range milestones ────
    im_count = im["total_messages"]
    ig_msgs_sorted = sorted(ig_messages, key=lambda m: m["timestamp"])
    for n_ms in MILESTONES:
        key = str(n_ms)
        if key in (out.get("milestones") or {}):
            continue  # already set by iMessage — preserve it
        # Does this milestone fall within the Instagram-added range?
        ig_offset = n_ms - im_count
        if 1 <= ig_offset <= len(ig_msgs_sorted):
            m = ig_msgs_sorted[ig_offset - 1]
            out.setdefault("milestones", {})[key] = {
                "sender":    m["sender"],
                "timestamp": m["timestamp"].isoformat(),
                "text":      _msg_preview(m["body"]),
            }

    # ── awards: recompute from merged data ────────────────────────────
    out["awards"] = _recompute_awards(out["per_person"], out.get("response_times"))

    # Preserve night_owl award from iMessage (we can't split by_hour back
    # into per-person for the combined pool without raw iMessage data).
    if "night_owl" not in out["awards"] and "night_owl" in im.get("awards", {}):
        out["awards"]["night_owl"] = im["awards"]["night_owl"]
    elif "night_owl" in im.get("awards", {}):
        # Already have one — keep it (it's the iMessage-based figure,
        # which is still a meaningful lower bound)
        pass

    # Annotation
    out["_note"] = (
        f"Merged: {im['total_messages']:,} iMessages + "
        f"{ig['total_messages']:,} Instagram DMs = "
        f"{out['total_messages']:,} total. "
        f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}."
    )

    return out


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Merge Instagram DM HTML exports into an existing stats.json."
    )
    ap.add_argument("--stats",  required=True,
                    help="Path to your existing stats.json (from texting_recap_analyzer.py)")
    ap.add_argument("--ig", nargs="+", required=True,
                    help="One or more Instagram message HTML files")
    ap.add_argument("--me",  default="Easan Hamkins",
                    help="Your display name in the Instagram export (substring, case-insensitive)")
    ap.add_argument("--her", default="Zoe",
                    help="Her display name in the Instagram export (substring, case-insensitive)")
    ap.add_argument("--out", default="stats_merged.json",
                    help="Output path (default: stats_merged.json)")
    args = ap.parse_args()

    # 1. Load existing iMessage stats
    print(f"Loading iMessage stats from {args.stats} …")
    im_stats = json.loads(Path(args.stats).read_text(encoding="utf-8"))
    print(f"  {im_stats['total_messages']:,} iMessages across "
          f"{len(im_stats.get('per_person', {}))} people")

    # 2. Parse Instagram HTML files
    ig_messages: list[dict] = []
    for html_path in args.ig:
        print(f"Parsing Instagram HTML: {html_path} …")
        batch = parse_instagram_html(html_path, args.me, args.her)
        print(f"  Found {len(batch):,} text messages")
        ig_messages.extend(batch)

    if not ig_messages:
        print("ERROR: No Instagram messages parsed. Check --me / --her name flags.",
              file=sys.stderr)
        sys.exit(1)

    ig_messages.sort(key=lambda m: m["timestamp"])
    print(f"\nInstagram messages: {len(ig_messages):,} total")
    by_sender = Counter(m["sender"] for m in ig_messages)
    for p, n in by_sender.items():
        print(f"  {p}: {n:,}")

    # 3. Compute Instagram-only stats
    print("\nComputing Instagram-only stats …")
    ig_stats = compute_ig_stats(ig_messages)

    # 4. Arithmetic merge
    print("Merging into iMessage stats …")
    merged = arithmetic_merge(im_stats, ig_stats, ig_messages)

    # 5. Write output
    out_path = Path(args.out)
    out_path.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    print(f"\n✅  Merged stats written to {out_path}")
    print(f"   Total messages : {merged['total_messages']:,}")
    for p in ["Me", "Her"]:
        pp = merged["per_person"][p]
        print(f"   {p:4s} sent      : {pp['messages_sent']:,}")
    print(f"   Streak        : {merged['longest_daily_texting_streak_days']} days")
    print(f"   Best day      : {merged['most_messages_in_one_day']['count']:,}"
          f" on {merged['most_messages_in_one_day']['date']}")
    for label, award in (merged.get("awards") or {}).items():
        print(f"   🏆 {label}: {award['winner']} — {award['detail']}")


if __name__ == "__main__":
    main()