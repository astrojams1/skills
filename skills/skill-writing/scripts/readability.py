#!/usr/bin/env python3
"""Grade how easy a SKILL.md is to read: Flesch-Kincaid grade of its prose, plus words and long sentences.

Usage: python3 readability.py FILE... [--max-grade 8]
Code blocks, inline code, links, tables, headings and frontmatter are left out, since they are not prose.
"""
import re
import sys


def prose(text):
    text = re.sub(r"\A---\n.*?\n---\n", "", text, flags=re.S)
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    lines = [l for l in text.splitlines() if not l.lstrip().startswith(("|", "#", ">"))]
    text = "\n".join(lines)
    text = re.sub(r"`[^`]*`", "it", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"https?://\S+", "link", text)
    text = re.sub(r"[*_]", "", text)
    return text


def syllables(word):
    word = word.lower()
    groups = re.findall(r"[aeiouy]+", word)
    n = len(groups)
    if word.endswith("e") and not word.endswith(("le", "ee")) and n > 1:
        n -= 1
    return max(1, n)


def score(text):
    text = prose(text)
    sentences = [s for s in re.split(r"(?<=[.!?])\s+|\n\s*[-*\d]+[.)]?\s+|\n\n", text) if re.search(r"[A-Za-z]", s)]
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", text)
    if not words or not sentences:
        return None
    syl = sum(syllables(w) for w in words)
    grade = 0.39 * len(words) / len(sentences) + 11.8 * syl / len(words) - 15.59
    long = sum(1 for s in sentences if len(re.findall(r"[A-Za-z]+", s)) > 25)
    return round(grade, 1), len(words), round(len(words) / len(sentences), 1), long


def main(argv):
    max_grade = None
    if "--max-grade" in argv:
        i = argv.index("--max-grade")
        max_grade = float(argv[i + 1])
        argv = argv[:i] + argv[i + 2:]
    failed = False
    print(f"{'grade':>5} {'words':>6} {'w/sent':>6} {'long':>4}  file")
    for path in argv:
        with open(path, encoding="utf-8") as f:
            s = score(f.read())
        if s is None:
            continue
        grade, words, avg, long = s
        flag = ""
        if max_grade is not None and grade > max_grade:
            flag, failed = "  over", True
        print(f"{grade:>5} {words:>6} {avg:>6} {long:>4}  {path}{flag}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
