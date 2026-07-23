import sys
import urllib.error
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from lib import http


class Test429RetryLimit(unittest.TestCase):
    """429 retries must be capped at max_429_retries to avoid wasting latency."""

    @patch("lib.http.urllib.request.urlopen")
    @patch("lib.http.time.sleep")  # Don't actually sleep in tests
    def test_429_retries_limited_to_2_by_default(self, mock_sleep, mock_urlopen):
        """With default max_429_retries=2, should attempt 2 times then raise."""
        error = urllib.error.HTTPError(
            "http://example.com", 429, "Too Many Requests", {}, None
        )
        mock_urlopen.side_effect = error

        with self.assertRaises(http.HTTPError) as ctx:
            http.request("GET", "http://example.com", retries=5)

        self.assertEqual(ctx.exception.status_code, 429)
        # Should be called exactly 2 times (initial + 1 retry), not 5
        self.assertEqual(mock_urlopen.call_count, 2)

    @patch("lib.http.urllib.request.urlopen")
    @patch("lib.http.time.sleep")
    def test_non_429_errors_still_use_full_retries(self, mock_sleep, mock_urlopen):
        """500 errors should still retry up to the full retries count."""
        error = urllib.error.HTTPError(
            "http://example.com", 500, "Internal Server Error", {}, None
        )
        mock_urlopen.side_effect = error

        with self.assertRaises(http.HTTPError):
            http.request("GET", "http://example.com", retries=3)

        self.assertEqual(mock_urlopen.call_count, 3)


def _mock_response(body: str = '{"ok": true}', status: int = 200):
    resp = MagicMock()
    resp.__enter__ = MagicMock(return_value=resp)
    resp.__exit__ = MagicMock(return_value=False)
    resp.read.return_value = body.encode("utf-8")
    resp.status = status
    return resp


class TestParamsEncoding(unittest.TestCase):
    """request() should urlencode the params dict into the URL."""

    def _sent_url(self, mock_urlopen) -> str:
        request_arg = mock_urlopen.call_args[0][0]
        return request_arg.full_url

    @patch("lib.http.urllib.request.urlopen")
    def test_params_appended_to_url(self, mock_urlopen):
        mock_urlopen.return_value = _mock_response()
        http.get("https://api.example.com/search", params={"q": "test", "limit": 10})
        sent_url = self._sent_url(mock_urlopen)
        self.assertIn("q=test", sent_url)
        self.assertIn("limit=10", sent_url)

    @patch("lib.http.urllib.request.urlopen")
    def test_params_appended_with_existing_query_string(self, mock_urlopen):
        mock_urlopen.return_value = _mock_response()
        http.get("https://api.example.com/search?api_key=secret", params={"q": "test"})
        sent_url = self._sent_url(mock_urlopen)
        self.assertTrue(sent_url.startswith("https://api.example.com/search?api_key=secret&"))
        self.assertIn("q=test", sent_url)

    @patch("lib.http.urllib.request.urlopen")
    def test_none_values_dropped(self, mock_urlopen):
        mock_urlopen.return_value = _mock_response()
        http.get("https://api.example.com/search", params={"q": "test", "filter": None})
        sent_url = self._sent_url(mock_urlopen)
        self.assertIn("q=test", sent_url)
        self.assertNotIn("filter", sent_url)

    @patch("lib.http.urllib.request.urlopen")
    def test_empty_params_leaves_url_unchanged(self, mock_urlopen):
        mock_urlopen.return_value = _mock_response()
        http.get("https://api.example.com/search", params={})
        sent_url = self._sent_url(mock_urlopen)
        self.assertEqual(sent_url, "https://api.example.com/search")

    @patch("lib.http.urllib.request.urlopen")
    def test_no_params_kwarg_leaves_url_unchanged(self, mock_urlopen):
        mock_urlopen.return_value = _mock_response()
        http.get("https://api.example.com/search")
        sent_url = self._sent_url(mock_urlopen)
        self.assertEqual(sent_url, "https://api.example.com/search")

    @patch("lib.http.urllib.request.urlopen")
    def test_int_and_bool_params_stringified(self, mock_urlopen):
        mock_urlopen.return_value = _mock_response()
        http.get("https://api.example.com/search", params={"count": 25, "raw": True})
        sent_url = self._sent_url(mock_urlopen)
        self.assertIn("count=25", sent_url)
        self.assertIn("raw=True", sent_url)
