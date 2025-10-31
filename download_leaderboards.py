import os
import sys
import json
import requests

DATA_DIR = "leaderboard-app/public/data"
CONFIG_FILE = "aoc_leaderboard_config.json"

def get_session():
    # Priority: command argument > env var > config file
    if len(sys.argv) > 1:
        return sys.argv[1]
    session_env = os.getenv("AOC_SESSION")
    if session_env:
        return session_env
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            cfg = json.load(f)
            return cfg.get("session")
    print("Error: AOC session not found. Provide as arg, env var, or config file.")
    sys.exit(1)

def fetch_and_save(year, session):
    url = f"https://adventofcode.com/{year}/leaderboard/private/view/3158126.json"
    headers = {"Cookie": f"session={session}"}
    try:
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
            path = os.path.join(DATA_DIR, f"{year}.json")
            with open(path, "w", encoding="utf-8") as f:
                f.write(resp.text)
            print(f"Saved data for {year} to {path}")
        else:
            print(f"Failed for {year}: HTTP {resp.status_code} - {resp.reason}")
    except Exception as e:
        print(f"Error fetching {year}: {e}")

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    session = get_session()
    for year in range(2015, 2026):
        fetch_and_save(year, session)

if __name__ == "__main__":
    main()
