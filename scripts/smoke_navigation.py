#!/usr/bin/env python3
"""
Dogfood Verdaxis dashboard navigation timing against a production build or live host.

Auth is intentionally explicit. Provide either:
  VERDAXIS_SMOKE_TOKEN=<access token>
or:
  VERDAXIS_SMOKE_EMAIL=<email> VERDAXIS_SMOKE_PASSWORD=<password>

Examples:
  npm run build:prod
  VERDAXIS_SMOKE_EMAIL=... VERDAXIS_SMOKE_PASSWORD=... npm run smoke:navigation -- --target local
  VERDAXIS_SMOKE_TOKEN=... npm run smoke:navigation -- --target staging
"""

from __future__ import annotations

import argparse
import contextlib
import json
import os
import statistics
import subprocess
import sys
import threading
import time
import urllib.parse
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUTPUT_DIR = ROOT / "dogfood"

TARGETS = {
    "local": {
        "app": None,
        "api": "https://api.verdaxis.exchange/api",
    },
    "prod": {
        "app": "https://app.verdaxis.exchange",
        "api": "https://api.verdaxis.exchange/api",
    },
    "staging": {
        "app": "https://staging.verdaxis.exchange",
        "api": "https://api-staging.verdaxis.exchange/api",
    },
}

PAGES = ["MAP", "MARKETPLACE", "TERMINAL"]
TRANSITIONS = [
    ("MAP", "MARKETPLACE"),
    ("MARKETPLACE", "TERMINAL"),
    ("TERMINAL", "MAP"),
    ("MAP", "TERMINAL"),
    ("TERMINAL", "MARKETPLACE"),
    ("MARKETPLACE", "MAP"),
]


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, directory: str | None = None, **kwargs: Any) -> None:
        super().__init__(*args, directory=directory or str(DIST), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def send_head(self):  # type: ignore[override]
        path = self.translate_path(self.path)
        if not os.path.exists(path) and "." not in Path(urllib.parse.urlparse(self.path).path).name:
            self.path = "/index.html"
        return super().send_head()


@contextlib.contextmanager
def static_server(port: int):
    if not (DIST / "index.html").exists():
        raise RuntimeError("dist/index.html is missing. Run npm run build:prod first.")

    server = ThreadingHTTPServer(("127.0.0.1", port), lambda *args, **kwargs: SpaHandler(*args, **kwargs))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        thread.join(timeout=5)


def get_auth_config() -> dict[str, str]:
    email = os.environ.get("VERDAXIS_SMOKE_EMAIL")
    password = os.environ.get("VERDAXIS_SMOKE_PASSWORD")
    if email and password:
        return {"mode": "credentials", "email": email, "password": password}

    token = os.environ.get("VERDAXIS_SMOKE_TOKEN")
    if token:
        return {"mode": "token", "token": token}

    raise RuntimeError(
        "Missing auth. Set VERDAXIS_SMOKE_EMAIL and VERDAXIS_SMOKE_PASSWORD, or VERDAXIS_SMOKE_TOKEN."
    )


def percentile(values: list[float], quantile: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    ordered = sorted(values)
    index = (len(ordered) - 1) * quantile
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    weight = index - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def classify_cause(resources: list[dict[str, Any]], long_task_ms: float) -> str:
    if long_task_ms >= 100:
        return "render_cpu_or_map_chart_init"

    api_duration = max((r["duration"] for r in resources if "/api/" in r["name"]), default=0)
    chunk_duration = max((r["duration"] for r in resources if r["name"].endswith(".js")), default=0)

    if chunk_duration >= 150 and chunk_duration >= api_duration:
        return "chunk_wait"
    if api_duration >= 150:
        return "api_wait"
    return "render_layout_or_state"


def navigation_init_script() -> str:
    return """
      window.__VERDAXIS_LONG_TASKS__ = [];
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__VERDAXIS_LONG_TASKS__.push({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration,
            });
          }
        }).observe({ entryTypes: ['longtask'] });
      } catch (error) {
        window.__VERDAXIS_LONG_TASKS_UNAVAILABLE__ = true;
      }
    """


def page_url(base_url: str, token: str) -> str:
    return f"{base_url}/app?token={urllib.parse.quote(token)}"


def authenticate_page(page, base_url: str, auth: dict[str, str]) -> None:
    if auth["mode"] == "token":
        page.goto(page_url(base_url, auth["token"]), wait_until="domcontentloaded", timeout=45000)
        return

    page.goto(f"{base_url}/login", wait_until="domcontentloaded", timeout=45000)
    page.locator("input[name='email'], input[type='email']").fill(auth["email"])
    page.locator("input[name='password'], input[type='password']").fill(auth["password"])
    page.locator("button[type='submit']").click()
    page.wait_for_url("**/app", timeout=45000)


def click_nav(page, page_name: str, viewport: dict[str, int]) -> None:
    if viewport["width"] < 768:
        page.locator("[data-tour='mobile-menu']").click()
        page.wait_for_timeout(150)
    page.locator(f"[data-tour='nav-{page_name}']").click()


def readiness_selectors(page_name: str) -> list[str]:
    selectors = [f"main[data-dashboard-page='{page_name}']"]
    if page_name == "MAP":
        selectors.append("main[data-dashboard-page='MAP'] [data-navigation-ready='MAP']")
    elif page_name == "MARKETPLACE":
        selectors.append("main[data-dashboard-page='MARKETPLACE'] [data-navigation-ready='MARKETPLACE']")
    elif page_name == "TERMINAL":
        selectors.append("main[data-dashboard-page='TERMINAL'] [data-navigation-ready='TERMINAL']")
        selectors.append("main[data-dashboard-page='TERMINAL'] [data-navigation-ready='FORWARD_CURVE']")
    return selectors


def wait_for_usable(page, page_name: str) -> None:
    for selector in readiness_selectors(page_name):
        page.wait_for_selector(selector, timeout=30000)


def run_transition(page, from_page: str, to_page: str, viewport: dict[str, int]) -> dict[str, Any]:
    if from_page != page.locator("main[data-dashboard-page]").get_attribute("data-dashboard-page"):
        click_nav(page, from_page, viewport)
        wait_for_usable(page, from_page)
        page.wait_for_timeout(300)

    page.evaluate("window.__VERDAXIS_NAV_METRICS__ = []; performance.clearResourceTimings();")
    started_at = page.evaluate("performance.now()")
    click_nav(page, to_page, viewport)
    wait_for_usable(page, to_page)
    page.wait_for_function(
        """(toPage) => {
          const metrics = window.__VERDAXIS_NAV_METRICS__ || [];
          return metrics.some((metric) => metric.toPage === toPage);
        }""",
        arg=to_page,
        timeout=30000,
    )
    page.wait_for_timeout(250)

    completed_at = page.evaluate("performance.now()")
    payload = page.evaluate(
        """({ startedAt, toPage }) => {
          const metrics = window.__VERDAXIS_NAV_METRICS__ || [];
          const metric = [...metrics].reverse().find((item) => item.toPage === toPage);
          const resources = performance.getEntriesByType('resource')
            .filter((entry) => entry.startTime >= startedAt)
            .map((entry) => ({
              name: entry.name,
              initiatorType: entry.initiatorType,
              startTime: entry.startTime,
              duration: entry.duration,
              transferSize: entry.transferSize || 0,
            }));
          const completedAt = performance.now();
          const longTasks = (window.__VERDAXIS_LONG_TASKS__ || [])
            .filter((entry) => entry.startTime >= startedAt && entry.startTime <= completedAt + 250);
          const maxLongTaskMs = longTasks.reduce((max, entry) => Math.max(max, entry.duration), 0);
          return { metric, resources, maxLongTaskMs, longTaskCount: longTasks.length };
        }""",
        {"startedAt": started_at, "toPage": to_page},
    )

    metric = payload["metric"]
    if not metric:
        raise RuntimeError(f"Navigation metric missing for {from_page} -> {to_page}")

    return {
        "from": from_page,
        "to": to_page,
        "durationMs": round(float(completed_at - started_at), 1),
        "routeCommitMs": round(float(metric["durationMs"]), 1),
        "maxLongTaskMs": round(float(payload["maxLongTaskMs"]), 1),
        "longTaskCount": int(payload["longTaskCount"]),
        "suspectedCause": classify_cause(payload["resources"], float(payload["maxLongTaskMs"])),
        "resourceCount": len(payload["resources"]),
        "slowResources": sorted(
            [
                {
                    "name": resource["name"],
                    "duration": round(float(resource["duration"]), 1),
                    "initiatorType": resource["initiatorType"],
                }
                for resource in payload["resources"]
                if float(resource["duration"]) >= 100
            ],
            key=lambda item: item["duration"],
            reverse=True,
        )[:5],
    }


def prepare_page(browser, base_url: str, auth: dict[str, str], viewport: dict[str, int]):
    context = browser.new_context(viewport=viewport)
    page = context.new_page()
    page.add_init_script(navigation_init_script())
    authenticate_page(page, base_url, auth)
    try:
        page.wait_for_selector("main[data-dashboard-page]", timeout=45000)
        current_page = page.locator("main[data-dashboard-page]").get_attribute("data-dashboard-page") or "DASHBOARD"
        wait_for_usable(page, current_page)
    except Exception as exc:
        with contextlib.suppress(Exception):
            current_url = page.url
            title = page.title()
            body_text = page.locator("body").inner_text(timeout=1000)[:500].replace("\n", " ")
            print(
                f"Dashboard marker not found. url={current_url!r} title={title!r} body={body_text!r}",
                file=sys.stderr,
            )
        raise exc
    return context, page


def summarize(label: str, samples: list[dict[str, Any]]) -> dict[str, Any]:
    durations = [sample["durationMs"] for sample in samples]
    long_tasks = [sample["maxLongTaskMs"] for sample in samples]
    return {
        "label": label,
        "count": len(samples),
        "p50Ms": round(statistics.median(durations), 1) if durations else 0,
        "p95Ms": round(percentile(durations, 0.95), 1),
        "maxMs": round(max(durations), 1) if durations else 0,
        "maxLongTaskMs": round(max(long_tasks), 1) if long_tasks else 0,
        "suspectedCauses": sorted(set(sample["suspectedCause"] for sample in samples)),
    }


def write_outputs(result: dict[str, Any]) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = OUTPUT_DIR / f"navigation-smoke-{timestamp}.json"
    md_path = OUTPUT_DIR / f"navigation-smoke-{timestamp}.md"
    json_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Navigation Smoke",
        "",
        f"- Target: `{result['target']}`",
        f"- App URL: `{result['appUrl']}`",
        f"- Timestamp: `{result['timestamp']}`",
        "",
        "## Summary",
        "",
        "| Case | Count | p50 | p95 | Max | Max long task | Suspected causes |",
        "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for summary in result["summaries"]:
        lines.append(
            f"| {summary['label']} | {summary['count']} | {summary['p50Ms']}ms | {summary['p95Ms']}ms | "
            f"{summary['maxMs']}ms | {summary['maxLongTaskMs']}ms | {', '.join(summary['suspectedCauses'])} |"
        )

    lines.extend(["", "## Transitions", ""])
    for sample in result["samples"]:
        lines.append(
            f"- `{sample['case']}` `{sample['viewport']}` {sample['from']} -> {sample['to']}: "
            f"{sample['durationMs']}ms usable, {sample['routeCommitMs']}ms route commit, "
            f"long task {sample['maxLongTaskMs']}ms, cause `{sample['suspectedCause']}`"
        )
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return json_path, md_path


def run(args: argparse.Namespace) -> int:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError("Python Playwright is not installed. Run `npm run smoke:navigation:setup`.") from exc

    target = TARGETS[args.target]
    auth = get_auth_config()
    samples: list[dict[str, Any]] = []
    viewports = {
        "desktop": {"width": 1440, "height": 1000},
        "mobile": {"width": 390, "height": 844},
    }

    with contextlib.ExitStack() as stack:
        if args.target == "local":
            app_url = stack.enter_context(static_server(args.port))
        else:
            app_url = target["app"]

        assert app_url
        with sync_playwright() as playwright:
            browser_args = ["--disable-web-security"] if args.target == "local" else []
            browser = playwright.chromium.launch(headless=True, args=browser_args)
            try:
                for viewport_name, viewport in viewports.items():
                    for from_page, to_page in TRANSITIONS:
                        context, page = prepare_page(browser, app_url, auth, viewport)
                        try:
                            sample = run_transition(page, from_page, to_page, viewport)
                            sample.update({"case": "cold", "viewport": viewport_name})
                            samples.append(sample)
                        finally:
                            context.close()

                    context, page = prepare_page(browser, app_url, auth, viewport)
                    try:
                        click_nav(page, "MAP", viewport)
                        wait_for_usable(page, "MAP")
                        page.wait_for_timeout(500)
                        for _ in range(args.warm_repeats):
                            for from_page, to_page in TRANSITIONS:
                                sample = run_transition(page, from_page, to_page, viewport)
                                sample.update({"case": "warm", "viewport": viewport_name})
                                samples.append(sample)
                    finally:
                        context.close()
            finally:
                browser.close()

    result = {
        "target": args.target,
        "appUrl": app_url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "budgets": {
            "warmP95Ms": args.warm_budget_ms,
            "coldP95Ms": args.cold_budget_ms,
            "maxLongTaskMs": args.long_task_budget_ms,
        },
        "summaries": [
            summarize(f"{case}/{viewport}", [
                sample for sample in samples if sample["case"] == case and sample["viewport"] == viewport
            ])
            for case in ["cold", "warm"]
            for viewport in viewports
        ],
        "samples": samples,
    }

    json_path, md_path = write_outputs(result)
    print(f"Wrote {json_path.relative_to(ROOT)}")
    print(f"Wrote {md_path.relative_to(ROOT)}")

    failures = []
    for summary in result["summaries"]:
        budget = args.cold_budget_ms if summary["label"].startswith("cold/") else args.warm_budget_ms
        if summary["p95Ms"] > budget:
            failures.append(f"{summary['label']} p95 {summary['p95Ms']}ms > {budget}ms")
        if summary["maxLongTaskMs"] > args.long_task_budget_ms:
            failures.append(
                f"{summary['label']} max long task {summary['maxLongTaskMs']}ms > {args.long_task_budget_ms}ms"
            )

    if failures:
        print("Navigation smoke budget failures:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Measure Verdaxis dashboard navigation timing.")
    parser.add_argument("--target", choices=TARGETS.keys(), default="local")
    parser.add_argument("--port", type=int, default=4174)
    parser.add_argument("--warm-repeats", type=int, default=3)
    parser.add_argument("--warm-budget-ms", type=int, default=700)
    parser.add_argument("--cold-budget-ms", type=int, default=1800)
    parser.add_argument("--long-task-budget-ms", type=int, default=250)
    args = parser.parse_args()

    try:
        return run(args)
    except subprocess.CalledProcessError as exc:
        print(exc, file=sys.stderr)
        return exc.returncode or 1
    except Exception as exc:
        print(f"Navigation smoke failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
