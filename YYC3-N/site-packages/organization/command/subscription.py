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

from ngcbase.command.args_validation import check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import CONFIG_TYPE, DISABLE_TYPE, ENABLE_TYPE, STAGING_ENV
from ngcbase.errors import ResourceNotFoundException
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import get_columns_help, get_environ_tag
from organization.command.org import OrgCommand
from organization.data.subscription_management_service.SubscriptionStatusEnum import (
    SubscriptionStatusEnum,
)
from organization.printer.org_team_user import OrgTeamUserPrinter

UCP_DEPENDENT = DISABLE_TYPE if get_environ_tag() >= STAGING_ENV else CONFIG_TYPE


class SubscriptionCommand(OrgCommand):  # noqa: D101
    CMD_NAME = "subscription"
    HELP = "Product Subscription Commands"
    DESC = "Product Subscription Commands"
    CLI_HELP = ENABLE_TYPE

    COMMAND_DISABLE = get_environ_tag() > STAGING_ENV

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.subscription
        self.printer = OrgTeamUserPrinter(self.client.config)

    ADD_DESC = "Add a subscription."
    ADD_HELP = "Add a subscription."

    @CLICommand.command(help=ADD_HELP, description=ADD_DESC, feature_tag=UCP_DEPENDENT)
    @CLICommand.arguments(
        "-product",
        metavar="<product>",
        nargs="?",
        help="Product name.",
        required=True,
        type=str,
    )
    @CLICommand.arguments(
        "-rate-plan",
        metavar="<rate_plan>",
        nargs="?",
        help="Rate plan SKU.",
        required=True,
        type=str,
    )
    @CLICommand.arguments(
        "-quantity",
        metavar="<quantity>",
        nargs="?",
        help="Number of subscriptions.",
        required=True,
        type=int,
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        action="store_true",
        dest="default_yes",
    )
    # TODO: This command is blocked until UCP Integration. UCP is being able to create a billing account with
    #  credit card.
    def add(self, args):
        """Add a subscription to the org."""
        preview_response = self.api.preview_order(
            product_name=args.product, rate_plan=args.rate_plan, quantity=args.quantity
        )
        self.printer.print_subscription_preview(preview_response)
        share_str = "Are you sure you want to add subscription?"
        answer = question_yes_no(self.printer, share_str, default_yes=args.default_yes)

        if answer:
            create_resp = self.api.add_subscription(
                product_name=args.product, rate_plan=args.rate_plan, quantity=args.quantity
            )
            self.printer.print_ok(
                f"Status for '{args.product}' subscription with rate plan '{args.rate_plan}': {create_resp.status}"
            )

    INFO_DESC = "Get subscription details."
    INFO_HELP = "Get subscription details."

    @CLICommand.command(help=INFO_HELP, description=INFO_DESC)
    @CLICommand.arguments(
        "subscription_id",
        metavar="<subscription_id>",
        nargs="?",
        help="Subscription id.",
        type=str,
    )
    def info(self, args):
        """Get Subscription details by Subscrition ID."""
        try:
            resp = self.api.subscription_info(subscription_id=args.subscription_id)
            self.printer.print_subscription(resp)
        except ResourceNotFoundException:
            raise ResourceNotFoundException(f"Subscription with id '{args.subscription_id}' not found") from None

    LIST_DESC = "List all subscriptions."
    LIST_HELP = "List all subscriptions."
    columns_dict = {
        "displayName": "Product",
        "status": "Status",
        "autoRenew": "Auto Renew",
        "expirationDate": "Expiration Date",
    }
    columns_default = ("subscriptionId", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    STATUS_HELP = f"Filter by status. Choices are: {', '.join(SubscriptionStatusEnum)}"

    @CLICommand.command(help=LIST_HELP, description=LIST_DESC)
    @CLICommand.arguments(
        "--status",
        metavar="<status>",
        help=STATUS_HELP,
        type=str.upper,
        choices=SubscriptionStatusEnum,
    )
    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    def list(self, args):
        """List subscriptions from the current org."""
        resp = self.api.list_subscriptions()
        if args.status:
            filtered_resp = []
            for subscription in resp:
                if subscription.status == args.status:
                    filtered_resp.append(subscription)
            resp = filtered_resp
        self.printer.print_subscription_list(resp)

    RENEW_DESC = "Renew subscription."
    RENEW_HELP = "Renew subscription."

    @CLICommand.command(help=RENEW_HELP, description=RENEW_DESC, feature_tag=UCP_DEPENDENT)
    @CLICommand.arguments(
        "subscription_id",
        metavar="<subscription_id>",
        nargs="?",
        help="Subscription id.",
        type=str,
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        action="store_true",
        dest="default_yes",
    )
    # TODO: This command is blocked until UCP Integration. UCP is being able to create a billing account with
    #  credit card.
    def renew(self, args):
        """Renew a subscription by Subscription ID.
        The same payment method used for initially creating subscription will be used.
        """  # noqa: D205
        share_str = "Are you sure you want to renew subscription?"
        answer = question_yes_no(self.printer, share_str, default_yes=args.default_yes)

        if answer:
            resp = self.api.renew_subscription(subscription_id=args.subscription_id)
            self.printer.print_ok(f"Successfully renewed subscription '{args.subscription_id}'")
            self.printer.print_subscription(resp)

    REMOVE_DESC = "Remove subscription."
    REMOVE_HELP = "Remove subscription."

    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_DESC, feature_tag=UCP_DEPENDENT)
    @CLICommand.arguments(
        "subscription_id",
        metavar="<subscription_id>",
        nargs="?",
        help="Subscription id.",
        type=str,
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        action="store_true",
        dest="default_yes",
    )
    # TODO: This command is blocked until UCP Integration. UCP is being able to create a billing account with
    #  credit card.
    def remove(self, args):
        """Remove (cancel) a subscription by Subscription ID.
        Can only cancel subscriptions created through UCP. Subscriptions that are redeemed are not able to be
        cancelled.
        """  # noqa: D205
        share_str = "Are you sure you want to cancel subscription?"
        answer = question_yes_no(self.printer, share_str, default_yes=args.default_yes)

        if answer:
            self.api.remove_a_subscription(subscription_id=args.subscription_id)
            self.printer.print_ok(f"Successfully cancelled subscription '{args.subscription_id}'")
