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
from ngcbase.command.args_validation import (
    check_key_value_pattern,
    check_secret_name_pattern,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import NgcException
from ngcbase.util.utils import confirm_remove
from organization.command.user import UserCommand
from organization.printer.secret import SecretPrinter


class SecretCommand(UserCommand):  # noqa: D101
    CMD_NAME = "secret"
    HELP = "Create, Delete, Edit Secrets to be across NGC resources"
    DESC = "Secret Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.printer = SecretPrinter(self.client.config)
        self.client = self.client.secrets

    SECRET_ENABLE_HELP = "Enable a secret"
    SECRET_DISABLE_HELP = "Disable a secret"
    SECRET_CREATE_HELP = "Create a new secret"
    SECRET_INFO_HELP = "Show details on a specified secret, keys redacted unless specified otherwise"
    SECRET_LIST_HELP = "List available secrets for this user"
    SECRET_DELETE_HELP = "Delete all secrets or a specific secret or key-value pairs from a secret"
    UPDATE_KEY_PAIR_HELP = "Update a secret description, key-value pairs."
    PAIR_FLAG_HELP = (
        "A key-value pair to be added to the secret. "
        "A key name must be between 1-63 characters and contain letters, numbers or ./-_"
        " May be used multiple times in the same command."
    )
    DELETE_KEY_FLAG_HELP = (
        "Delete a key-value pair from a secret rather than the secret itself. May be used multiple"
        " time to delete more than one key-value pair. Required Parameter of Secret."
    )
    INFO_KEY_FLAG_HELP = "Filter all keys except ones provided by this flag, can be used multiple times."

    @CLICommand.command(help=SECRET_CREATE_HELP, description=SECRET_CREATE_HELP)
    @CLICommand.arguments(
        "secret", metavar="<secret-name>", type=check_secret_name_pattern, help="Name of Secret", default=None
    )
    @CLICommand.arguments(
        "--desc",
        metavar="<description>",
        type=str,
        default=None,
        help="Description of a secret",
        required=True,
    )
    @CLICommand.arguments(
        "--pair",
        metavar="<key:value>",
        type=check_key_value_pattern,
        default=None,
        help=PAIR_FLAG_HELP,
        required=True,
        action="append",
    )
    def create(self, args):  # noqa: D102
        self.client.create(secret_name=args.secret, description=args.desc, key_value_list=args.pair)
        self.printer.print_ok(f"Successfully Created Secret {args.secret}")

    @CLICommand.command(help=SECRET_LIST_HELP, description=SECRET_LIST_HELP)
    def list(self, _):  # noqa: D102
        response = self.client.list()
        self.printer.print_secret_list(response)

    @CLICommand.command(help=SECRET_INFO_HELP, description=SECRET_INFO_HELP)
    @CLICommand.arguments("secret", metavar="<secret-name>", help="Name of Secret")
    @CLICommand.arguments(
        "--key",
        metavar="<key>",
        type=str,
        default=None,
        help=INFO_KEY_FLAG_HELP,
        action="append",
    )
    def info(self, args):  # noqa: D102
        if args.key and not args.secret:
            raise NgcException("Must specify secret if key specified")
        secret = self.client.info(secret_name=args.secret, key_names=args.key)
        self.printer.print_secret_info(secret)

    @CLICommand.command(help=SECRET_DELETE_HELP, description=SECRET_DELETE_HELP)
    @CLICommand.arguments("--secret", metavar="<secret-name>", help="Specify the name of the secret to delete.")
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.arguments(
        "--key",
        metavar="<key>",
        type=str,
        default=None,
        help=DELETE_KEY_FLAG_HELP,
        action="append",
    )
    def delete(self, args):  # noqa: D102
        if args.key and not args.secret:
            raise NgcException("Must specify secret if key specified")

        if not args.secret and not args.key:
            target = "all secrets"
        elif args.secret and not args.key:
            target = f"secret {args.secret}"
        else:
            target = f"key(s) {', '.join(args.key)} from secret {args.secret}"
        confirm_remove(printer=self.printer, target=target, default=args.default_yes)

        self.client.delete(secret_name=args.secret, key_names=args.key)
        self.printer.print_ok(f"Successfully deleted {target}.")

    @CLICommand.arguments("--desc", metavar="<description>", type=str, default=None, help="Description of a secret")
    @CLICommand.arguments(
        "--pair",
        metavar="<key:value>",
        type=check_key_value_pattern,
        default=None,
        help=PAIR_FLAG_HELP,
        action="append",
    )
    @CLICommand.arguments("--enable", help=SECRET_ENABLE_HELP, action="store_true")
    @CLICommand.arguments("--disable", help=SECRET_DISABLE_HELP, action="store_true")
    @CLICommand.command(name="update", help=UPDATE_KEY_PAIR_HELP, description=UPDATE_KEY_PAIR_HELP)
    @CLICommand.arguments("secret", metavar="secret", help=UPDATE_KEY_PAIR_HELP)
    @CLICommand.mutex(["disable"], ["enable"])
    def update(self, args):  # noqa: D102
        self.client.update(
            secret_name=args.secret,
            description=args.desc,
            key_value_list=args.pair,
            disable=args.disable,
            enable=args.enable,
        )
        self.printer.print_ok(f"Successfully Changed {args.secret}.")
