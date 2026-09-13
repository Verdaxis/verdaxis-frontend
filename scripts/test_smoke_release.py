#!/usr/bin/env python3

import unittest

from smoke_release import (
    DEPENDENCY_FAILURE,
    FRONTEND_CRITICAL,
    SUCCESS,
    TRANSIENT,
    classify_failures,
    check_public_metadata_documents,
    extract_index_asset,
    frontend_http_failure_class,
    is_ignorable_request_failure,
    normalize_base_url,
    public_metadata_failures,
    PUBLIC_METADATA_EXPECTATIONS,
)


class ReleaseSmokeHelpersTest(unittest.TestCase):
    def test_normalizes_https_frontend_url(self):
        self.assertEqual(
            normalize_base_url("https://canary.verdaxis.exchange/"),
            "https://canary.verdaxis.exchange",
        )
        with self.assertRaises(ValueError):
            normalize_base_url("http://canary.verdaxis.exchange")

    def test_extracts_hashed_entry_asset(self):
        html = '<script type="module" src="/assets/index-AbC123.js"></script>'
        self.assertEqual(extract_index_asset(html), "/assets/index-AbC123.js")
        with self.assertRaises(ValueError):
            extract_index_asset("<html></html>")

    def test_accepts_expected_public_document_metadata(self):
        expectation = PUBLIC_METADATA_EXPECTATIONS[0]
        html = f"""
            <html><head>
              <title>{expectation.title}</title>
              <meta name="description" content="{expectation.description}">
              <meta name="robots" content="index,follow,max-image-preview:large">
              <link rel="canonical" href="{expectation.canonical}">
            </head></html>
        """
        self.assertEqual(public_metadata_failures(html, expectation), [])

    def test_rejects_spa_fallback_metadata_for_public_route(self):
        expectation = PUBLIC_METADATA_EXPECTATIONS[1]
        html = """
            <html><head>
              <title>Page Not Found | Verdaxis</title>
              <meta name="description" content="The requested page could not be found.">
              <meta name="robots" content="noindex,nofollow,noarchive">
            </head></html>
        """
        self.assertEqual(
            public_metadata_failures(html, expectation),
            [
                "Public metadata mismatch for /zh/privacy: title",
                "Public metadata mismatch for /zh/privacy: description",
                "Public metadata mismatch for /zh/privacy: canonical",
                "Public metadata mismatch for /zh/privacy: robots",
            ],
        )

    def test_classifies_public_metadata_http_and_transport_failures(self):
        class UnavailableRequestContext:
            def get(self, *_args, **_kwargs):
                return type("Response", (), {"ok": False, "status": 503})()

        frontend: list[str] = []
        dependency: list[str] = []
        transient: list[str] = []
        check_public_metadata_documents(
            request_context=UnavailableRequestContext(),
            base_url="https://canary.verdaxis.exchange",
            headers={},
            frontend=frontend,
            dependency=dependency,
            transient=transient,
        )
        self.assertEqual(frontend, [])
        self.assertEqual(len(dependency), 2)
        self.assertEqual(transient, [])

        class FailingRequestContext:
            def get(self, *_args, **_kwargs):
                raise TimeoutError

        dependency.clear()
        check_public_metadata_documents(
            request_context=FailingRequestContext(),
            base_url="https://canary.verdaxis.exchange",
            headers={},
            frontend=frontend,
            dependency=dependency,
            transient=transient,
        )
        self.assertEqual(frontend, [])
        self.assertEqual(dependency, [])
        self.assertEqual(len(transient), 2)

    def test_frontend_rollback_class_requires_healthy_api(self):
        self.assertEqual(
            classify_failures(
                frontend=["entry asset missing"],
                dependency=[],
                transient=[],
                api_healthy=True,
            ),
            FRONTEND_CRITICAL,
        )
        self.assertEqual(
            classify_failures(
                frontend=["maintenance page rendered"],
                dependency=["readiness failed"],
                transient=[],
                api_healthy=False,
            ),
            DEPENDENCY_FAILURE,
        )

    def test_dependency_and_transient_are_never_frontend_critical(self):
        self.assertEqual(
            classify_failures(
                frontend=[],
                dependency=["CORS blocked refresh"],
                transient=[],
                api_healthy=True,
            ),
            DEPENDENCY_FAILURE,
        )
        self.assertEqual(
            classify_failures(
                frontend=[],
                dependency=[],
                transient=["navigation timeout"],
                api_healthy=None,
            ),
            TRANSIENT,
        )
        self.assertEqual(
            classify_failures(frontend=[], dependency=[], transient=[], api_healthy=True),
            SUCCESS,
        )

    def test_dependency_and_transient_evidence_veto_frontend_rollback(self):
        self.assertEqual(
            classify_failures(
                frontend=["Login rendered the maintenance page"],
                dependency=["One API request failed after startup"],
                transient=["Login page navigation or required control timed out"],
                api_healthy=True,
            ),
            DEPENDENCY_FAILURE,
        )
        self.assertEqual(
            classify_failures(
                frontend=["Entry asset mismatch"],
                dependency=[],
                transient=["Browser transport timed out"],
                api_healthy=True,
            ),
            TRANSIENT,
        )

    def test_browser_aborts_are_not_transport_failures(self):
        self.assertTrue(is_ignorable_request_failure("net::ERR_ABORTED"))
        self.assertTrue(is_ignorable_request_failure("NS_BINDING_ABORTED"))
        self.assertFalse(is_ignorable_request_failure("net::ERR_CONNECTION_RESET"))

    def test_frontend_edge_5xx_is_dependency_evidence(self):
        self.assertEqual(frontend_http_failure_class(404), FRONTEND_CRITICAL)
        self.assertEqual(frontend_http_failure_class(500), DEPENDENCY_FAILURE)
        self.assertEqual(frontend_http_failure_class(503), DEPENDENCY_FAILURE)


if __name__ == "__main__":
    unittest.main()
