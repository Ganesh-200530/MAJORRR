import csv
import statistics
import subprocess
import sys
import time
import uuid
from pathlib import Path

import requests

try:
    import matplotlib.pyplot as plt
except Exception:  # pragma: no cover
    plt = None


ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
BASE_URL = "http://127.0.0.1:8000"
RUNS_PER_ENDPOINT = 5


def wait_for_server(url: str, timeout: float = 45.0) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(url, timeout=2)
            if r.status_code in (200, 404):
                return True
        except requests.RequestException:
            pass
        time.sleep(0.5)
    return False


def timed_request(method: str, url: str, **kwargs):
    t0 = time.perf_counter()
    response = requests.request(method, url, **kwargs)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    return response, elapsed_ms


def percentile(values, p):
    if not values:
        return None
    ordered = sorted(values)
    k = (len(ordered) - 1) * (p / 100)
    f = int(k)
    c = min(f + 1, len(ordered) - 1)
    if f == c:
        return ordered[f]
    return ordered[f] + (ordered[c] - ordered[f]) * (k - f)


def summarize(values):
    return {
        "avg_ms": statistics.mean(values),
        "min_ms": min(values),
        "max_ms": max(values),
        "p95_ms": percentile(values, 95),
        "std_ms": statistics.pstdev(values) if len(values) > 1 else 0.0,
    }


def write_csv(path: Path, rows):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "endpoint",
                "method",
                "runs",
                "avg_ms",
                "min_ms",
                "max_ms",
                "p95_ms",
                "std_ms",
                "status_codes",
                "notes",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def render_chart(path: Path, rows):
    if plt is None:
        print("matplotlib unavailable; skipping chart rendering")
        return

    labels = [r["endpoint"] for r in rows]
    averages = [float(r["avg_ms"]) for r in rows]
    stds = [float(r["std_ms"]) for r in rows]

    plt.figure(figsize=(10, 6))
    bars = plt.bar(labels, averages, yerr=stds, capsize=6, color=["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"][: len(labels)])
    plt.ylabel("Latency (ms)")
    plt.xlabel("Measured Operations")
    plt.title("Performance Evaluation (Measured on Local Setup)")
    plt.grid(axis="y", linestyle="--", alpha=0.4)
    plt.xticks(rotation=15, ha="right")

    for bar, value in zip(bars, averages):
        plt.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 5,
            f"{value:.1f} ms",
            ha="center",
            va="bottom",
            fontsize=9,
        )

    plt.tight_layout()
    plt.savefig(path, dpi=300)
    plt.close()


def benchmark():
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
    ]

    server = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    results = []
    try:
        if not wait_for_server(f"{BASE_URL}/"):
            raise RuntimeError("Backend server did not start within timeout")

        # 1) Health endpoint
        health_times = []
        health_status = []
        for _ in range(RUNS_PER_ENDPOINT):
            resp, ms = timed_request("GET", f"{BASE_URL}/", timeout=20)
            health_times.append(ms)
            health_status.append(resp.status_code)

        s = summarize(health_times)
        results.append(
            {
                "endpoint": "GET /",
                "method": "GET",
                "runs": RUNS_PER_ENDPOINT,
                "avg_ms": f"{s['avg_ms']:.3f}",
                "min_ms": f"{s['min_ms']:.3f}",
                "max_ms": f"{s['max_ms']:.3f}",
                "p95_ms": f"{s['p95_ms']:.3f}",
                "std_ms": f"{s['std_ms']:.3f}",
                "status_codes": ",".join(map(str, sorted(set(health_status)))),
                "notes": "Root endpoint",
            }
        )

        # Unique user for signup/login benchmark
        rand = uuid.uuid4().hex[:8]
        email = f"perf_{rand}@example.com"
        username = f"perf_{rand}"
        password = "PerfTest123!"

        # 2) Signup endpoint
        signup_times = []
        signup_status = []
        for i in range(RUNS_PER_ENDPOINT):
            payload = {
                "username": f"{username}_{i}",
                "email": f"{i}_{email}",
                "password": password,
            }
            resp, ms = timed_request("POST", f"{BASE_URL}/signup", json=payload, timeout=30)
            signup_times.append(ms)
            signup_status.append(resp.status_code)

        s = summarize(signup_times)
        results.append(
            {
                "endpoint": "POST /signup",
                "method": "POST",
                "runs": RUNS_PER_ENDPOINT,
                "avg_ms": f"{s['avg_ms']:.3f}",
                "min_ms": f"{s['min_ms']:.3f}",
                "max_ms": f"{s['max_ms']:.3f}",
                "p95_ms": f"{s['p95_ms']:.3f}",
                "std_ms": f"{s['std_ms']:.3f}",
                "status_codes": ",".join(map(str, sorted(set(signup_status)))),
                "notes": "New account creation",
            }
        )

        # Create one user for repeated login/chat
        base_user = {
            "username": username,
            "email": email,
            "password": password,
        }
        requests.post(f"{BASE_URL}/signup", json=base_user, timeout=30)

        # 3) Login endpoint
        login_times = []
        login_status = []
        token = None
        for _ in range(RUNS_PER_ENDPOINT):
            data = {"username": email, "password": password}
            resp, ms = timed_request("POST", f"{BASE_URL}/token", data=data, timeout=30)
            login_times.append(ms)
            login_status.append(resp.status_code)
            if resp.status_code == 200:
                token = resp.json().get("access_token")

        s = summarize(login_times)
        results.append(
            {
                "endpoint": "POST /token",
                "method": "POST",
                "runs": RUNS_PER_ENDPOINT,
                "avg_ms": f"{s['avg_ms']:.3f}",
                "min_ms": f"{s['min_ms']:.3f}",
                "max_ms": f"{s['max_ms']:.3f}",
                "p95_ms": f"{s['p95_ms']:.3f}",
                "std_ms": f"{s['std_ms']:.3f}",
                "status_codes": ",".join(map(str, sorted(set(login_status)))),
                "notes": "OAuth2 token issue",
            }
        )

        # 4) Chat endpoint (if token available)
        if token:
            chat_times = []
            chat_status = []
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            for i in range(RUNS_PER_ENDPOINT):
                payload = {
                    "session_id": f"perf-session-{rand}",
                    "message": f"This is performance run {i+1}. Please reply briefly.",
                    "language": "English",
                }
                resp, ms = timed_request("POST", f"{BASE_URL}/chat", json=payload, headers=headers, timeout=90)
                chat_times.append(ms)
                chat_status.append(resp.status_code)

            s = summarize(chat_times)
            results.append(
                {
                    "endpoint": "POST /chat",
                    "method": "POST",
                    "runs": RUNS_PER_ENDPOINT,
                    "avg_ms": f"{s['avg_ms']:.3f}",
                    "min_ms": f"{s['min_ms']:.3f}",
                    "max_ms": f"{s['max_ms']:.3f}",
                    "p95_ms": f"{s['p95_ms']:.3f}",
                    "std_ms": f"{s['std_ms']:.3f}",
                    "status_codes": ",".join(map(str, sorted(set(chat_status)))),
                    "notes": "Includes model + TTS path as configured",
                }
            )

        csv_path = ROOT_DIR / "performance_benchmark_results.csv"
        img_path = ROOT_DIR / "performance_evaluation_genuine.png"
        write_csv(csv_path, results)
        render_chart(img_path, results)

        print(f"Benchmark complete. CSV: {csv_path}")
        print(f"Chart: {img_path}")

        for row in results:
            print(row)

    finally:
        server.terminate()
        try:
            server.wait(timeout=8)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    benchmark()
