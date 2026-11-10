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


import logging
import os
import re

import ngcpygo
from ngcpygo import ExecAttachArgs, NoGoException, NotFoundException

from ngcbase.constants import STAGING_ENV
from ngcbase.errors import NgcException, ResourceNotFoundException
from ngcbase.util.utils import get_environ_tag, url_encode
from ngccli import cacerts

logger = logging.getLogger(__name__)
CACERT_PATH = os.path.join(os.path.dirname(os.path.abspath(cacerts.__file__)), "cacerts.pem")


class KubeWrapper:
    """Wrapper for docker container commands."""

    def __init__(self, api_client, org_name, team_name, job_id, proxy_ip, container_id, replica_id):
        self.client = api_client
        self.ea_args = ExecAttachArgs(
            jobId=str(job_id or "").encode("utf-8"),
            org=str(org_name or "").encode("utf-8"),
            containerId=str(container_id or "").encode("utf-8"),
            taskId=str(replica_id if replica_id is not None else "").encode("utf-8"),
            caCertPath=CACERT_PATH.encode("utf-8"),
            tlsVerify=False if (get_environ_tag() <= STAGING_ENV) else "",
        )
        self.job_id = job_id
        self.org_name = org_name
        self.team_name = team_name
        self.proxy_ip = proxy_ip

    def _exec_attach(self):
        token = self.client.authentication.get_token(org=self.org_name, team=self.team_name, renew=True)
        self.ea_args.token = token.encode("utf-8")
        try:
            ngcpygo.exec_attach(self.ea_args)
        except NotFoundException as e:
            logger.debug("%s", str(e))
            raise ResourceNotFoundException(e) from None
        except NoGoException as e:
            err = str(e)
            if "exit code" in err:
                logger.debug("Interactive exec performed.\nExit msg: %s", err)
                ec = next(iter(re.findall(r"%s(\d+)" % "exit code ", err)), None)
                return int(ec) if ec else None
            raise NgcException(e) from None
        return None

    def attach(self):  # noqa: D102
        req = (
            f"https://{self.proxy_ip}/ngc/v1/jobs/{self.job_id}/attach?container={self.job_id}&stdout=true&stderr=true"
        )
        self.ea_args.req = req.encode("utf-8")
        logger.debug(self.ea_args.req)
        logger.debug(self.ea_args.taskId)
        self.ea_args.action = "attach".encode("utf-8")
        self._exec_attach()

    def exec_(self, command):  # noqa: D102
        command = f"command={url_encode('sh')}&command={url_encode('-c')}&command={url_encode(command)}"
        req = (
            f"https://{self.proxy_ip}/ngc/v1/jobs/{self.job_id}/exec?container={self.job_id}&stdout=true&stderr=true"
            f"&stdin=true&tty=true&{command}"
        )
        self.ea_args.req = req.encode("utf-8")
        logger.debug(self.ea_args.req)
        logger.debug(self.ea_args.taskId)
        self.ea_args.action = "exec".encode("utf-8")
        self._exec_attach()
