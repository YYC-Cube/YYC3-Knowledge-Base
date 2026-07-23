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
from typing import Optional, TypeVar

T = TypeVar("T", bound="CollectionSpecification")


class CollectionSpecification:
    """Represents a collection specification for private registry.

    Args:
        target: Collection to create.  Format: org/[team/]name.
        display_name: Human-readable name for the collection.
        label_set: Name of the label set for the collection to declare.
        label: Label for the collection to declare.
        logo: A link to the logo for the collection.
        overview_filename: A markdown file with an overview of the collection.
        built_by: Name of the owner of this collection.
        publisher: The publishing organization.
        short_desc: A brief description of the collection.
        category: Field for describing the collection's use case.
    """

    def __init__(
        self,
        target: Optional[str] = None,
        display_name: Optional[str] = None,
        label_set: Optional[str] = None,
        label: Optional[str] = None,
        logo: Optional[str] = None,
        overview_filename: Optional[list[str]] = None,
        built_by: Optional[int] = None,
        publisher: Optional[dict] = None,
        short_desc: Optional[str] = None,
        category: Optional[str] = None,
    ):
        """Matches the deployment specification object."""  # noqa: D401
        self.target = target
        self.display_name = display_name
        self.label_set = label_set
        self.label = label
        self.logo = logo
        self.overview_filename = overview_filename
        self.built_by = built_by
        self.publisher = publisher
        self.short_desc = short_desc
        self.category = category
