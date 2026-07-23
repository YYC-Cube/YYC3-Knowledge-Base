#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. ALL RIGHTS RESERVED.
#
# This software product is a proprietary product of Nvidia Corporation and its affiliates
# (the "Company") and all right, title, and interest in and to the software
# product, including all associated intellectual property rights, are and
# shall remain exclusively with the Company.
#
# This software product is governed by the End User License Agreement
# provided with the software product.
#

#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import json
import logging
import posixpath
from typing import Optional

from ngcbase.util.utils import extra_args
from organization.data.subscription_management_service.CreateOrderResponse import (
    CreateOrderResponse,
)
from organization.data.subscription_management_service.ListSubscriptionsResponse import (
    ListSubscriptionsResponse,
)
from organization.data.subscription_management_service.PreviewOrderResponse import (
    PreviewOrderResponse,
)
from organization.data.subscription_management_service.RenewSubscriptionResponse import (
    RenewSubscriptionResponse,
)
from organization.data.subscription_management_service.SubscriptionResponse import (
    SubscriptionResponse,
)
from organization.printer.org_team_user import OrgTeamUserPrinter

logger = logging.getLogger(__name__)


class SubscriptionAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client
        self.printer = OrgTeamUserPrinter(api_client.config)

    @staticmethod
    def base_url(org, subscription_id=None):
        """Create base URL for subscriptions:
        'v2/org/<org-name>/subscriptions'
        'v2/org/<org-name>/subscriptions/<subscription-id>'
        """  # noqa: D205, D415
        parts = ["v2"]
        parts.extend(["org", org])
        parts.extend(["subscriptions"])
        if subscription_id:
            parts.extend([subscription_id])
        return posixpath.join(*parts)

    @staticmethod
    def add_subscription_url(org, preview=False, create=False):
        """Create url to preview and create (add) a subscription.
        'v2/org/{org-name}/order/preview'
        'v2/org/{org-name}/order/create'
        """  # noqa: D205, D415
        parts = ["v2"]
        parts.extend(["org", org])
        parts.extend(["order"])
        if preview:
            parts.extend(["preview"])
        elif create:
            parts.extend(["create"])
        return posixpath.join(*parts)

    def add_subscription(self, product_name: str, rate_plan: str, quantity: int, org_name: str):
        """Add (order/create) a subscription."""
        create_order_url = self.add_subscription_url(org=org_name, create=True)
        request_body = {"productName": product_name, "productRatePlanSku": rate_plan, "quantity": quantity}
        payload = json.dumps(request_body)
        create_response = self.connection.make_api_request(
            "POST", create_order_url, payload=payload, auth_org=org_name, operation_name="create order for subscription"
        )
        return CreateOrderResponse(create_response)

    @extra_args
    def add(self, product_name, rate_plan, quantity, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.add_subscription(
            product_name=product_name, rate_plan=rate_plan, quantity=quantity, org_name=org_name
        )

    def preview_subscription_order(self, product_name: str, rate_plan: str, quantity: int, org_name: str):
        """Preview details of a subscription."""
        preview_order_url = self.add_subscription_url(org=org_name, preview=True)
        request_body = {"productName": product_name, "productRatePlanSku": rate_plan, "quantity": quantity}
        payload = json.dumps(request_body)
        preview_response = self.connection.make_api_request(
            "POST",
            preview_order_url,
            payload=payload,
            auth_org=org_name,
            operation_name="preview order for subscription",
        )
        return PreviewOrderResponse(preview_response).previewOrder

    @extra_args
    def preview_order(self, product_name, rate_plan, quantity, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.preview_subscription_order(
            product_name=product_name, rate_plan=rate_plan, quantity=quantity, org_name=org_name
        )

    def get_subscription_info(self, subscription_id: str, org_name: str):
        """Get information about a subscription."""
        get_url = self.base_url(org_name, subscription_id=subscription_id)
        resp = self.connection.make_api_request(
            "GET", get_url, auth_org=org_name, operation_name="get subscription info"
        )
        return SubscriptionResponse(resp).subscription

    @extra_args
    def info(self, subscription_id: str, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.get_subscription_info(subscription_id=subscription_id, org_name=org_name)

    def list_subscriptions(self, org_name: str):
        """List the org's subscriptions."""
        list_url = self.base_url(org_name)
        resp = self.connection.make_api_request("GET", list_url, auth_org=org_name, operation_name="list subscriptions")
        return ListSubscriptionsResponse(resp).subscriptions

    @extra_args
    def list(self, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration(csv_allowed=True)
        org_name = org or self.client.config.org_name
        return self.list_subscriptions(org_name=org_name)

    def renew_subscription(self, subscription_id: str, org_name: str):
        """Renew a subcription.
        Currently, `/renew` endpoint does not handle updating or changing details of a subscription before renewing.
        This will renew exact same subscription using the same payment method used for initially creating subscription.
        Creating a new subscription with desired details will be required.
        """  # noqa: D205
        renew_url = self.base_url(org_name, subscription_id=subscription_id)
        renew_url = f"{renew_url}/renew"
        resp = self.connection.make_api_request(
            "POST", renew_url, auth_org=org_name, operation_name="renew subscription"
        )
        return RenewSubscriptionResponse(resp).subscription

    @extra_args
    def renew(self, subscription_id: str, org_name: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration()
        org_name = org_name or self.client.config.org_name
        return self.renew_subscription(subscription_id=subscription_id, org_name=org_name)

    def remove_a_subscription(self, subscription_id: str, org_name: str):
        """Remove (cancel) a subscription before the end date."""
        remove_url = self.base_url(org_name, subscription_id=subscription_id)
        resp = self.connection.make_api_request(
            "DELETE", remove_url, auth_org=org_name, operation_name="cancel a subscription"
        )
        return resp

    @extra_args
    def remove(self, subscription_id: str, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.remove_a_subscription(subscription_id=subscription_id, org_name=org_name)
