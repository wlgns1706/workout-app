"""프로그램 파일 여러 개를 한 파일로 묶는다. 앱에서 한 번 가져오면 모두 들어간다.

사용법:
  python tools/bundle_programs.py <출력 경로> <프로그램 파일> [<프로그램 파일> ...]
"""
import json
import sys

out, *paths = sys.argv[1:]
programs = [json.load(open(p, encoding="utf-8")) for p in paths]
assert programs and all(p.get("type") == "workout-program" for p in programs), "프로그램 파일만 묶을 수 있다"
with open(out, "w", encoding="utf-8") as f:
    json.dump({"type": "workout-programs", "formatVersion": 1, "programs": programs}, f, ensure_ascii=False)
print("저장:", out, "-", ", ".join(p["name"] for p in programs))
