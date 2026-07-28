#!/usr/bin/env python3
"""
Texting Recap Analyzer
=======================
Parses an SMS Backup & Restore XML export, isolates your conversation with
one contact, and produces:
  - stats.json      -> every stat listed in the spec below
  - charts/*.png     -> a set of static charts

USAGE
-----
    python3 texting_recap_analyzer.py backup.xml --contact "Jane Doe" --out output

    --contact can be a contact name (as stored by the phone) OR a phone
    number / fragment of one. Matching is case-insensitive and phone
    numbers are compared using digits only, so "+1 (555) 123-4567",
    "5551234567", and "555-123-4567" are treated as equivalent.

If your export only ever contained the one conversation, you can omit
--contact entirely.

CUSTOMIZE
---------
Edit CUSTOM_PHRASES near the top of this file to track any additional
words/phrases you care about (nicknames, inside jokes, etc). Each entry
maps a friendly label -> list of regex-escaped literal phrases to match
(case-insensitive, whole-word-ish).
"""

import argparse
import json
import os
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from html import unescape

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ----------------------------------------------------------------------
# CONFIG - tweak these
# ----------------------------------------------------------------------

ME_LABEL = "Me"
HER_LABEL = "Her"

# New "conversation" starts if the gap since the previous message exceeds this
CONVERSATION_GAP_HOURS = 4

# A "double text" = 2+ consecutive messages from the same person with no
# reply in between
MIN_DOUBLE_TEXT_RUN = 2

# Milestone message numbers to capture (1-indexed, across the whole thread)
MILESTONES = [1, 100, 1000, 5000, 10000, 100000]

# Words to ignore when computing "top words" / vocabulary-style stats
STOPWORDS = set("""
a an the and or but if is are was were be been being to of in on at for
with as by from about into like through after over between out against
during without before under around among i you he she it we they me him
her us them my your his its our their this that these those am im
youre hes shes were theyre ive youve weve theyve do does did doing have
has had having will would shall should can could may might must not no
nor so than then there here when where why how all any both each few
more most other some such only own same just don dont u ur ya ok okay
yeah yea yep nah lol lmao omg im'a gonna wanna gotta what t s get want yes i'm re Il also it's i'll ll
""".split())

# Extra phrases you want counted per-person, beyond the built-in ones below.
# format: "label": [list of literal phrases/variants, case-insensitive]
CUSTOM_PHRASES: dict[str, list[str]] = {
    "Megoodnights": ["goodnight beautiful", "Goonight Beautiful", "Goodnight beautiful"],
    "Hergoodnights": ["goodnight handsome", "Goonight Handsome", "Goodnight handsome"],

    # "our song": ["perfect", "thinking out loud"],
}

# Built-in phrase trackers (always computed)
BUILTIN_PHRASES = {
    "i love you": ["i love you", "ily", "ilysm", "i luv u"],
    "sorry": ["sorry", "my bad", "i apologize", "apologies"],
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

WORD_PATTERN = re.compile(r"[A-Za-z']+")

def is_yelling(body):
    """A message counts as 'yelling' if it has at least 4 letters and
    every letter in it is uppercase (ignoring punctuation/emoji/numbers)."""
    letters = re.sub(r"[^A-Za-z]", "", body)
    return len(letters) >= 4 and letters.isupper()


ELLIPSIS_PATTERN = re.compile(r"\.\.\.+|…")

def emoji_label(e):
    """matplotlib can't render color/bitmap emoji fonts, so for chart axis
    labels we use a readable name instead (e.g. 'RED HEART'). The raw
    emoji glyphs are still preserved as-is in stats.json for use on the
    actual webpage, where the browser will render them fine."""
    import unicodedata
    names = []
    for ch in e:
        if ch == "\ufe0f":  # variation selector, skip
            continue
        try:
            names.append(unicodedata.name(ch))
        except ValueError:
            names.append(ch)
    label = " + ".join(names) if names else e
    return label[:28]


# ----------------------------------------------------------------------
# PARSING
# ----------------------------------------------------------------------

def normalize_number(s):
    """Keep only digits, drop a leading country code '1' if present so
    numbers compare equal regardless of formatting."""
    digits = re.sub(r"\D", "", s or "")
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits


def matches_contact(address, contact_name_attr, contact_filter):
    if not contact_filter:
        return True
    cf_lower = contact_filter.lower()
    if contact_name_attr and cf_lower in contact_name_attr.lower():
        return True
    cf_digits = normalize_number(contact_filter)
    if cf_digits and cf_digits == normalize_number(address):
        return True
    return False


def parse_conversation(xml_path, contact_filter=None):
    """Returns a time-sorted list of {'sender', 'timestamp', 'body'} dicts."""
    import xml.etree.ElementTree as ET

    tree = ET.parse(xml_path)
    root = tree.getroot()
    messages = []

    for sms in root.findall("sms"):
        address = sms.get("address", "")
        contact_name = sms.get("contact_name", "")
        if not matches_contact(address, contact_name, contact_filter):
            continue
        body = unescape(sms.get("body") or "").strip()
        if not body:
            continue
        date_ms = sms.get("date")
        if not date_ms:
            continue
        ts = datetime.fromtimestamp(int(date_ms) / 1000)
        msg_type = sms.get("type")  # '1' received, '2' sent
        sender = ME_LABEL if msg_type == "2" else HER_LABEL
        messages.append({"sender": sender, "timestamp": ts, "body": body})

    for mms in root.findall("mms"):
        address = mms.get("address", "")
        contact_name = mms.get("contact_name", "")
        if not matches_contact(address, contact_name, contact_filter):
            continue
        date_ms = mms.get("date")
        if not date_ms:
            continue
        ts = datetime.fromtimestamp(int(date_ms) / 1000)
        msg_box = mms.get("msg_box")  # '1' received, '2' sent
        sender = ME_LABEL if msg_box == "2" else HER_LABEL

        body_parts = []
        parts_el = mms.find("parts")
        if parts_el is not None:
            for part in parts_el.findall("part"):
                ct = part.get("ct", "")
                if ct.startswith("text/plain"):
                    t = part.get("text")
                    if t:
                        body_parts.append(unescape(t))
        body = " ".join(bp.strip() for bp in body_parts if bp.strip())
        if not body:
            continue
        messages.append({"sender": sender, "timestamp": ts, "body": body})

    messages.sort(key=lambda m: m["timestamp"])
    return messages


# Matches a row's Type/Date/Name-Number columns. Non-greedy but anchored to
# fixed literal delimiters near the start of the line, so it stays fast even
# when the row's Content column (later in the line) is huge (e.g. a base64
# embedded image) - the regex never needs to scan into that part.
HTML_ROW_PREFIX_RE = re.compile(
    r"^<tr><td>(.*?)</td><td>(.*?)</td><td>(.*?)</td><td class='dont-break-out'>"
)
HTML_IMG_TAG_RE = re.compile(r"<img[^>]*>")
HTML_BR_TAG_RE = re.compile(r"<br\s*/?>")


def parse_conversation_html(html_path, contact_filter=None):
    """Parses the SMS Backup & Restore 'HTML' export format: one <table>
    with a row per message, columns Type / Date / Name (Number) / Content.
    This format is normally exported per-conversation already, but
    --contact still works as an extra filter/safety check."""
    messages = []
    skipped_unparsed_date = 0

    with open(html_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line.startswith("<tr><td>"):
                continue  # header row, closing tags, etc.

            m = HTML_ROW_PREFIX_RE.match(line)
            if not m:
                continue

            type_str = m.group(1).strip()
            date_str = m.group(2).strip()
            name_str = m.group(3).strip()

            if contact_filter:
                cf_lower = contact_filter.lower()
                if cf_lower not in name_str.lower() and normalize_number(contact_filter) not in normalize_number(name_str):
                    continue

            content = line[m.end():]
            if content.endswith("</td></tr>"):
                content = content[: -len("</td></tr>")]
            elif content.endswith("</tr>"):
                content = content[: -len("</tr>")]

            text = HTML_IMG_TAG_RE.sub("", content)
            text = HTML_BR_TAG_RE.sub(" ", text)
            text = unescape(text).strip()
            if not text:
                continue  # media-only message (photo/video/etc), nothing to analyze

            try:
                ts = datetime.strptime(date_str, "%b %d, %Y %I:%M:%S %p")
            except ValueError:
                skipped_unparsed_date += 1
                continue

            sender = ME_LABEL if type_str.startswith("Sent") else HER_LABEL
            messages.append({"sender": sender, "timestamp": ts, "body": text})

    if skipped_unparsed_date:
        print(f"  (skipped {skipped_unparsed_date} rows with an unrecognized date format)")

    messages.sort(key=lambda m: m["timestamp"])
    return messages


def detect_format(path):
    with open(path, "rb") as f:
        head = f.read(2000).decode("utf-8", errors="replace").lower()
    if "<smses" in head:
        return "xml"
    if "<html" in head:
        return "html"
    # fall back to extension
    return "xml" if path.lower().endswith(".xml") else "html"


# ----------------------------------------------------------------------
# HELPERS
# ----------------------------------------------------------------------

def tokenize(body):
    return [w.lower() for w in WORD_PATTERN.findall(body)]


def count_phrase(body_lower, variants):
    return sum(len(re.findall(r"\b" + re.escape(v) + r"\b", body_lower)) for v in variants)


def longest_streak_of_dates(date_set):
    """Given a set of date objects, return the length of the longest run
    of consecutive calendar days."""
    if not date_set:
        return 0
    dates = sorted(date_set)
    best = cur = 1
    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days == 1:
            cur += 1
            best = max(best, cur)
        else:
            cur = 1
    return best


def fmt_td(seconds):
    """Human readable duration."""
    if seconds is None:
        return None
    seconds = int(seconds)
    d, rem = divmod(seconds, 86400)
    h, rem = divmod(rem, 3600)
    m, s = divmod(rem, 60)
    parts = []
    if d:
        parts.append(f"{d}d")
    if h:
        parts.append(f"{h}h")
    if m:
        parts.append(f"{m}m")
    if not parts:
        parts.append(f"{s}s")
    return " ".join(parts)


def msg_preview(m, n=120):
    body = m["body"].replace("\n", " ")
    return (body[:n] + "…") if len(body) > n else body


# ----------------------------------------------------------------------
# STATS
# ----------------------------------------------------------------------

def compute_stats(messages):
    if not messages:
        raise ValueError("No messages found. Check your --contact filter.")

    people = [ME_LABEL, HER_LABEL]
    stats = {"generated_at": datetime.now().isoformat(), "total_messages": len(messages)}

    # ---- per-message derived data ----
    words_per_msg = [tokenize(m["body"]) for m in messages]
    lengths_chars = [len(m["body"]) for m in messages]
    lengths_words = [len(w) for w in words_per_msg]

    by_sender_idx = defaultdict(list)
    for i, m in enumerate(messages):
        by_sender_idx[m["sender"]].append(i)

    # ---- basic counts ----
    per_person = {p: {} for p in people}
    for p in people:
        idxs = by_sender_idx[p]
        yelling_count = sum(1 for i in idxs if is_yelling(messages[i]["body"]))
        per_person[p]["yelling_messages"] = yelling_count
        per_person[p]["yelling_ratio"] = round(yelling_count / len(idxs), 4) if idxs else 0
        ellipsis_count = sum(len(ELLIPSIS_PATTERN.findall(messages[i]["body"])) for i in idxs)
        per_person[p]["ellipsis_count"] = ellipsis_count
        per_person[p]["ellipsis_per_message"] = round(ellipsis_count / len(idxs), 4) if idxs else 0
        char_lens = [lengths_chars[i] for i in idxs]
        word_lens = [lengths_words[i] for i in idxs]
        all_words = [w for i in idxs for w in words_per_msg[i]]
        per_person[p]["messages_sent"] = len(idxs)
        per_person[p]["words_sent"] = sum(word_lens)
        per_person[p]["characters_sent"] = sum(char_lens)
        per_person[p]["average_message_length_chars"] = round(statistics.mean(char_lens), 2) if char_lens else 0
        per_person[p]["median_message_length_chars"] = statistics.median(char_lens) if char_lens else 0
        per_person[p]["average_words_per_message"] = round(statistics.mean(word_lens), 2) if word_lens else 0
        if idxs:
            longest_i = max(idxs, key=lambda i: lengths_chars[i])
            shortest_i = min(idxs, key=lambda i: lengths_chars[i])
            per_person[p]["longest_message"] = {
                "text": messages[longest_i]["body"],
                "length": lengths_chars[longest_i],
                "timestamp": messages[longest_i]["timestamp"].isoformat(),
            }
            per_person[p]["shortest_message"] = {
                "text": messages[shortest_i]["body"],
                "length": lengths_chars[shortest_i],
                "timestamp": messages[shortest_i]["timestamp"].isoformat(),
            }
        vocab = set(all_words) - STOPWORDS
        per_person[p]["vocabulary_size"] = len(vocab)
        word_counts = Counter(w for w in all_words if w not in STOPWORDS)
        per_person[p]["top_50_words"] = word_counts.most_common(50)

        bigrams = Counter()
        trigrams = Counter()
        for i in idxs:
            w = words_per_msg[i]
            bigrams.update(zip(w, w[1:]))
            trigrams.update(zip(w, w[1:], w[2:]))
        per_person[p]["top_bigrams"] = [(f"{a} {b}", c) for (a, b), c in bigrams.most_common(20)]
        per_person[p]["top_trigrams"] = [(f"{a} {b} {c}", n) for (a, b, c), n in trigrams.most_common(20)]

        emoji_counts = Counter()
        for i in idxs:
            emoji_counts.update(EMOJI_PATTERN.findall(messages[i]["body"]))
        per_person[p]["top_emojis"] = emoji_counts.most_common(20)
        per_person[p]["total_emojis"] = sum(emoji_counts.values())
        per_person[p]["emoji_per_message"] = round(
            per_person[p]["total_emojis"] / len(idxs), 3
        ) if idxs else 0

        # phrase counters
        phrase_hits = {}
        all_phrases = {**BUILTIN_PHRASES, **CUSTOM_PHRASES}
        for label, variants in all_phrases.items():
            phrase_hits[label] = sum(
                count_phrase(messages[i]["body"].lower(), variants) for i in idxs
            )
        per_person[p]["phrase_counts"] = phrase_hits

    stats["per_person"] = per_person

    # ---- overall length stats ----
    stats["overall"] = {
        "average_message_length_chars": round(statistics.mean(lengths_chars), 2),
        "median_message_length_chars": statistics.median(lengths_chars),
        "average_words_per_message": round(statistics.mean(lengths_words), 2),
    }
    longest_i = max(range(len(messages)), key=lambda i: lengths_chars[i])
    shortest_i = min(range(len(messages)), key=lambda i: lengths_chars[i])
    stats["overall"]["longest_message"] = {
        "sender": messages[longest_i]["sender"],
        "text": messages[longest_i]["body"],
        "length": lengths_chars[longest_i],
        "timestamp": messages[longest_i]["timestamp"].isoformat(),
    }
    stats["overall"]["shortest_message"] = {
        "sender": messages[shortest_i]["sender"],
        "text": messages[shortest_i]["body"],
        "length": lengths_chars[shortest_i],
        "timestamp": messages[shortest_i]["timestamp"].isoformat(),
    }

    # ---- response times ----
    response_times = defaultdict(list)  # sender -> list of seconds (time THEY took to respond)
    for i in range(1, len(messages)):
        prev, cur = messages[i - 1], messages[i]
        if cur["sender"] != prev["sender"]:
            gap = (cur["timestamp"] - prev["timestamp"]).total_seconds()
            response_times[cur["sender"]].append(gap)

    resp_stats = {}
    for p in people:
        rts = response_times[p]
        if rts:
            resp_stats[p] = {
                "average_response_time_seconds": round(statistics.mean(rts), 1),
                "average_response_time_human": fmt_td(statistics.mean(rts)),
                "median_response_time_seconds": round(statistics.median(rts), 1),
                "median_response_time_human": fmt_td(statistics.median(rts)),
                "fastest_response_seconds": round(min(rts), 1),
                "fastest_response_human": fmt_td(min(rts)),
                "slowest_response_seconds": round(max(rts), 1),
                "slowest_response_human": fmt_td(max(rts)),
            }
        else:
            resp_stats[p] = None
    stats["response_times"] = resp_stats

    # ---- time-based breakdowns ----
    by_hour = Counter(m["timestamp"].hour for m in messages)
    by_weekday = Counter(m["timestamp"].strftime("%A") for m in messages)
    by_month_of_year = Counter(m["timestamp"].strftime("%B") for m in messages)
    by_year = Counter(m["timestamp"].year for m in messages)
    by_year_month = Counter(m["timestamp"].strftime("%Y-%m") for m in messages)
    by_date = Counter(m["timestamp"].date() for m in messages)

    stats["messages_by_hour"] = dict(sorted(by_hour.items()))
    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    stats["messages_by_weekday"] = {d: by_weekday.get(d, 0) for d in weekday_order}
    month_order = ["January", "February", "March", "April", "May", "June", "July",
                   "August", "September", "October", "November", "December"]
    stats["messages_by_month_of_year"] = {mo: by_month_of_year.get(mo, 0) for mo in month_order}
    stats["messages_by_year"] = dict(sorted(by_year.items()))
    stats["messages_over_time_by_year_month"] = dict(sorted(by_year_month.items()))

    # ---- streaks / gaps ----
    date_set = set(by_date.keys())
    stats["longest_daily_texting_streak_days"] = longest_streak_of_dates(date_set)

    max_gap = timedelta(0)
    max_gap_start = max_gap_end = None
    for i in range(1, len(messages)):
        gap = messages[i]["timestamp"] - messages[i - 1]["timestamp"]
        if gap > max_gap:
            max_gap = gap
            max_gap_start = messages[i - 1]["timestamp"]
            max_gap_end = messages[i]["timestamp"]
    stats["longest_gap_without_texting"] = {
        "duration_human": fmt_td(max_gap.total_seconds()),
        "duration_seconds": max_gap.total_seconds(),
        "start": max_gap_start.isoformat() if max_gap_start else None,
        "end": max_gap_end.isoformat() if max_gap_end else None,
    }

    busiest_date, busiest_count = by_date.most_common(1)[0]
    stats["most_messages_in_one_day"] = {
        "date": busiest_date.isoformat(),
        "count": busiest_count,
    }

    # ---- conversation starters ----
    gap_threshold = timedelta(hours=CONVERSATION_GAP_HOURS)
    starter_counts = Counter()
    conv_start_indices = [0]
    for i in range(1, len(messages)):
        if messages[i]["timestamp"] - messages[i - 1]["timestamp"] > gap_threshold:
            conv_start_indices.append(i)
    for i in conv_start_indices:
        starter_counts[messages[i]["sender"]] += 1
    stats["conversations_started"] = dict(starter_counts)
    stats["total_conversations"] = len(conv_start_indices)

    # ---- double texting ----
    double_text_counts = Counter()
    longest_run = {ME_LABEL: 0, HER_LABEL: 0}
    longest_run_info = {ME_LABEL: None, HER_LABEL: None}
    i = 0
    while i < len(messages):
        j = i
        while j + 1 < len(messages) and messages[j + 1]["sender"] == messages[i]["sender"]:
            j += 1
        run_len = j - i + 1
        sender = messages[i]["sender"]
        if run_len >= MIN_DOUBLE_TEXT_RUN:
            double_text_counts[sender] += 1
        if run_len > longest_run[sender]:
            longest_run[sender] = run_len
            longest_run_info[sender] = {
                "count": run_len,
                "start": messages[i]["timestamp"].isoformat(),
                "end": messages[j]["timestamp"].isoformat(),
            }
        i = j + 1
    stats["double_text_events"] = dict(double_text_counts)
    stats["longest_consecutive_message_run"] = longest_run_info

    # ---- who says it first ----
    first_occurrence = {}
    all_phrases = {**BUILTIN_PHRASES, **CUSTOM_PHRASES}
    for label, variants in all_phrases.items():
        for m in messages:
            if count_phrase(m["body"].lower(), variants) > 0:
                first_occurrence[label] = {
                    "sender": m["sender"],
                    "timestamp": m["timestamp"].isoformat(),
                    "text": msg_preview(m),
                }
                break
        else:
            first_occurrence[label] = None
    stats["first_to_say"] = first_occurrence

    # ---- milestones ----
    milestones = {}
    for n in MILESTONES:
        if n <= len(messages):
            m = messages[n - 1]
            milestones[str(n)] = {
                "sender": m["sender"],
                "timestamp": m["timestamp"].isoformat(),
                "text": msg_preview(m),
            }
        else:
            milestones[str(n)] = None
    stats["milestones"] = milestones

    # ---- fun awards ----
    awards = {}

    # Speed Texter: lower average response time (need >=5 responses to qualify)
    candidates = {p: resp_stats[p]["average_response_time_seconds"]
                  for p in people if resp_stats[p] and len(response_times[p]) >= 5}
    if candidates:
        winner = min(candidates, key=candidates.get)
        awards["speed_texter"] = {
            "winner": winner,
            "detail": f"Average response time of {fmt_td(candidates[winner])}",
        }

    # Night Owl: most messages sent 12am-4am
    night_counts = Counter()
    for m in messages:
        if 0 <= m["timestamp"].hour < 4:
            night_counts[m["sender"]] += 1
    if night_counts:
        winner = night_counts.most_common(1)[0][0]
        awards["night_owl"] = {
            "winner": winner,
            "detail": f"{night_counts[winner]} messages sent between midnight and 4am",
        }

    # Wall of Text: longest single message
    awards["wall_of_text"] = {
        "winner": messages[longest_i]["sender"],
        "detail": f'{lengths_chars[longest_i]}-character message: "{msg_preview(messages[longest_i], 80)}"',
    }

    # Double Texter: longest consecutive run of messages from one person
    dt_winner = max(longest_run, key=lambda p: longest_run[p])
    if longest_run[dt_winner] >= MIN_DOUBLE_TEXT_RUN:
        awards["double_texter"] = {
            "winner": dt_winner,
            "detail": f"{longest_run[dt_winner]} messages in a row without a reply",
        }

    # Emoji Master: highest emoji-per-message ratio
    emoji_ratios = {p: per_person[p]["emoji_per_message"] for p in people}
    if any(emoji_ratios.values()):
        winner = max(emoji_ratios, key=emoji_ratios.get)
        awards["emoji_master"] = {
            "winner": winner,
            "detail": f"{emoji_ratios[winner]} emojis per message on average",
        }

    # Yeller: most ALL CAPS messages
    yelling_counts = {p: per_person[p]["yelling_messages"] for p in people}
    if any(yelling_counts.values()):
        winner = max(yelling_counts, key=yelling_counts.get)
        awards["yeller"] = {
            "winner": winner,
            "detail": f"{yelling_counts[winner]} ALL CAPS messages",
        }

    # Dot Dot Dot: heaviest ellipsis user
    ellipsis_counts = {p: per_person[p]["ellipsis_count"] for p in people}
    if any(ellipsis_counts.values()):
        winner = max(ellipsis_counts, key=ellipsis_counts.get)
        awards["dot_dot_dot"] = {
            "winner": winner,
            "detail": f'{ellipsis_counts[winner]} uses of "..."',
        }

    stats["awards"] = awards

    return stats


# ----------------------------------------------------------------------
# CHARTS
# ----------------------------------------------------------------------

COLORS = {ME_LABEL: "#4F8EF7", HER_LABEL: "#F76FA0"}


def _save(fig, out_dir, name):
    path = os.path.join(out_dir, f"{name}.png")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    print(f"  wrote {path}")


def make_charts(stats, messages, out_dir):
    charts_dir = os.path.join(out_dir, "charts")
    os.makedirs(charts_dir, exist_ok=True)
    people = [ME_LABEL, HER_LABEL]

    # 1. Messages sent share (pie)
    fig, ax = plt.subplots(figsize=(5, 5))
    sizes = [stats["per_person"][p]["messages_sent"] for p in people]
    ax.pie(sizes, labels=people, autopct="%1.1f%%", colors=[COLORS[p] for p in people],
           startangle=90, wedgeprops={"edgecolor": "white"})
    ax.set_title("Share of Messages Sent")
    _save(fig, charts_dir, "messages_sent_share")

    # 2. Messages by hour
    fig, ax = plt.subplots(figsize=(9, 4))
    hours = list(range(24))
    counts = [stats["messages_by_hour"].get(h, 0) for h in hours]
    ax.bar(hours, counts, color="#4F8EF7")
    ax.set_xlabel("Hour of day")
    ax.set_ylabel("Messages")
    ax.set_title("Messages by Hour")
    ax.set_xticks(hours)
    _save(fig, charts_dir, "messages_by_hour")

    # 3. Messages by weekday
    fig, ax = plt.subplots(figsize=(7, 4))
    days = list(stats["messages_by_weekday"].keys())
    counts = list(stats["messages_by_weekday"].values())
    ax.bar([d[:3] for d in days], counts, color="#F76FA0")
    ax.set_ylabel("Messages")
    ax.set_title("Messages by Day of Week")
    _save(fig, charts_dir, "messages_by_weekday")

    # 4. Messages by month of year
    fig, ax = plt.subplots(figsize=(9, 4))
    months = list(stats["messages_by_month_of_year"].keys())
    counts = list(stats["messages_by_month_of_year"].values())
    ax.bar([mo[:3] for mo in months], counts, color="#8E6FF7")
    ax.set_ylabel("Messages")
    ax.set_title("Messages by Month (all years combined)")
    _save(fig, charts_dir, "messages_by_month_of_year")

    # 6. Timeline (year-month)
    fig, ax = plt.subplots(figsize=(11, 4))
    ym = list(stats["messages_over_time_by_year_month"].keys())
    counts = list(stats["messages_over_time_by_year_month"].values())
    ax.plot(ym, counts, color="#4F8EF7", marker="o", markersize=3)
    ax.set_ylabel("Messages")
    ax.set_title("Texting Volume Over Time")
    step = max(1, len(ym) // 15)
    ax.set_xticks(ym[::step])
    ax.set_xticklabels(ym[::step], rotation=45, ha="right")
    _save(fig, charts_dir, "messages_over_time")

    # 8. Her top words
    her_words = Counter()
    her_words.update(dict(stats["per_person"][people[1]]["top_50_words"]))
    top20 = her_words.most_common(20)
    if top20:
        fig, ax = plt.subplots(figsize=(7, 8))
        words, counts = zip(*reversed(top20))
        ax.barh(words, counts, color="#4F8EF7")
        ax.set_title("Her Top 20 Words")
        _save(fig, charts_dir, "her_top_words")

    # 9. My top words
        my_words = Counter()
        my_words.update(dict(stats["per_person"][people[0]]["top_50_words"]))
        top20 = my_words.most_common(20)
        if top20:
            fig, ax = plt.subplots(figsize=(7, 8))
            words, counts = zip(*reversed(top20))
            ax.barh(words, counts, color="#4F8EF7")
            ax.set_title("My Top 20 Words")
            _save(fig, charts_dir, "my_top_words")

    # 9. Her top emojis 
    her_emojis = Counter()
    her_emojis.update(dict(stats["per_person"][people[1]]["top_emojis"]))
    top_emoji = her_emojis.most_common(15)
    if top_emoji:
        fig, ax = plt.subplots(figsize=(7, 5))
        emojis, counts = zip(*reversed(top_emoji))
        labels = [emoji_label(e) for e in emojis]
        ax.barh(range(len(emojis)), counts, color="#F7C24F")
        ax.set_yticks(range(len(emojis)))
        ax.set_yticklabels(labels, fontsize=9)
        ax.set_title("Top Emojis (combined)\n(see stats.json for the actual emoji glyphs)")
        _save(fig, charts_dir, "her_top_emojis")

    # 9. My top emojis 
        my_emojis = Counter()
        my_emojis.update(dict(stats["per_person"][people[0]]["top_emojis"]))
        top_emoji = my_emojis.most_common(15)
        if top_emoji:
            fig, ax = plt.subplots(figsize=(7, 5))
            emojis, counts = zip(*reversed(top_emoji))
            labels = [emoji_label(e) for e in emojis]
            ax.barh(range(len(emojis)), counts, color="#F7C24F")
            ax.set_yticks(range(len(emojis)))
            ax.set_yticklabels(labels, fontsize=9)
            ax.set_title("Top Emojis (combined)\n(see stats.json for the actual emoji glyphs)")
            _save(fig, charts_dir, "my_top_emojis")

    # 11. Her Top trigrams (combined)
    her_trigrams = Counter()
    her_trigrams.update(dict(stats["per_person"][people[1]]["top_trigrams"]))
    top_tg = her_trigrams.most_common(15)
    if top_tg:
        fig, ax = plt.subplots(figsize=(7, 6))
        labels, counts = zip(*reversed(top_tg))
        ax.barh(labels, counts, color="#B76FF7")
        ax.set_title("Top Trigrams (combined)")
        _save(fig, charts_dir, "her_top_trigrams")

    # 11. My Top trigrams (combined)
        my_trigrams = Counter()
        my_trigrams.update(dict(stats["per_person"][people[0]]["top_trigrams"]))
        top_tg = my_trigrams.most_common(15)
        if top_tg:
            fig, ax = plt.subplots(figsize=(7, 6))
            labels, counts = zip(*reversed(top_tg))
            ax.barh(labels, counts, color="#B76FF7")
            ax.set_title("Top Trigrams (combined)")
            _save(fig, charts_dir, "my_top_trigrams")


# ----------------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Analyze a texting history for a recap page.")
    parser.add_argument("export_path", help="Path to the SMS Backup & Restore .xml or .html export")
    parser.add_argument("--contact", default=None,
                         help="Contact name or phone number to filter to (omit if the export has only one thread)")
    parser.add_argument("--out", default="output", help="Output directory (default: ./output)")
    parser.add_argument("--format", choices=["xml", "html"], default=None,
                         help="Force the export format instead of auto-detecting from the file")
    args = parser.parse_args()

    fmt = args.format or detect_format(args.export_path)
    print(f"Parsing {args.export_path} (detected format: {fmt}) ...")
    if fmt == "xml":
        messages = parse_conversation(args.export_path, contact_filter=args.contact)
    else:
        messages = parse_conversation_html(args.export_path, contact_filter=args.contact)
    print(f"Found {len(messages)} messages.")

    if not messages:
        print("No messages matched. Double check --contact, or the XML structure.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.out, exist_ok=True)

    print("Computing stats ...")
    stats = compute_stats(messages)

    stats_path = os.path.join(args.out, "stats.json")
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print(f"  wrote {stats_path}")

    print("Making charts ...")
    make_charts(stats, messages, args.out)

    print("\nDone! A few highlights:")
    print(f"  Total messages: {stats['total_messages']}")
    for p in [ME_LABEL, HER_LABEL]:
        print(f"  {p}: {stats['per_person'][p]['messages_sent']} messages")
    for label, award in stats.get("awards", {}).items():
        print(f"  🏆 {label}: {award['winner']} - {award['detail']}")


if __name__ == "__main__":
    main()
