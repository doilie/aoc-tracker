# Advent of Code Leaderboard Tracker

This is a React project to visualize private leaderboards from Advent of Code.

## Running the Project

Make sure you have [Node.js](https://nodejs.org/en/) installed (v16+ recommended).

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```
   By default, this will start the app at [`http://localhost:5173`](http://localhost:5173) (or another available port). The terminal will print the full local URL.

3. **Build for production (optional):**
   ```bash
   npm run build
   ```
   This generates a `dist` folder you can serve with any static server.

---

## Refreshing Leaderboard Data

To update the leaderboard JSON data (2015–2024), run the `download_leaderboards.py` script.  
This script fetches new data from Advent of Code and saves it to `leaderboard-app/public/data`.

### Prerequisites

- Python 3.6+
- [`requests`](https://pypi.org/project/requests/) library:
  ```bash
  pip install requests
  ```

### How to Get Your Advent of Code Session Cookie

Your Advent of Code session cookie is used by the script to download private leaderboard data. Here is how to obtain it:

1. Open [https://adventofcode.com/](https://adventofcode.com/) and log in.
2. Open your browser’s developer tools:
   - **Chrome/Edge**: Press `F12` or right-click → Inspect.
   - **Firefox**: Press `F12` or right-click → Inspect Element.
3. Go to the **Application** (Chrome/Edge) or **Storage** (Firefox) tab.
4. Look for **Cookies** in the sidebar and select `https://adventofcode.com`.
5. Find the cookie named `session`. Double-click the value to copy it.
6. **Keep your session cookie private!** Do not share it; it grants access to your Advent of Code account.

### How to Provide Your Advent of Code Session

The script needs your Advent of Code session cookie to access the private leaderboard API.  
You can provide it in **one** of three ways (priority as follows):

1. **Command Line Argument**
   ```bash
   python download_leaderboards.py <your_session_cookie>
   ```

2. **Environment Variable**
   Set an environment variable named `AOC_SESSION`:
   - On **Windows (CMD):**
     ```cmd
     set AOC_SESSION=your_session_cookie
     python download_leaderboards.py
     ```
   - On **macOS/Linux/Windows (PowerShell):**
     ```bash
     export AOC_SESSION=your_session_cookie
     python download_leaderboards.py
     ```

3. **Config File**
   Create an `aoc_leaderboard_config.json` file in the project root with the contents:
   ```json
   {
     "session": "your_session_cookie"
   }
   ```
   Then run:
   ```bash
   python download_leaderboards.py
   ```

- If neither a command line argument, env variable, nor config file are found, the script will exit with an error.

### Where Data Is Stored

Downloaded files are saved as JSON in:
```
leaderboard-app/public/data/
```
One file is created per year, named like `2015.json`, `2016.json`, etc.

---

## Example Workflow

1. **Update leaderboard data (fetch latest):**
   ```bash
   # Using environment variable
   export AOC_SESSION=your_session_cookie
   python download_leaderboards.py
   ```

2. **Start the React app in a separate terminal:**
   ```bash
   cd leaderboard-app
   npm install
   npm run dev
   ```

Open the URL (shown in the terminal) in your browser to view updated results.

---

## Notes

- The script will attempt to download leaderboards for every year from 2015 to 2024.
- If you wish to automate regular data updates, simply run the script as above on a schedule.
