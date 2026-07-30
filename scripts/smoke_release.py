#!/usr/bin/env python3
"""Rendered production release smoke with rollback-safe failure classes."""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

SUCCESS = "success"
FRONTEND_CRITICAL = "frontend_critical"
DEPENDENCY_FAILURE = "dependency_failure"
TRANSIENT = "transient"
EXIT_CODES = {
    SUCCESS: 0,
    FRONTEND_CRITICAL: 10,
    DEPENDENCY_FAILURE: 20,
    TRANSIENT: 30,
}
MAINTENANCE_TEXT = (
    "temporarily under maintenance",
    "system is under maintenance",
)
LOCAL_API_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
MAX_FINDINGS = 10


class _EntryAssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "script":
            return
        source = dict(attrs).get("src")
        if source and Path(urlsplit(source).path).name.startswith("index-") and source.endswith(".js"):
            self.assets.append(source)


def normalize_base_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Frontend URL must be an HTTPS origin")
    if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
        raise ValueError("Frontend URL must not include a path, query, or fragment")
    return urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))


def extract_index_asset(html: str) -> str:
    parser = _EntryAssetParser()
    parser.feed(html)
    if len(parser.assets) != 1:
        raise ValueError(f"Expected one hashed index asset, found {len(parser.assets)}")
    return parser.assets[0]


def classify_failures(
    *,
    frontend: list[str],
    dependency: list[str],
    transient: list[str],
    api_healthy: bool | None,
) -> str:
    if dependency or api_healthy is False:
        return DEPENDENCY_FAILURE
    if transient:
        return TRANSIENT
    if frontend:
        return FRONTEND_CRITICAL
    return SUCCESS


def frontend_http_failure_class(status: int) -> str:
    return DEPENDENCY_FAILURE if status >= 500 else FRONTEND_CRITICAL


def is_ignorable_request_failure(failure: str) -> bool:
    return any(marker in failure for marker in ("ERR_ABORTED", "NS_BINDING_ABORTED"))


def _bounded(message: Any) -> str:
    return " ".join(str(message).split())[:240]


def _add(findings: list[str], message: Any) -> None:
    bounded = _bounded(message)
    if bounded and bounded not in findings and len(findings) < MAX_FINDINGS:
        findings.append(bounded)


def _safe_url(value: str) -> str:
    parsed = urlsplit(value)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


def _api_readiness_url(expected_api_url: str) -> str:
    parsed = urlsplit(expected_api_url)
    return urlunsplit((parsed.scheme, parsed.netloc, "/health/ready", "", ""))


def check_api_readiness(
    expected_api_url: str,
    dependency: list[str],
    transient: list[str],
) -> bool | None:
    request = Request(
        _api_readiness_url(expected_api_url),
        headers={"Accept": "application/json", "User-Agent": "VerdaxisReleaseSmoke/1"},
    )
    try:
        with urlopen(request, timeout=15) as response:
            if response.status != 200:
                _add(dependency, f"API readiness returned HTTP {response.status}")
                return False
            payload = json.load(response)
    except HTTPError as error:
        _add(dependency, f"API readiness returned HTTP {error.code}")
        return False
    except (TimeoutError, socket.timeout, URLError) as error:
        _add(transient, f"API readiness transport failed: {type(error).__name__}")
        return None
    except (json.JSONDecodeError, ValueError, TypeError):
        _add(dependency, "API readiness returned invalid JSON")
        return False

    healthy = (
        payload.get("status") == "ok"
        and payload.get("db") == "ok"
        and payload.get("environment") == "production"
        and isinstance(payload.get("release_sha"), str)
        and len(payload["release_sha"]) == 40
    )
    if not healthy:
        _add(dependency, "API readiness payload did not satisfy the production contract")
    return healthy


def run_browser_checks(
    *,
    base_url: str,
    expected_api_url: str,
    expected_index_asset: str | None,
    screenshot: Path | None,
    frontend: list[str],
    dependency: list[str],
    transient: list[str],
) -> str | None:
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ImportError:
        _add(transient, "Playwright is not installed")
        return None

    base_host = urlsplit(base_url).hostname
    expected_api_host = urlsplit(expected_api_url).hostname
    observed_api_requests: list[str] = []
    entry_asset: str | None = None
    page = None

    try:
        with sync_playwright() as playwright:
            launch_options: dict[str, Any] = {"headless": True}
            executable_path = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
            if executable_path:
                launch_options["executable_path"] = executable_path
            browser = playwright.chromium.launch(**launch_options)
            context = browser.new_context(
                service_workers="block",
                viewport={"width": 1440, "height": 1000},
            )

            bypass = os.environ.get("VERCEL_PROTECTION_BYPASS", "").strip()
            bypass_headers = (
                {
                    "x-vercel-protection-bypass": bypass,
                    "x-vercel-set-bypass-cookie": "true",
                }
                if bypass
                else {}
            )
            response = context.request.get(base_url, headers=bypass_headers, timeout=30_000)
            if not response.ok:
                target = (
                    dependency
                    if frontend_http_failure_class(response.status) == DEPENDENCY_FAILURE
                    else frontend
                )
                _add(target, f"Frontend document returned HTTP {response.status}")
                browser.close()
                return None

            html = response.text()
            try:
                entry_asset = extract_index_asset(html)
            except ValueError as error:
                _add(frontend, error)
                browser.close()
                return None

            if expected_index_asset and Path(urlsplit(entry_asset).path).name != Path(expected_index_asset).name:
                _add(
                    frontend,
                    f"Entry asset mismatch: expected {Path(expected_index_asset).name}, got {Path(entry_asset).name}",
                )

            asset_response = context.request.get(urljoin(base_url, entry_asset), timeout=30_000)
            if not asset_response.ok:
                target = (
                    dependency
                    if frontend_http_failure_class(asset_response.status) == DEPENDENCY_FAILURE
                    else frontend
                )
                _add(target, f"Entry asset returned HTTP {asset_response.status}")
            else:
                bundle = asset_response.text()
                if expected_api_url not in bundle:
                    _add(frontend, "Entry asset is missing the production API target")
                if "api-staging.verdaxis.exchange" in bundle:
                    _add(frontend, "Entry asset contains the staging API target")
                for local_host in LOCAL_API_HOSTS:
                    if f"//{local_host}" in bundle:
                        _add(frontend, f"Entry asset contains local API host {local_host}")

            page = context.new_page()

            def on_request(request: Any) -> None:
                parsed = urlsplit(request.url)
                if parsed.hostname == expected_api_host and parsed.path.startswith("/api/"):
                    observed_api_requests.append(_safe_url(request.url))
                if parsed.hostname in LOCAL_API_HOSTS:
                    _add(frontend, f"Browser requested local host at {_safe_url(request.url)}")

            def on_response(browser_response: Any) -> None:
                request = browser_response.request
                parsed = urlsplit(browser_response.url)
                if (
                    parsed.hostname == base_host
                    and request.resource_type in {"document", "script", "stylesheet"}
                    and browser_response.status >= 400
                ):
                    target = (
                        dependency
                        if frontend_http_failure_class(browser_response.status) == DEPENDENCY_FAILURE
                        else frontend
                    )
                    _add(
                        target,
                        f"{request.resource_type} returned HTTP {browser_response.status} at {_safe_url(browser_response.url)}",
                    )
                if parsed.hostname == expected_api_host and browser_response.status >= 500:
                    _add(
                        dependency,
                        f"API request returned HTTP {browser_response.status} at {_safe_url(browser_response.url)}",
                    )

            def on_request_failed(request: Any) -> None:
                parsed = urlsplit(request.url)
                failure = request.failure or "request failed"
                if is_ignorable_request_failure(failure):
                    return
                if parsed.hostname == expected_api_host:
                    _add(dependency, f"API browser request failed: {_safe_url(request.url)} ({failure})")
                elif request.resource_type in {"document", "script", "stylesheet"}:
                    _add(transient, f"{request.resource_type} transport failed: {_safe_url(request.url)}")

            page.on("request", on_request)
            page.on("response", on_response)
            page.on("requestfailed", on_request_failed)
            page.on("pageerror", lambda error: _add(frontend, f"Browser startup exception: {error}"))

            login_timed_out = False
            try:
                page.goto(f"{base_url}/login?lang=en", wait_until="domcontentloaded", timeout=30_000)
                page.locator("input[type=email]").wait_for(state="visible", timeout=20_000)
                page.locator("input[type=password]").wait_for(state="visible", timeout=20_000)
                page.locator("button[type=submit]").wait_for(state="visible", timeout=20_000)
                page.wait_for_timeout(1_500)
            except PlaywrightTimeoutError:
                login_timed_out = True

            body_text = page.locator("body").inner_text(timeout=5_000).lower()
            maintenance_rendered = any(text in body_text for text in MAINTENANCE_TEXT)
            if maintenance_rendered:
                _add(frontend, "Login rendered the maintenance page")
            elif login_timed_out:
                _add(transient, "Login page navigation or required control timed out")
            if not observed_api_requests:
                _add(frontend, "Browser made no request to the production API")

            try:
                page.goto(f"{base_url}/en/pilot", wait_until="domcontentloaded", timeout=30_000)
                page.wait_for_function(
                    "() => (document.querySelector('#root')?.textContent?.trim().length || 0) > 50",
                    timeout=20_000,
                )
                page.wait_for_timeout(1_500)
            except PlaywrightTimeoutError:
                _add(transient, "Public deep link did not render in time")

            if screenshot:
                screenshot.parent.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(screenshot), full_page=False)

            browser.close()
    except PlaywrightError as error:
        _add(transient, f"Browser infrastructure failed: {type(error).__name__}")
    except Exception as error:  # noqa: BLE001 - unexpected harness faults are never rollback signals
        _add(transient, f"Release smoke crashed: {type(error).__name__}")

    return entry_asset


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--expected-api-url", required=True)
    parser.add_argument("--expected-index-asset")
    parser.add_argument("--output", type=Path, default=Path("release-smoke.json"))
    parser.add_argument("--screenshot", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    frontend: list[str] = []
    dependency: list[str] = []
    transient: list[str] = []

    try:
        base_url = normalize_base_url(args.base_url)
        expected_api_url = normalize_base_url(args.expected_api_url.removesuffix("/api")) + "/api"
    except ValueError as error:
        print(f"release smoke configuration error: {error}", file=sys.stderr)
        return EXIT_CODES[FRONTEND_CRITICAL]

    api_healthy = check_api_readiness(expected_api_url, dependency, transient)
    entry_asset = run_browser_checks(
        base_url=base_url,
        expected_api_url=expected_api_url,
        expected_index_asset=args.expected_index_asset,
        screenshot=args.screenshot,
        frontend=frontend,
        dependency=dependency,
        transient=transient,
    )
    classification = classify_failures(
        frontend=frontend,
        dependency=dependency,
        transient=transient,
        api_healthy=api_healthy,
    )
    report = {
        "classification": classification,
        "exit_code": EXIT_CODES[classification],
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "expected_api_url": expected_api_url,
        "entry_asset": Path(urlsplit(entry_asset).path).name if entry_asset else None,
        "api_ready": api_healthy,
        "failures": {
            FRONTEND_CRITICAL: frontend,
            DEPENDENCY_FAILURE: dependency,
            TRANSIENT: transient,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, separators=(",", ":")))
    return EXIT_CODES[classification]


if __name__ == "__main__":
    raise SystemExit(main())
