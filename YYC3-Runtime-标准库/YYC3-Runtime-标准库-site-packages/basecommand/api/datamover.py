#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from dataclasses import asdict, dataclass, field
from datetime import datetime
import json
import posixpath
from typing import List

from dateutil import parser as date_parser

try:
    from enum import StrEnum
except ImportError:
    # pragma: no cover
    from enum import Enum

    class StrEnum(str, Enum):  # noqa: D101  # pylint: disable=function-redefined
        pass


PAGE_SIZE = 100


class JobType(StrEnum):  # noqa: D101
    COPY = "copy"
    SYNC = "sync"


class ObjectProtocol(StrEnum):  # noqa: D101
    S3 = "s3"
    OCI_PREAUTH = "ocipreauth"
    AZUREBLOB = "azureblob"


class StorageLocationType(StrEnum):  # noqa: D101
    CEPHFS = "cephfs"
    DDN = "ddn"
    S3 = "s3"
    LOCAL = "local"
    OCIPREAUTH = "ocipreauth"
    AZUREBLOB = "azureblob"


class JobState(StrEnum):  # noqa: D101
    NOT_STARTED = "not started"
    STARTED = "started"
    FINISHED = "finished"
    FINISHED_WITH_ERRORS = "finished with errors"


FINAL_JOB_STATES = {JobState.FINISHED, JobState.FINISHED_WITH_ERRORS}


class BcpJobType(StrEnum):  # noqa: D101
    IMPORT = "import"
    EXPORT = "export"


class BcpResourceType(StrEnum):  # noqa: D101
    DATASET = "dataset"
    RESULTSET = "resultset"
    WORKSPACE = "workspace"


class BcpCopyType(StrEnum):  # noqa: D101
    IMPORT = "import"
    EXPORT = "export"
    ACE2ACE = "ace_to_ace"


class BcpCopyActionType(StrEnum):  # noqa: D101
    CREATE = "create_bcp_job"
    FINISH = "finish"


@dataclass
class BcpJob:  # noqa: D101
    job_id: str = None
    origin_resource_type: str = None
    origin_resource_id: str = None
    tmp_resource_type: BcpResourceType = None
    tmp_resource_id: str = None
    destination_resource_type: BcpResourceType = None
    destination_resource_id: str = None

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {
                "job_id",
                "origin_resource_type",
                "origin_resource_id",
                "tmp_resource_type",
                "tmp_resource_id",
                "destination_resource_type",
                "destination_resource_id",
            }:
                # With this we're protecting against future new fields in the BcpJob response, as we're only parsing the
                # ones we know about. Future versions of the CLI will add whatever new fields they care about.
                kwargs[k] = v
        return BcpJob(**kwargs)


@dataclass
class JobSettingsCephFS:  # noqa: D101
    endpoint: []
    path: []

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {
                "endpoint",
                "path",
            }:
                # With this we're protecting against future new fields in the JobSettingsCephFS response, as we're
                # only parsing the ones we know about. Future versions of the CLI will add whatever new fields they care
                # about.
                kwargs[k] = v
        return JobSettingsCephFS(**kwargs)


@dataclass
class JobSettingsDDN:  # noqa: D101
    endpoint: []
    filesystem: str
    path: []

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {
                "endpoint",
                "filesystem",
                "path",
            }:
                # With this we're protecting against future new fields in the JobSettingsDDN response, as we're
                # only parsing the ones we know about. Future versions of the CLI will add whatever new fields they care
                # about.
                kwargs[k] = v
        return JobSettingsDDN(**kwargs)


@dataclass
class JobSettingsLocal:  # noqa: D101
    path: []

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {
                "path",
            }:
                # With this we're protecting against future new fields in the JobSettingsLocal response, as we're
                # only parsing the ones we know about. Future versions of the CLI will add whatever new fields they care
                # about.
                kwargs[k] = v
        return JobSettingsLocal(**kwargs)


@dataclass
class JobSettingsOciPreauth:  # noqa: D101
    prefix: [] = field(default_factory=list)

    def __str__(self):  # noqa: D105
        prefixes = [p.removeprefix("/") for p in self.prefix if p.removeprefix("/")]
        ret = "OCI PreAuth URL"
        if prefixes:
            ret += f":{','.join(prefixes)}"
        return ret

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {
                "prefix",
            }:
                # With this we're protecting against future new fields in the JobSettingsOciPreauth response, as we're
                # only parsing the ones we know about. Future versions of the CLI will add whatever new fields they care
                # about.
                kwargs[k] = v
        return JobSettingsOciPreauth(**kwargs)


@dataclass
class JobSettingsS3:  # noqa: D101
    endpoint: str
    bucket: str
    prefix: [] = field(default_factory=list)
    region: str = None

    def __str__(self):  # noqa: D105
        prefixes = [p.removeprefix("/") for p in self.prefix if p.removeprefix("/")]
        path = "/".join([self.endpoint, self.bucket, ",".join(prefixes)])
        return f"s3:{path}"

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {
                "endpoint",
                "bucket",
                "prefix",
                "region",
            }:
                # With this we're protecting against future new fields in the JobSettingsS3 response, as we're
                # only parsing the ones we know about. Future versions of the CLI will add whatever new fields they care
                # about.
                kwargs[k] = v
        return JobSettingsS3(**kwargs)


@dataclass
class JobSettingsAzureBlob:  # noqa: D101
    account_name: str
    container: str
    service_url: str = None
    prefix: [] = field(default_factory=list)

    def __str__(self):  # noqa: D105
        prefixes = [p.removeprefix("/") for p in self.prefix if p.removeprefix("/")]
        path = "/".join([self.account_name, self.container, ",".join(prefixes)])
        return f"azb:{path}"

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {
                "account_name",
                "container",
                "service_url",
                "prefix",
            }:
                # With this we're protecting against future new fields in the JobSettingsAzureBlob response, as we're
                # only parsing the ones we know about. Future versions of the CLI will add whatever new fields they care
                # about.
                kwargs[k] = v
        return JobSettingsAzureBlob(**kwargs)


@dataclass
class DataMoverTeam:  # noqa: D101
    id: str
    name: str
    individual: bool

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {
                "id",
                "name",
                "individual",
            }:
                # With this we're protecting against future new fields in the DataMoverTeam response, as we're only
                # parsing the ones we know about. Future versions of the CLI will add whatever new fields they care
                # about.
                kwargs[k] = v
        return DataMoverTeam(**kwargs)


@dataclass
class DataMoverBcpCopyAction:  # noqa: D101
    type: BcpCopyActionType
    job_index: int

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = data
        for k, v in kwargs.items():
            if k == "type":
                kwargs[k] = BcpCopyActionType(v)
        return DataMoverBcpCopyAction(**kwargs)


@dataclass
class DataMoverJob:  # noqa: D101
    id: str
    type: JobType
    origin: object
    destination: object
    state: JobState
    team: DataMoverTeam
    copy_start_time: datetime = None
    copy_end_time: datetime = None
    bytes_copied: int = None
    bytes_found: int = None
    files_copied: int = None
    files_found: int = None
    files_skipped: int = None
    directories_found: int = None
    directories_enumerated: int = None
    errors: int = None
    directory_errors: int = None
    jobs_queue_url: str = None
    metrics_queue_url: str = None
    bcp_job: BcpJob = None

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k in {"origin", "destination"}:
                parser = MAP_TO_JOB_SETTINGS_CLASSES[v["type"]]
                del v["type"]
                kwargs[k] = parser.from_dict(v)
            elif k == "team":
                kwargs[k] = DataMoverTeam.from_dict(v)
            elif k == "bcp_job" and v is not None:
                kwargs[k] = BcpJob.from_dict(v)
            elif k in {"copy_start_time", "copy_end_time"}:
                kwargs[k] = date_parser.isoparse(v) if v else None
            elif k == "state":
                kwargs[k] = JobState(v)
            elif k == "type":
                kwargs[k] = JobType(v)
            elif k in {
                "id",
                "bytes_copied",
                "bytes_found",
                "files_copied",
                "files_found",
                "files_skipped",
                "directories_found",
                "directories_enumerated",
                "errors",
                "directory_errors",
                "jobs_queue_url",
                "metrics_queue_url",
            }:
                # With this we're protecting against future new fields in the Job response, as we're only parsing the
                # ones we know about. Future versions of the CLI will add whatever new fields they care about.
                kwargs[k] = v
        return DataMoverJob(**kwargs)

    @staticmethod
    def collection_from_dicts(jobs):  # noqa: D102
        return [DataMoverJob.from_dict(j) for j in jobs]

    @property
    def job_type(self):  # noqa: D102
        if isinstance(self.origin, JobSettingsLocal):
            return BcpJobType.EXPORT
        if isinstance(self.destination, JobSettingsLocal):
            return BcpJobType.IMPORT
        raise RuntimeError("Unexpected data mover job type")


MAP_TO_JOB_SETTINGS_CLASSES = {
    StorageLocationType.CEPHFS: JobSettingsCephFS,
    StorageLocationType.DDN: JobSettingsDDN,
    StorageLocationType.LOCAL: JobSettingsLocal,
    StorageLocationType.OCIPREAUTH: JobSettingsOciPreauth,
    StorageLocationType.S3: JobSettingsS3,
    StorageLocationType.AZUREBLOB: JobSettingsAzureBlob,
}


@dataclass
class DataMoverMultiStageJob:  # noqa: D101
    state: JobState = None
    team: DataMoverTeam = None
    jobs: List[DataMoverJob] = None
    id: str = None
    total_stage_count: int = None
    current_stage_count: int = None
    current_job_index: int = None

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k == "team":
                kwargs[k] = DataMoverTeam.from_dict(v)
            if k == "jobs":
                kwargs[k] = DataMoverJob.collection_from_dicts(v)
            elif k == "state":
                kwargs[k] = JobState(v)
            elif k in {
                "id",
                "total_stage_count",
                "current_stage_count",
                "current_job_index",
            }:
                # With this we're protecting against future new fields in the MultiStageJob response, as we're only
                # parsing the ones we know about. Future versions of the CLI will add whatever new fields they care
                # about.
                kwargs[k] = v

        return DataMoverMultiStageJob(**kwargs)

    @staticmethod
    def collection_from_dicts(jobs):  # noqa: D102
        return [DataMoverMultiStageJob.from_dict(j) for j in jobs]


@dataclass
class DataMoverBcpCopy:  # noqa: D101
    resource_type: BcpResourceType
    protocol: ObjectProtocol
    bcp_copy_type: BcpCopyType
    team: DataMoverTeam
    multi_stage_job: DataMoverMultiStageJob
    prefix: str = None
    bucket: str = None
    action: DataMoverBcpCopyAction = None
    resource_id: str = None
    bcp_org: str = None
    bcp_team: str = None
    origin_ace: str = None
    origin_instance: str = None
    destination_ace: str = None
    destination_instance: str = None
    secret: str = None
    endpoint: str = None
    region: str = None
    account_name: str = None
    container: str = None
    service_url: str = None
    id: str = None

    @staticmethod
    def from_dict(data):  # noqa: D102
        kwargs = {}
        for k, v in data.items():
            if k == "resource_type":
                kwargs[k] = BcpResourceType(v)
            elif k == "protocol":
                kwargs[k] = ObjectProtocol(v)
            elif k == "bcp_copy_type":
                kwargs[k] = BcpCopyType(v)
            elif k == "action" and v is not None:
                kwargs[k] = DataMoverBcpCopyAction(**v)
            elif k == "multi_stage_job" and v is not None:
                kwargs[k] = DataMoverMultiStageJob.from_dict(v)
            elif k == "team":
                kwargs[k] = DataMoverTeam.from_dict(v)
            elif k in {
                "prefix",
                "bucket",
                "resource_id",
                "bcp_org",
                "bcp_team",
                "origin_ace",
                "origin_instance",
                "destination_ace",
                "destination_instance",
                "secret",
                "endpoint",
                "region",
                "account_name",
                "container",
                "service_url",
                "id",
            }:
                # With this we're protecting against future new fields in the BCP Copy response, as we're only parsing
                # the ones we know about. Future versions of the CLI will add whatever new fields they care about.
                kwargs[k] = v

        return DataMoverBcpCopy(**kwargs)

    @staticmethod
    def collection_from_dicts(jobs):  # noqa: D102
        return [DataMoverBcpCopy.from_dict(j) for j in jobs]


class DataMoverAPI:  # noqa: D101
    endpoint_version = "v1"

    def __init__(self, api_client, connection):
        self.client = api_client
        self.connection = connection

    @staticmethod
    def _get_base_jobs_endpoint():
        """Create the base jobs URL: `/v1/jobs`"""  # noqa: D415
        parts = [DataMoverAPI.endpoint_version, "jobs"]
        return posixpath.join(*parts)

    @staticmethod
    def _get_job_endpoint(job_id):
        """Create the URL for a single job: `/v1/jobs/<job_id>`"""  # noqa: D415
        parts = [DataMoverAPI._get_base_jobs_endpoint(), job_id]
        return posixpath.join(*parts)

    @staticmethod
    def _get_base_bcpcopies_endpoint():
        """Create the base jobs URL: `/v1/bcp-copies`"""  # noqa: D415
        parts = [DataMoverAPI.endpoint_version, "bcp-copies"]
        return posixpath.join(*parts)

    @staticmethod
    def _get_base_bcpcopies_batch_endpoint():
        """Create the base jobs URL: `/v1/bcp-copies/batch`"""  # noqa: D415
        parts = [DataMoverAPI._get_base_bcpcopies_endpoint(), "batch"]
        return posixpath.join(*parts)

    @staticmethod
    def _construct_job_list_params(job_type=None, complete=None):
        params = {}
        if job_type is not None:
            if job_type not in ("import", "export"):
                raise RuntimeError("Invalid data movement job type")
            params["bcp_job_type"] = job_type
        if complete is not None:
            params["completed_bcp_import"] = complete
        return params

    def list_jobs(self, org_name, team_name=None, job_type=None, complete=None, page_size=PAGE_SIZE):  # noqa: D102
        endpoint = self._get_base_jobs_endpoint()
        params = self._construct_job_list_params(job_type, complete)
        operation_name = "list data mover jobs"
        response = self._pagination_helper(endpoint, org_name, team_name, operation_name, page_size, params)
        for page in response:
            yield DataMoverJob.collection_from_dicts(page)

    def get_job(self, job_id, org_name, team_name=None, bcp_job=False):  # noqa: D102
        endpoint = self._get_job_endpoint(job_id)
        response = self.connection.make_api_request(
            "GET",
            endpoint,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="get data mover job",
            params={"bcp_job": bcp_job},
        )
        return DataMoverJob.from_dict(response)

    def create_job(  # noqa: D102
        self,
        origin,
        destination,
        org_name,
        team_name=None,
        type=JobType.COPY,  # pylint: disable=redefined-builtin
        generate_manifest=False,
    ):
        endpoint = self._get_base_jobs_endpoint()
        response = self.connection.make_api_request(
            "POST",
            endpoint,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="create data mover job",
            payload=json.dumps(
                {"type": type, "origin": origin, "destination": destination, "generate_manifest": generate_manifest}
            ),
        )
        return DataMoverJob.from_dict(response)

    def update_job(self, job, org_name, team_name=None):  # noqa: D102
        endpoint = self._get_job_endpoint(job.id)
        response = self.connection.make_api_request(
            "PUT",
            endpoint,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="update data mover job",
            payload=json.dumps({"bcp_job": asdict(job.bcp_job)}),
        )
        return DataMoverJob.from_dict(response)

    def delete_job(self, job_id, org_name, team_name=None, force=False):  # noqa: D102
        endpoint = self._get_job_endpoint(job_id)
        self.connection.make_api_request(
            "DELETE",
            endpoint,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="delete data mover job",
            params={"force": force},
        )

    @classmethod
    def _get_bcpcopies_payload(self, org_name, team_name, resources, args):

        # initial required args
        payload = {
            "bcp_org": org_name,
            "resource_type": args.resource_type,
            "secret": args.secret,
            "protocol": args.protocol,
        }

        if team_name:
            payload["bcp_team"] = team_name

        if args.origin_ace:
            payload["origin_ace"] = args.origin_ace
            payload["origin_instance"] = args.origin_instance

        if args.destination_ace:
            payload["destination_ace"] = args.destination_ace
            payload["destination_instance"] = args.destination_instance

        if args.endpoint and args.protocol == ObjectProtocol.S3:
            payload["endpoint"] = args.endpoint

        if args.buckets and args.protocol == ObjectProtocol.S3:
            payload["buckets"] = args.buckets

        if args.prefixes:
            payload["prefixes"] = args.prefixes

        if args.region and args.protocol == ObjectProtocol.S3:
            payload["region"] = args.region

        if args.account_name and args.protocol == ObjectProtocol.AZUREBLOB:
            payload["account_name"] = args.account_name

        if args.containers and args.protocol == ObjectProtocol.AZUREBLOB:
            payload["containers"] = args.containers

        if args.service_url and args.protocol == ObjectProtocol.AZUREBLOB:
            payload["service_url"] = args.service_url

        if resources:
            payload["resource_ids"] = resources

        if hasattr(args, "generate_manifest"):
            payload["generate_manifest"] = args.generate_manifest

        return json.dumps(payload, sort_keys=True)

    def create_bcpcopies(self, org_name, team_name, resources, args):  # noqa: D102

        endpoint = self._get_base_bcpcopies_batch_endpoint()
        _payload = self._get_bcpcopies_payload(org_name, team_name, resources, args)

        return self.connection.make_api_request(
            "POST",
            endpoint,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="create data mover bcp batch job",
            payload=_payload,
        )

    def get_bcpcopies(self, org_name, team_name, page_size=PAGE_SIZE, pending_action=False):  # noqa: D102

        endpoint = self._get_base_bcpcopies_endpoint()

        params = {"pending_action": pending_action}
        operation_name = "list data mover bcp copies"

        response = self._pagination_helper(endpoint, org_name, team_name, operation_name, page_size, params)
        for page in response:
            yield DataMoverBcpCopy.collection_from_dicts(page)

    def _pagination_helper(self, endpoint, org_name, team_name, operation_name, page_size=PAGE_SIZE, params=None):

        if not params:
            params = {}

        current_offset = 0
        params["limit"] = page_size
        while True:
            params["offset"] = current_offset
            response = self.connection.make_api_request(
                "GET",
                endpoint,
                auth_org=org_name,
                auth_team=team_name,
                params=params,
                operation_name=operation_name,
            )
            yield response
            current_offset = current_offset + page_size
            if len(response) < page_size:
                break
