from forge.api.allocation import AllocationAPI, GuestAllocationAPI
from forge.api.constraint import ConstraintAPI, GuestConstraintAPI
from forge.api.infiniband import GuestInfiniBandPartitionAPI, InfiniBandPartitionAPI
from forge.api.instance import GuestInstanceAPI, InstanceAPI
from forge.api.instance_type import GuestInstanceTypeAPI, InstanceTypeAPI
from forge.api.ipblock import GuestIpblockAPI, IpblockAPI
from forge.api.machine import GuestMachineAPI, MachineAPI
from forge.api.operating_system import GuestOperatingSystemAPI, OperatingSystemAPI
from forge.api.provider import GuestProviderAPI, ProviderAPI
from forge.api.rule import GuestRuleAPI, RuleAPI
from forge.api.security_group import GuestSecurityGroupAPI, SecurityGroupAPI
from forge.api.site import GuestSiteAPI, SiteAPI
from forge.api.ssh_key import GuestSSHKeyAPI, SSHKeyAPI
from forge.api.ssh_key_group import GuestSSHKeyGroupAPI, SSHKeyGroupAPI
from forge.api.subnet import GuestSubnetAPI, SubnetAPI
from forge.api.tenant import GuestTenantAPI, TenantAPI
from forge.api.tenant_account import GuestTenantAccountAPI, TenantAccountAPI
from forge.api.user import GuestUserAPI, UserAPI
from forge.api.vpc import GuestVpcAPI, VpcAPI
from forge.api.vpc_prefix import GuestVpcPrefixAPI, VpcPrefixAPI


class ForgeAPI:  # noqa: D101
    def __init__(self, api_client):
        self.client = api_client

    @property
    def provider(self):  # noqa: D102
        if self.client.config.app_key:
            return ProviderAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestProviderAPI(api_client=self.client)

    @property
    def tenant(self):  # noqa: D102
        if self.client.config.app_key:
            return TenantAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestTenantAPI(api_client=self.client)

    @property
    def tenant_account(self):  # noqa: D102
        if self.client.config.app_key:
            return TenantAccountAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestTenantAccountAPI(api_client=self.client)

    @property
    def site(self):  # noqa: D102
        if self.client.config.app_key:
            return SiteAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestSiteAPI(api_client=self.client)

    @property
    def allocation(self):  # noqa: D102
        if self.client.config.app_key:
            return AllocationAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestAllocationAPI(api_client=self.client)

    @property
    def constraint(self):  # noqa: D102
        if self.client.config.app_key:
            return ConstraintAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestConstraintAPI(api_client=self.client)

    @property
    def ipblock(self):  # noqa: D102
        if self.client.config.app_key:
            return IpblockAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestIpblockAPI(api_client=self.client)

    @property
    def vpc(self):  # noqa: D102
        if self.client.config.app_key:
            return VpcAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestVpcAPI(api_client=self.client)

    @property
    def vpc_prefix(self):  # noqa: D102
        if self.client.config.app_key:
            return VpcPrefixAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestVpcPrefixAPI(api_client=self.client)

    @property
    def subnet(self):  # noqa: D102
        if self.client.config.app_key:
            return SubnetAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestSubnetAPI(api_client=self.client)

    @property
    def instance(self):  # noqa: D102
        if self.client.config.app_key:
            return InstanceAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestInstanceAPI(api_client=self.client)

    @property
    def instance_type(self):  # noqa: D102
        if self.client.config.app_key:
            return InstanceTypeAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestInstanceTypeAPI(api_client=self.client)

    @property
    def machine(self):  # noqa: D102
        if self.client.config.app_key:
            return MachineAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestMachineAPI(api_client=self.client)

    @property
    def operating_system(self):  # noqa: D102
        if self.client.config.app_key:
            return OperatingSystemAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestOperatingSystemAPI(api_client=self.client)

    @property
    def rule(self):  # noqa: D102
        if self.client.config.app_key:
            return RuleAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestRuleAPI(api_client=self.client)

    @property
    def user(self):  # noqa: D102
        if self.client.config.app_key:
            return UserAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestUserAPI(api_client=self.client)

    @property
    def security_group(self):  # noqa: D102
        if self.client.config.app_key:
            return SecurityGroupAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestSecurityGroupAPI(api_client=self.client)

    @property
    def ssh_key(self):  # noqa: D102
        if self.client.config.app_key:
            return SSHKeyAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestSSHKeyAPI(api_client=self.client)

    @property
    def ssh_key_group(self):  # noqa: D102
        if self.client.config.app_key:
            return SSHKeyGroupAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestSSHKeyGroupAPI(api_client=self.client)

    @property
    def infiniband_partition(self):  # noqa: D102
        if self.client.config.app_key:
            return InfiniBandPartitionAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestInfiniBandPartitionAPI(api_client=self.client)
