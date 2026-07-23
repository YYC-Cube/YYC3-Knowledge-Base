#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import base64
from copy import deepcopy
import datetime
import hashlib
import json
import logging
import os
from urllib.request import getproxies
import webbrowser

import polling2
import requests  # pylint: disable=requests-import
import shortuuid
import urllib3

from ngcbase.api.utils import add_scheme, default_headers, NameSpaceObj
from ngcbase.constants import (
    AUTH_TOKEN_SCOPE,
    AUTH_URL_MAPPING,
    CANARY_ENV,
    PRODUCTION_ENV,
    RENEW_TOKEN_BEFORE_EXPIRATION,
    REQUEST_TIMEOUT_SECONDS,
    SCOPED_KEY_PREFIX,
    SF_DEVICE_ID,
    STAGING_ENV,
)
from ngcbase.environ import NGC_CLI_AUTH_URL
from ngcbase.errors import (
    AuthenticationException,
    NgcAPIError,
    NgcException,
    PollingTimeoutException,
    ResourceNotFoundException,
)
from ngcbase.expiring_cache import ExpiringCache
from ngcbase.tracing import traced_request
from ngcbase.util.file_utils import get_cli_token_file
from ngcbase.util.io_utils import mask_string
from ngcbase.util.utils import FunctionWrapper, get_environ_tag

TOKEN_EXPIRATION_TIME = 5 * 60

logger = logging.getLogger(__name__)


class Authentication:  # noqa: D101
    _token_cache = ExpiringCache(max_timeout=TOKEN_EXPIRATION_TIME)
    _cache_loaded = False

    def __init__(self, api_client):
        self.client = api_client

    @staticmethod
    def _token_hash(app_key, org=None, team=None, extra_scopes=None):
        key = [x for x in [app_key, org, team] if x]
        if extra_scopes:
            key.append(extra_scopes)
        return hashlib.sha256(str(key).encode("utf-8")).hexdigest()

    @staticmethod
    def _load_cache():
        """Load the tokens stored in the CLI token file. The tokens are stored in a dictionary
        where the key is the token hash of the current scope, and the value is a list of
        [token, expiration_time].
        """  # noqa: D205
        cache_dict = {}
        try:
            with open(get_cli_token_file(), "r", encoding="utf-8") as f:
                cache_dict = json.loads(f.read())
        except (
            OSError,
            FileNotFoundError,
            ValueError,
            TypeError,
            json.decoder.JSONDecodeError,
        ) as e:
            logger.debug("Error reading token cache from file: %s", e)
        num_of_tokens = len(list(cache_dict.keys()))
        for k, v in cache_dict.items():
            if isinstance(v, list):
                token, expiration_time = v
            else:
                token, expiration_time = v, None
            Authentication._token_cache[k] = FunctionWrapper(
                lambda token_and_expired: token_and_expired, [token, expiration_time]
            )
        num_of_tokens = len(list(Authentication._token_cache.keys()))
        logger.debug("Number of tokens in cache: %s", num_of_tokens)
        Authentication._cache_loaded = True

    @staticmethod
    def _save_cache():
        """Save the tokens on the CLI token file. They are saved in a dictionary where the key is
        the token hash of the current scope, and the value is a list of [token, expiration_time].
        """  # noqa: D205
        try:
            with open(get_cli_token_file(), "w", encoding="utf-8") as f:
                cache_dict = {}
                current_cache_keys = list(Authentication._token_cache.keys())
                for k in current_cache_keys:
                    token_expire_list = []
                    token_expire_list.append(Authentication._token_cache.get(k)[0])
                    token_expire_list.append(Authentication._token_cache.get(k)[1])
                    cache_dict.update({k: token_expire_list})
                json.dump(cache_dict, f)
        except (OSError, FileNotFoundError, ValueError, TypeError) as e:
            logger.debug("Error writing token cache to file: %s", e)

    @staticmethod
    def _clear_cache():
        """Deletes the token file from machine."""  # noqa: D401
        token_file_path = os.path.expanduser(get_cli_token_file())
        if os.path.exists(token_file_path) and os.path.isfile(token_file_path):
            os.remove(token_file_path)

    @staticmethod
    def clear_in_memory_cache():
        """Resets the tokens in Authentication's _token_cache."""  # noqa: D401
        Authentication._token_cache = ExpiringCache(max_timeout=TOKEN_EXPIRATION_TIME)

    @staticmethod
    def _construct_token_url(org=None, team=None, scopes=None):
        """Constructs a url to query the token with."""  # noqa: D401
        # build the url and make the request
        auth_url = Authentication.get_auth_url()
        auth_url = add_scheme(auth_url)

        token_url = "{base_url}/token?service=ngc&".format(base_url=auth_url)

        if scopes is None:
            scopes = []
        # Avoid mutating the passed-in list
        scopes = list(scopes)

        if org:
            group_scope = Authentication.auth_scope()
            org_scope = "group/{group_scope}:{org}".format(group_scope=group_scope, org=org)
            scopes.append(org_scope)
            if team:
                team_scope = "group/{group_scope}:{org}/{team}".format(group_scope=group_scope, org=org, team=team)
                scopes.append(team_scope)

        if scopes:
            scope_query_params = "&".join(["scope={}".format(scope) for scope in scopes or []])
            token_url += "{query_params}".format(query_params=scope_query_params)

        return token_url

    def _construct_starfleet_token_url(self):
        """Constructs a URL that retrieves the Starfleet Token using the X-Device-Id and Session Key."""  # noqa: D401
        base_url = self.client.config.base_url
        starfleet_token_url = f"{base_url}/token"
        return starfleet_token_url

    @staticmethod
    def _construct_device_login_url():
        """Constructs a URL to get the Login Url and SessionKey for Starfleet Authentication."""  # noqa: D401
        device_login = "device/login"
        return device_login

    def _construct_sak_key_details_url(self):
        """Constructs the URL to get key details of Scoped API Keys."""  # noqa: D401
        base_url = self.client.config.base_url
        sak_key_details_url = f"{base_url}/v3/keys/get-caller-info"
        return sak_key_details_url

    @staticmethod
    def _make_token_request(token_url, app_key):
        """Makes api request to get token."""  # noqa: D401
        api_header = "$oauthtoken:{0}".format(app_key)
        auth_header = {"Authorization": "Basic {}".format(base64.b64encode(api_header.encode("utf-8")).decode("utf-8"))}
        headers = default_headers(auth_header)

        # ignore SSL warnings
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        try:
            logger.debug("Requesting new token from %s", token_url)
            response = traced_request(
                "GET",
                token_url,
                operation_name="token request",
                headers=headers,
                timeout=REQUEST_TIMEOUT_SECONDS,
                proxies=getproxies(),
            )
        except requests.ConnectionError:
            msg = "Url: '{0}' is not reachable.".format(token_url)
            raise NgcException(msg) from None
        return Authentication._parse_api_response(response)

    def _get_token(
        self,
        app_key,
        org=None,
        team=None,
        scopes=None,
        starfleet_kas_session_key=None,
        starfleet_authentication=False,
        starfleet_kas_email=None,
    ):
        """Return the token and "expires_in" value from the request to token URL."""
        # Only the VALIDATE_API_KEY method calls this function with app_key=API_KEY
        # Everywhere else that calls auth_header just passes org and team... NO APP_KEY
        if app_key:
            token_url = Authentication._construct_token_url(org=org, team=team, scopes=scopes)
            response = Authentication._make_token_request(token_url, app_key)
            return [response["token"], response.get("expires_in", -1)]
        if starfleet_authentication:
            device_login_response = self.starfleet_on_kas_device_login_flow(starfleet_kas_email)
            login_url = device_login_response.get("loginUrl", None)
            session_key = device_login_response.get("sessionKey", None)
            expires_in = device_login_response.get("expiresIn", None) or 86400

            # Find out how to print somewhere else other than in API/AUTH
            try:
                starfleet_id_prompt = (
                    "Attempting to open the following URL in a browser:"
                    f" \n\n{login_url}\n\nSetting of configuration will continue after"
                    " login. If login is not completed within 60 seconds, please run"
                    " command again."
                )
                self.client.printer.print_ok(starfleet_id_prompt)
                webbrowser_opened = webbrowser.open(login_url, new=0, autoraise=True)
                if not webbrowser_opened:
                    raise webbrowser.Error
            except webbrowser.Error:
                starfleet_id_prompt = (
                    "\nUnable to open browser. \nPlease open the URL in a browser of your choice, and complete login."
                )
                self.client.printer.print_ok(starfleet_id_prompt)

            self.start_polling_session_key(session_key, starfleet_kas_email)

            return [session_key, expires_in]
        if starfleet_kas_session_key:
            starfleet_session_key_expiration = self.client.config.starfleet_session_key_expiration
            return [starfleet_kas_session_key, starfleet_session_key_expiration]
        return [None, None]

    def get_token(
        self,
        org=None,
        team=None,
        scopes=None,
        app_key=None,
        starfleet_kas_session_key=None,
        starfleet_authentication=False,
        starfleet_kas_email=None,
        kas_direct=False,
        renew=False,
    ):
        """Returns JWT token, This will return "None" if there is not app_key set or passed.
        This also checks for the expiration time of the token for the current scope. A new token
        will be retrieved if the token in the cache is about to expire or has expired. When saving
        this new token, the expiration time is also saved. A list of [token, expiration_time] is
        saved onto the cache.
        If the token loaded from cache does not contain an expiration time, CLI retrieves a new token.

        For Starfleet on KAS Auth, the previous will still apply but instead of a "token" a "session key" is used.
        If initially authenticating, this will always get the Login URL needed for Starfleet login,
        and the session key.
        There is no refreshing of the session key for Starfleet on KAS Auth. User must login again.
        """  # noqa: D205, D401
        if (
            not starfleet_kas_session_key
            or not self.client.config.starfleet_kas_session_key
            and not self.client.config.starfleet_kas_email
        ) and not starfleet_authentication:
            app_key = app_key or self.client.config.app_key
            if not app_key:
                return None

        if app_key:
            token_hash = self._token_hash(app_key, org, team, scopes)
            token, expiration_time = self._get_api_cache_token(
                app_key=app_key, token_hash=token_hash, kas_direct=kas_direct
            )
        elif starfleet_kas_session_key:
            token_hash = "starfleet_kas_session_key"
            expiration_time = self.client.config.starfleet_session_key_expiration
            try:
                datetime.datetime.fromtimestamp(self.client.config.starfleet_session_key_expiration).strftime(
                    "%Y-%m-%d::%H:%M:%S"
                )
            except (ValueError, OSError, OverflowError, TypeError) as e:
                logger.debug(
                    "Expiration time '%s' from cache invalid: %s",
                    expiration_time,
                    e,
                )
                expiration_time = -1
            if kas_direct:
                logger.debug("KAS Direct. Retrieving Starfleet Token.")
                token = self._get_starfleet_token()
            else:
                token = starfleet_kas_session_key
        elif starfleet_authentication:
            # `config set` will force new login, even if user has session key in current config.
            # It is possible to change this.
            token = None
            expiration_time = -1
            token_hash = "starfleet_kas_session_key"

        # pylint: disable=protected-access
        renew = self._check_token_expiration(
            app_key=app_key, expiration_time=expiration_time, token_hash=token_hash
        ) or (renew if app_key and not app_key.startswith(SCOPED_KEY_PREFIX) else False)

        # renew=true if no token in cache; if token about to expire or has expired;
        # if no expiration time is saved in cache;
        # Or if the renew arg is true AND is not changed throughout this command (token does exist;
        # token not expired (and will not expire soon))
        if renew:
            if app_key:
                logger.debug("Retrieving new token.")
                token, expires_in = self._get_token(app_key, org, team, scopes)
            elif starfleet_authentication:
                logger.debug("Starfleet Authentication commencing...")
                token, expires_in = self._get_token(
                    app_key=None,
                    starfleet_kas_session_key=False,
                    starfleet_authentication=True,
                    starfleet_kas_email=starfleet_kas_email,
                )
            elif starfleet_kas_session_key and starfleet_kas_email:
                raise AuthenticationException(
                    "Session key has expired, but cannot be renewed automatically.\n"
                    "Please run `ngc config set` to reauthenticate."
                ) from None
            # TODO: change this to not be timezone specific
            expiration_time = datetime.datetime.now(datetime.timezone.utc)
            if expires_in > 0:
                expiration_time += datetime.timedelta(seconds=expires_in)
            expiration_time = expiration_time.timestamp()

            Authentication._token_cache[token_hash] = FunctionWrapper(
                lambda token_and_expired: token_and_expired, [token, expiration_time]
            )
            if not starfleet_kas_session_key and not starfleet_authentication:
                if not self.client.config.sdk_configuration:
                    Authentication._save_cache()
            expiration_time_readable = datetime.datetime.fromtimestamp(expiration_time)
            logger.debug(
                "Token has been received and cached. Token will expire at UTC time %s",
                expiration_time_readable,
            )
        return token

    def _get_api_cache_token(self, app_key, token_hash=None, kas_direct=False):
        if kas_direct or app_key.startswith(SCOPED_KEY_PREFIX):
            token = app_key
            if kas_direct:
                logger.debug("KAS Direct. Using API Key directly.")
                # This will bypass renewal of token.
                expiration_time = (datetime.datetime.now() + datetime.timedelta(hours=1)).timestamp()
            else:
                logger.debug("SAK detected. Using Scoped API Key directly.")
                # This will bypass renewal of token.
                expiration_time = (datetime.datetime.now() + datetime.timedelta(hours=1)).timestamp()

        else:
            # The first call for the SDK Client will never have any cache to load, since it does not pull
            # tokens from a file.
            # If Client is discarded, or cache is cleared, the tokens will be deleted.
            # The tokens in Authentication._token_cache will never be unloaded and require it
            # to be loaded again.
            if not Authentication._cache_loaded and not self.client.config.sdk_configuration:
                # Only API OAuth tokens are stored in cache.
                # The session key is not stored in cache; only in config file.
                Authentication._load_cache()
            logger.debug("Retrieving API Key Token from cache....")
            try:
                # Getting token and/or expiration time from Authentication._token_cache
                token_cache = Authentication._token_cache[token_hash]
                if isinstance(token_cache, list):
                    token = token_cache[0]
                    expiration_time = token_cache[1]
                    try:
                        datetime.datetime.fromtimestamp(expiration_time, tz=datetime.timezone.utc)
                    except (OSError, OverflowError, TypeError) as e:
                        logger.debug(
                            "Expiration time '%s' from cache invalid: %s",
                            expiration_time,
                            e,
                        )
                        expiration_time = -1
                    logger.debug("Token in use: %s", mask_string(token)[-8:])
                    logger.debug(
                        "Expiration time of token: '%s'",
                        datetime.datetime.fromtimestamp(expiration_time),
                    )
                else:
                    token = token_cache
                    expiration_time = -1
            except KeyError:
                token = None
                expiration_time = -1
                cache_debug_message = (
                    "Requested token not found in cache." if Authentication._token_cache else "Cache is empty."
                )
                logger.debug(cache_debug_message)
        return token, expiration_time

    def _check_token_expiration(self, app_key, expiration_time, token_hash):
        # Checking if token is expired.
        # If token contains no expiration time in cache, assume token has expired.
        if expiration_time > 0:
            current_time = datetime.datetime.now(datetime.timezone.utc).timestamp()
            time_left_for_token = expiration_time - current_time
            if time_left_for_token <= 0:
                renew = True
                logger.debug("Token for %s has expired. Must retrieve new token.", token_hash)
            elif time_left_for_token <= RENEW_TOKEN_BEFORE_EXPIRATION:
                renew = True
                logger.debug(
                    "Token for %s is about to expire. Must retrieve new token.",
                    token_hash,
                )
            else:
                renew = False
                if app_key and not app_key.startswith(SCOPED_KEY_PREFIX):
                    logger.debug(
                        "Fetched token from the cache. Expires %s",
                        datetime.datetime.fromtimestamp(expiration_time),
                    )
                if self.client.config.app_key and self.client.config.app_key.startswith(SCOPED_KEY_PREFIX):
                    logger.debug("Found Scoped API Key, not fetching token.")
        else:
            renew = True
            logger.debug("Token does not contain expiration time. Must retrieve new token.")
        return renew

    def _get_starfleet_token(self):
        """Get the Starfleet Token from KAS' `token` endpoint using X-Device-Id and the Session Key."""
        sf_device_id_and_email = f"{SF_DEVICE_ID}-{self.client.config.starfleet_kas_email}"
        sf_device_id = shortuuid.uuid(name=sf_device_id_and_email)[:19]
        starfleet_header = {
            "X-Device-Id": sf_device_id,
            "Authorization": f"Bearer {self.client.config.starfleet_kas_session_key}",
        }
        headers = default_headers(starfleet_header)
        token_url = self._construct_starfleet_token_url()
        # ignore SSL warnings
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        try:
            logger.debug("Calling /token KAS Endpoint to get user's Starfleet Token")
            debug_headers = deepcopy(headers)
            if "Authorization" in debug_headers:
                debug_headers["Authorization"] = mask_string(debug_headers["Authorization"])
            logger.debug(
                "Requesting URL (%s): %s\n    headers: %s\n",
                "GET",
                token_url,
                debug_headers,
            )
            response = traced_request(
                method="GET",
                url=token_url,
                headers=headers,
                operation_name="get Starfleet Token for user",
            )
            return response.json().get("token", "")
        except json.decoder.JSONDecodeError:
            msg = (
                "The response from the authentication service was either blank or"
                " malformed. Please rerun this command with the `--debug` argument,"
                " and provide the output to support."
            )
            raise NgcAPIError(msg, response=response) from None
        except requests.ConnectionError:
            msg = f"Url: '{token_url}' is not reachable."
            raise NgcException(msg) from None

    def get_login_url_and_session_key(self, starfleet_kas_email):
        """Get the loginURrl and the sessionKey from KAS' `device/login` endpoint."""
        device_login_url = Authentication._construct_device_login_url()
        device_login_url = f"{self.client.config.base_url}/{device_login_url}"
        sf_device_id_and_email = f"{SF_DEVICE_ID}-{starfleet_kas_email}"
        # "The IDs won't be universally unique any longer, but the probability of a collision will still be very low."
        sf_device_id = shortuuid.uuid(name=sf_device_id_and_email)[:19]
        device_login_request = {
            "deviceId": sf_device_id,
            "email": starfleet_kas_email,
        }
        # MAX Length of X-Device-Id is 19
        headers = {"Accept": "*/*", "X-Device-Id": sf_device_id}
        headers = default_headers(headers)

        # ignore SSL warnings
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        try:
            logger.debug("Calling /device/login KAS Endpoint to get loginUrl and sessionKey")
            response = traced_request(
                method="POST",
                url=device_login_url,
                headers=headers,
                operation_name="get Starfleet loginUrl and sessionKey",
                # timeout=REQUEST_TIMEOUT_SECONDS,
                json=device_login_request,
            )
            return response.json()
        except requests.ConnectionError:
            msg = f"Url: '{device_login_url}' is not reachable."
            raise NgcException(msg) from None

    def starfleet_on_kas_device_login_flow(self, starfleet_kas_email):  # noqa: D102
        return self.get_login_url_and_session_key(starfleet_kas_email)

    def start_polling_session_key(self, session_key, starfleet_kas_email):  # noqa: D102
        sf_device_id_and_email = f"{SF_DEVICE_ID}-{starfleet_kas_email}"
        sf_device_id = shortuuid.uuid(name=sf_device_id_and_email)[:19]
        headers = {
            "Accept": "*/*",
            "Authorization": f"Bearer {session_key}",
            "Content-Type": "application/json",
            "X-Device-Id": sf_device_id,
            "deviceId": sf_device_id,
        }
        headers = default_headers(headers)

        def _get_response_from_polling(response):
            if response.status_code not in [200, 401]:
                # Only accept 401 errors.... Any other errors should cause command to exit
                raise NgcException(
                    "An error occurred while waiting for User Login. Please retry"
                    f" login. Status Code: {response.status_code}"
                ) from None
            if response.status_code == 403:
                raise AuthenticationException("The Session Key is no longer valid.") from None
            return response.status_code == 200

        # When they login, the session key and device ID pair are made valid.
        ngc_ping_url = f"{self.client.config.base_url}/v2/ping"
        logger.debug("Beginning polling KAS ping endpoint with sessionKey.")
        try:
            polling2.poll(
                lambda: requests.head(ngc_ping_url, headers=headers, timeout=60),
                step=7,  # Seconds to wait before next call
                poll_forever=False,
                timeout=60,
                check_success=_get_response_from_polling,
                log=logging.DEBUG,
            )
        except polling2.TimeoutException:
            logger.debug("Polling timeout. Authentication not completed in alloted time.")
            raise PollingTimeoutException(
                "ERROR: Please make sure to complete login within the time interval."
            ) from None
        except AuthenticationException:
            raise AuthenticationException("The Session Key is no longer valid.") from None

    def auth_header(
        self,
        auth_org=None,
        auth_team=None,
        scopes=None,
        app_key=None,
        renew=False,
        kas_direct=False,
        extra_auth_headers=None,
    ):
        """Return a dictionary containing the Authorization header for requests."""
        headers = {}
        if self.client.config.app_key:
            auth_token = self.get_token(
                org=auth_org,
                team=auth_team,
                scopes=scopes,
                app_key=app_key,
                kas_direct=kas_direct,
                renew=renew,
            )
        elif self.client.config.starfleet_kas_session_key and self.client.config.starfleet_kas_email:
            auth_token = self.get_token(
                starfleet_kas_session_key=self.client.config.starfleet_kas_session_key,
                starfleet_kas_email=self.client.config.starfleet_kas_email,
                kas_direct=kas_direct,
                renew=renew,
            )
            sf_device_id_and_email = f"{SF_DEVICE_ID}-{self.client.config.starfleet_kas_email}"
            sf_device_id = shortuuid.uuid(name=sf_device_id_and_email)[:19]
            starfleet_header = {
                "X-Device-Id": sf_device_id,
            }
            headers.update(starfleet_header)
        else:
            auth_token = None
        if auth_token:
            headers.update({"Authorization": f"Bearer {auth_token}"})
        if extra_auth_headers:
            headers.update(extra_auth_headers)
        if self.client.config.org_name and "nv-ngc-org" not in headers:
            headers.update({"nv-ngc-org": self.client.config.org_name})
            if self.client.config.team_name and "nv-ngc-team" not in headers:
                headers.update({"nv-ngc-team": self.client.config.team_name})
        return headers

    def validate_api_key(self, app_key):
        """Retrieves new, refreshed Token."""  # noqa: D401
        try:
            self.get_token(app_key=app_key, org=None, team=None, renew=True)
            return True
        except AuthenticationException:
            return False

    def validate_sak_key(self, sak_key):
        """Validates the Scoped API Key (SAK)"""  # noqa: D401 D415
        try:
            self.get_sak_key_details(sak_key=sak_key)
            return True
        except AuthenticationException:
            return False

    def validate_sf_kas_session_key(self):
        """Can't renew a session key. User must re-login via browser from `config set`.
        Instead, we just check the expiration time from cache as a way to validate session key.
        """  # noqa: D205
        starfleet_kas_session_key = self.client.config.starfleet_kas_session_key
        starfleet_kas_email = self.client.config.starfleet_kas_email
        self.get_token(
            starfleet_kas_session_key=starfleet_kas_session_key,
            starfleet_kas_email=starfleet_kas_email,
        )
        return True

    def get_sak_key_details(self, sak_key):
        """Returns info about the Scoped API Key (SAK) including the orgName which this Key has permissions to,
        the keyType (Personal or Service), products that this Key has permissions to, userId (if personal key), and
        user object (only for personal key). Personal == USER. Service == CLOUD_ACCOUNT.
        If this method change, must change the method under organization.api.users.user_who_personal_key()
        and vice versa.
        """  # noqa: D205, D401
        # This is an open endpoint. No Auth:Bearer token needed.
        sak_key_details_url = self._construct_sak_key_details_url()
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        sak_key_request = {"credentials": sak_key}
        try:
            logger.debug("Requesting SAK Key details from %s", sak_key_details_url)
            response = traced_request(
                "POST",
                sak_key_details_url,
                operation_name="get sak key details",
                headers=headers,
                timeout=REQUEST_TIMEOUT_SECONDS,
                data=sak_key_request,
            )
            logger.debug("SAK Key details response %s", response.json())
            response.raise_for_status()  # Raise an HTTPError for bad responses (4xx and 5xx)
        except requests.ConnectionError:
            msg = "Url: '{0}' is not reachable.".format(sak_key_details_url)
            raise NgcException(msg) from None
        except requests.HTTPError as e:
            raise AuthenticationException(f"Invalid SAK key: {e}") from e
        return NameSpaceObj(response.json())

    def get_starfleet_kas_session_key(self, starfleet_kas_email):
        """Triggers the setting of new Starfleet account.
        Requires opening browser.
        """  # noqa: D205
        try:
            return (
                self.get_token(
                    starfleet_authentication=True,
                    renew=True,
                    starfleet_kas_email=starfleet_kas_email,
                ),
                Authentication._token_cache["starfleet_kas_session_key"][1],
            )
        except AuthenticationException:
            return None

    @staticmethod
    def _parse_api_response(response):
        # first let's make sure it's a valid response as defined in the api
        status_code = response.status_code
        if status_code == 200:
            try:
                o = Authentication._result(response, is_json=True)
                return o
            except NgcException:
                raise
            except Exception:
                raise NgcException(
                    "Error (unexpected format) : {} : {}".format(response.status_code, response.text)
                ) from None
        elif status_code == 401:
            message = "Invalid apikey"
            raise AuthenticationException(message)
        else:
            raise NgcException("Error (unexpected format) : {} : {}".format(response.status_code, response.text))

    @staticmethod
    def _result(response, is_json=False):
        Authentication._raise_for_status(response)
        if is_json:
            try:
                return response.json()
            except json.decoder.JSONDecodeError:
                msg = (
                    "The response from the authentication service was either blank or"
                    " malformed. Please rerun this command with the `--debug` argument,"
                    " and provide the output to support."
                )
                raise NgcAPIError(msg, response=response) from None
        return response.text

    @staticmethod
    def _raise_for_status(response):
        """Raises `NgcAPIError`, if occurred."""  # noqa: D401
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            raise Authentication._create_api_error_from_http_exception(e) from None

    @staticmethod
    def _create_api_error_from_http_exception(e) -> Exception:
        """Create a NgcAPIError from requests.exceptions.HTTPError."""
        response = e.response
        try:
            explanation = response.text.strip()
        except AttributeError:
            explanation = ""

        cls = NgcAPIError
        if response.status_code == 404:
            cls = ResourceNotFoundException
        elif response.status_code == 401:
            cls = AuthenticationException
        return cls(e, response=response, explanation=explanation)

    @staticmethod
    def auth_scope():  # noqa: D102
        environment_type = get_environ_tag()
        if environment_type in (PRODUCTION_ENV, CANARY_ENV):
            return AUTH_TOKEN_SCOPE["prod"]

        return AUTH_TOKEN_SCOPE["stg"]

    @staticmethod
    def get_auth_url():  # noqa: D102
        if NGC_CLI_AUTH_URL:
            return NGC_CLI_AUTH_URL
        environ_tag = get_environ_tag()
        env = {PRODUCTION_ENV: "prod", CANARY_ENV: "canary", STAGING_ENV: "stg"}.get(environ_tag)
        return AUTH_URL_MAPPING[env]
