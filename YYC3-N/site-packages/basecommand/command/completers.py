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
from basecommand.constants import WORKSPACE_LIST_PAGE_SIZE
from ngcbase.command.completers import NGCCompleter

job_id_completer = None
dataset_id_completer = None
workspace_id_completer = None


# TODO make this faster
def get_job_id_completer(client):
    """Job Ids Completer."""
    global job_id_completer
    if job_id_completer is None:
        job_id_completer = NGCCompleter(
            lambda: [
                str(elem.id)
                for elem in client.basecommand.jobs.get_jobs(
                    client.config.org_name, user_id=client.users.user_who().user.id
                )
            ]
        )

    return job_id_completer


def get_dataset_id_completer(client):
    """Dataset Ids Completer."""
    global dataset_id_completer
    if dataset_id_completer is None:
        dataset_id_completer = NGCCompleter(
            lambda: [str(elem.id) for elem in client.basecommand.dataset.list_dataset(client.config.org_name)]
        )

    return dataset_id_completer


def get_workspace_id_completer(client):
    """Workspace Ids Completer."""
    global workspace_id_completer
    if workspace_id_completer is None:
        workspace_id_completer = NGCCompleter(
            lambda: [
                elem.id
                for elem in client.basecommand.workspace.list_workspace(
                    org_name=client.config.org_name,
                    team_name=client.config.team_name,
                    ace_name=client.config.ace_name,
                    exclude_shared=False,
                    page_size=WORKSPACE_LIST_PAGE_SIZE,
                )
            ]
        )

    return workspace_id_completer
