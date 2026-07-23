#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import functools
import sys

from ngcbase.command.global_args import get_parent_parser
from ngcbase.command.parser import SortingHelpFormatter
from ngcbase.constants import CONFIG_TYPE, DISABLE_TYPE, ENABLE_TYPE, PRODUCTION_ENV
from ngcbase.environ import NGC_CLI_SUPER_ADMIN_ENABLE
from ngcbase.errors import InvalidArgumentError
from ngcbase.tracing import trace_command
from ngcbase.util.utils import get_environ_tag


def is_command_disable():  # noqa: D103
    disable_admin = not NGC_CLI_SUPER_ADMIN_ENABLE
    return disable_admin


class CLICommand:
    """Interface for ngc cli commands."""

    # This is the name of your command, so if you want to create any new command,
    # say "ngc mycommand" you CMD_NAME would be "mycommand"
    CMD_NAME = "ngc"
    # This is the description of the command showed when -h on that command is invoked
    DESC = "description of the command"
    # This is the brief help description showed, usually this is the short one liner description
    # of the command
    HELP = ""
    # Set it "True" if the command is to be disabled completely.
    # If the command needs to be disable in production, use `disable_in_prod()`
    COMMAND_DISABLE = False

    # This is the way we can determine if help needs config
    # It has to be one ngcbase.constants._FeatureType.
    # By default the CLI_HELP of all the commands is "CONFIG" type
    CLI_HELP = CONFIG_TYPE

    # This is the way we can determine the environment of CLI we are getting
    # It has to be one ngcbase.constants._FeatureType.
    # By default the CLI_ENV of all the commands is "Production" type, meaning we expose everything in PROD
    CLI_ENV = PRODUCTION_ENV

    # Print a warning for specified condition
    WARN_MSG = ""
    WARN_COND = None

    # Alias for a command
    CMD_ALIAS = []

    # Alternative CMD name
    CMD_ALT_NAME = None
    CMD_ALT_COND = None

    CMD_PARSERS = {}

    CLI_CLIENT = None

    def __init__(self, parser):
        self.subparser = None
        self.classes = {}
        self._overridden_client = None
        self._overridden_configuration = None
        self.parent_parsers = get_parent_parser(self._base_client)
        self.add_subparsers(parser)

    @property
    def _base_client(self):
        return type(self).CLI_CLIENT

    @property
    def client(self):
        """Client."""
        if self._overridden_client:
            return self._overridden_client
        return type(self).CLI_CLIENT

    @client.setter
    def client(self, value):
        self._overridden_client = value

    @property
    def configuration(self):
        """Config."""
        if self._overridden_configuration:
            return self._overridden_configuration
        return self._base_client.config

    @configuration.setter
    def configuration(self, value):
        self._overridden_configuration = value

    def add_subparsers(self, parser):  # noqa: D102
        _title = (
            self.CMD_ALT_NAME
            if self.CMD_ALT_NAME and parser == CLICommand.CMD_PARSERS.get(self.CMD_ALT_NAME, None)
            else self.CMD_NAME
        )
        self.subparser = parser.add_subparsers(title=_title, metavar="")
        metavar = []
        for cls in self.__class__.__subclasses__():
            # checks if command is disabled or not
            if not cls.COMMAND_DISABLE and self._can_expose_in_current_environ(cls.CLI_ENV):
                _name = cls.CMD_ALT_NAME if cls.CMD_ALT_NAME and cls.CMD_ALT_COND == self.__class__ else cls.CMD_NAME
                if self._can_expose_with_current_config(cls.CLI_HELP, _name):
                    metavar.append(_name)
                    selfparser = self.subparser.add_parser(
                        _name,
                        help=cls.HELP + cls.WARN_MSG if cls.WARN_MSG and cls.WARN_COND == self.__class__ else cls.HELP,
                        description=cls.DESC,
                        add_help=False,
                        parents=self.parent_parsers,
                        formatter_class=SortingHelpFormatter,
                        aliases=cls.CMD_ALIAS,
                    )
                else:
                    selfparser = self.subparser.add_parser(
                        _name,
                        description=cls.DESC,
                        add_help=False,
                        parents=self.parent_parsers,
                        formatter_class=SortingHelpFormatter,
                        aliases=cls.CMD_ALIAS,
                    )
                CLICommand.CMD_PARSERS[_name] = selfparser
                self.classes[_name] = cls(selfparser)
        if metavar:
            self.subparser.metavar = "{" + ",".join(sorted(metavar)) + "}"

    def _can_expose_with_current_config(self, tag=None, name=None):
        tag = tag or self.CLI_HELP
        name = name or self.CMD_NAME
        if tag == DISABLE_TYPE:
            return False
        if tag == CONFIG_TYPE:
            return (
                name in (self._base_client.config.command_map.get("commands") or [])
                if self._base_client.config.command_map
                else False
            )

        return tag == ENABLE_TYPE

    def _can_expose_in_current_environ(self, tag=None):
        if tag is None:
            return True

        return get_environ_tag() <= (tag or self.CLI_ENV)

    def make_bottom_commands(self, parser):  # noqa: D102
        if hasattr(self, "subparser"):
            # metavar will be a string in the format '{m1,m2}'. We need to parse that for this level.
            submeta = self.subparser.metavar or ""
            content = submeta.replace("{", "").replace("}", "")
            metavar = content.split(",") if content else []
        else:
            self.subparser = parser.add_subparsers(metavar="")
            metavar = []
        # changed dir(self) to self.__class__.__dict__ because
        # dir(self) lists attributes in the complete class
        # hierarchy (including parent classes)
        for attr in self.__class__.__dict__:
            get_attr = getattr(self, attr)
            # subcommand tagging
            feature_tag = getattr(get_attr, "feature_tag", None)
            environ_tag = getattr(get_attr, "environ_tag", None)

            if self._can_expose_in_current_environ(environ_tag) and hasattr(get_attr, "isBottomLevel"):
                # __add_open_tracing replaces the attribute, but the local variable must also be updated
                get_attr = self.__add_open_tracing(parser, attr)
                dict_args = getattr(get_attr, "command_kwargs")
                if not self._can_expose_with_current_config(feature_tag):
                    dict_args.pop("help", None)
                else:
                    metavar.append(dict_args["name"] if "name" in dict_args else attr)
                if "name" in dict_args:
                    selfparser = self.subparser.add_parser(
                        formatter_class=SortingHelpFormatter,
                        parents=self.parent_parsers,
                        add_help=False,
                        *getattr(get_attr, "command_args"),
                        **dict_args,
                    )
                else:
                    selfparser = self.subparser.add_parser(
                        attr,
                        formatter_class=SortingHelpFormatter,
                        parents=self.parent_parsers,
                        add_help=False,
                        *getattr(get_attr, "command_args"),
                        **dict_args,
                    )
                selfparser.set_defaults(func=get_attr)
                if hasattr(get_attr, "args_list"):
                    arg_args = getattr(get_attr, "args_list")
                    arg_kwargs = getattr(get_attr, "kwargs_list")
                    is_required_arg = False

                    required_args = None
                    for d in arg_kwargs:
                        if "required" in d:
                            is_required_arg = d["required"]

                    if is_required_arg:
                        required_args = selfparser.add_argument_group("Required named arguments")

                    for i, d in enumerate(arg_kwargs):
                        # arguments feature tagging
                        if d.get("feature_tag"):
                            arg_tag = d.pop("feature_tag")
                            if not self._can_expose_with_current_config(arg_tag):
                                selfparser.suppress_argument(arg_kwargs[i])

                        if d.get("environ_tag"):
                            env_tag = d.pop("environ_tag")
                            if not self._can_expose_in_current_environ(env_tag):
                                selfparser.suppress_argument(arg_kwargs[i])

                        completer = d.get("completer")
                        if completer:
                            del d["completer"]
                        if "required" in d and d["required"]:
                            arg = required_args.add_argument(*arg_args[i], **arg_kwargs[i])
                        else:
                            arg = selfparser.add_argument(*arg_args[i], **arg_kwargs[i])
                        if completer:
                            arg.completer = completer
        if metavar:
            self.subparser.metavar = "{" + ",".join(sorted(metavar)) + "}"

    def __add_open_tracing(self, parser, func_name):
        """Wraps the given function with a tracer and replaces it in the CLICommand object."""  # noqa: D401
        func = getattr(self, func_name)
        command_name = func.command_kwargs["name"] if "name" in func.command_kwargs else func_name
        command_name = "{} {}".format(parser.prog, command_name)

        @trace_command(name=command_name, config=self._base_client.config)
        @functools.wraps(func)
        def traced_func(*func_args, **func_kwargs):
            return func(*func_args, **func_kwargs)

        setattr(self, func_name, traced_func)
        return getattr(self, func_name)

    @classmethod
    def arguments(cls, *args, **kwargs):  # noqa: D102
        def decorator(func):
            args_list = getattr(func, "args_list", [])
            kwargs_list = getattr(func, "kwargs_list", [])
            # insert at 0 so the arguments are added in the order that they are listed
            args_list.insert(0, args)
            kwargs_list.insert(0, kwargs)
            setattr(func, "args_list", args_list)
            setattr(func, "kwargs_list", kwargs_list)
            return func

        return decorator

    @classmethod
    def command(cls, *args, **kwargs):  # noqa: D102
        def command_decorator(func):
            func.isBottomLevel = True
            # add the tag to the function, so when we need to expose we can filter it out
            # while `make_bottom_command` call
            if kwargs.get("feature_tag"):
                setattr(func, "feature_tag", kwargs.pop("feature_tag"))
            if kwargs.get("environ_tag"):
                setattr(func, "environ_tag", kwargs.pop("environ_tag"))
            setattr(func, "command_args", args)
            setattr(func, "command_kwargs", kwargs)
            return func

        return command_decorator

    @classmethod
    def any_of(cls, *groups, cond=True):
        """Validates that at least one member of each group have been called."""  # noqa: D401

        def anyof_this(f):
            @functools.wraps(f)
            def f_anyof(*args, **kwargs):
                if cond:
                    validate_anyof(args[1], *groups)
                return f(*args, **kwargs)

            return f_anyof

        return anyof_this

    @classmethod
    def mutex(cls, *groups):  # noqa: D102
        def mutex_this(f):
            @functools.wraps(f)
            def f_mutex(*args, **kwargs):
                # Regular mutex is max_mutex with a count of 1 (default)
                validate_mutex(args[1], *groups)
                return f(*args, **kwargs)

            return f_mutex

        return mutex_this

    @classmethod
    def max_mutex(cls, count, *groups):
        """Validates that no more than `count` members of each group have been called."""  # noqa: D401

        def max_mutex_this(f):
            @functools.wraps(f)
            def f_max_mutex(*args, **kwargs):
                validate_mutex(args[1], *groups, count=count)
                return f(*args, **kwargs)

            return f_max_mutex

        return max_mutex_this


def check_modified_key_name(key_name):
    """Argparse automatically replaces dashes with underscores so that the arguments are accessible as attributes
    through a parser. The unmodified name should be printed to users.
    """  # noqa: D205
    expected_arg = "--" + key_name.replace("_", "-")
    # Look for both '--some-arg <>' and '--some-arg=<>' in sys.argv.
    if expected_arg in sys.argv or any(arg.startswith(expected_arg + "=") for arg in sys.argv):
        return key_name.replace("_", "-")
    return key_name


def user_arg(arg):
    """Return the argument in the format the user entered it."""
    return f"--{check_modified_key_name(arg)}"


def validate_mutex(parsed_args, *groups, count=1):  # noqa: D103
    args_set = {k for k, v in vars(parsed_args).items() if v}
    solo = len(groups) == 1
    if solo:
        # each element is mutually exclusive
        groups = [[elem] for elem in groups[0]]
    matched_args = set()
    matched_groups = []
    for group in groups:
        in_both = args_set.intersection(set(group))
        if in_both:
            matched_args.update(in_both)
            matched_groups.append(group)
    if len(matched_groups) > count:
        if solo:
            elements = [grp[0] for grp in groups]
            group_display = " ".join([user_arg(key) for key in elements])
            plural = ("", "is") if count == 1 else ("s", "are")
            msg = f"argument: No more than {count} argument{plural[0]} out of [{group_display}] {plural[1]} allowed"
        else:
            matched_groups.sort(key=len)
            grp0, grp1 = matched_groups[0], matched_groups[1]
            args0 = user_arg([arg for arg in grp0 if arg in matched_args][0])
            args1 = ", ".join([user_arg(grp) for grp in grp1])
            msg = f"argument: '{args0}' cannot be specified with arguments: [{args1}]"
        raise InvalidArgumentError(msg)


def validate_anyof(parsed_args, *groups):  # noqa: D103
    args_set = {k for k, v in vars(parsed_args).items() if v}
    for group in groups:
        if not args_set.intersection(set(group)):
            # Replace `_` with `-` in the arguments.
            # `user_arg` needs the argument to be in `sys.argv` to be able to translate the characters. In this case,
            # the error is that the expected arguments AREN'T in `sys.argv`, so we have to guess at what the arguments
            # were supposed to be.
            # This approach is still an assumption, but it's more likely to be correct than leaving the underscores in.
            user_args = [user_arg(member) for member in group]
            user_args = [(arg.replace("_", "-") if arg.startswith("--") else arg) for arg in user_args]
            required = ", ".join(user_args)
            msg = f"argument: At least one of [{required}] must be specified"
            raise InvalidArgumentError(msg)
