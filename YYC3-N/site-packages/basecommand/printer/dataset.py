#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import itertools

from ngcbase.printer.nvPrettyPrint import generate_columns_list, NVPrettyPrint
from ngcbase.util.file_utils import human_size


class DatasetPrinter(NVPrettyPrint):
    """The printer is responsible for printing dataset ouput."""

    def print_dataset_list(self, dataset_list, user_client_id, filter_prepopulated=False, columns=None):  # noqa: D102
        self.print_data(
            self._generate_dataset_list(
                dataset_list, user_client_id, filter_prepopulated=filter_prepopulated, columns=columns
            ),
            is_table=True,
        )

    def _generate_dataset_list(self, dataset_list, user_client_id, filter_prepopulated=False, columns=None):
        if self.format_type == "json":
            for page in dataset_list or []:
                for dataset in page or []:
                    if (filter_prepopulated and bool(dataset.prepopulated)) or (not filter_prepopulated):
                        yield dataset
        else:
            if not columns:
                columns = [
                    ("uid", "Id"),
                    ("id", "Integer Id"),
                    ("name", "Name"),
                    ("description", "Description"),
                    ("ace", "ACE"),
                    ("shared", "Shared"),
                    ("size", "Size"),
                    ("status", "Status"),
                    ("created", "Created Date"),
                    ("owned", "Owned"),
                    ("prepop", "Pre-pop"),
                ]
            yield from generate_columns_list(dataset_list, columns, user_client_id=user_client_id)

    def print_dataset_details(self, dataset, current_user_id, dataset_info_list, files):  # noqa: D102
        if self.format_type == "json":
            if not files:
                dataset.files = {}
            else:
                dataset.files = list(
                    itertools.chain(*[elem.files for elem in dataset_info_list if elem.files is not None])
                )
            self.print_data(dataset)
            return
        # Default to ASCII output
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.set_title("Dataset Information")
        self.print_dataset_info(tbl, dataset, current_user_id)
        if files:
            for i, elem in enumerate(dataset_info_list):
                self.print_dataset_files(tbl, elem, print_file_heading=bool(i == 0))
        tbl.add_separator_line()
        tbl.print()

    @staticmethod
    def print_dataset_files(tbl, dataset, print_file_heading=True):  # noqa: D102
        if dataset and dataset.files:
            if print_file_heading:
                tbl.add_label_line("Files")
            for dataset_file in dataset.files:
                tbl.add_label_line("", dataset_file.path)

    @staticmethod
    def print_dataset_info(tbl, dataset, current_user_id):  # noqa: D102
        # The "Id" field will be deprecated with the DatasetService.
        # If "Id" field does not exist, use "datasetUuid".
        if dataset.datasetUuid is not None:
            datasetId = dataset.datasetUuid
        else:
            datasetId = dataset.id

        tbl.add_label_line("Id", datasetId)
        tbl.add_label_line("Name", dataset.name)
        tbl.add_label_line("Prepopulated", dataset.prepopulated if dataset.prepopulated else "No")
        tbl.add_label_line("Created By", dataset.creator)
        tbl.add_label_line("Email", dataset.email)
        tbl.add_label_line("ACE", dataset.aceName)
        tbl.add_label_line("Size", human_size(dataset.size))
        tbl.add_label_line("Total Files", dataset.totalFiles)
        tbl.add_label_line("Status", dataset.status)
        tbl.add_label_line("Description", dataset.description)
        tbl.add_label_line("Owned", "Yes" if dataset.creatorUserId == current_user_id else "No")
        tbl.add_label_line("Shared with", "")
        if dataset.sharedWithOrg:
            tbl.add_label_line("", f"{dataset.sharedWithOrg.name} (Organization)")
        if dataset.sharedWithTeams:
            for team in sorted(dataset.sharedWithTeams, key=lambda t: t.name):
                tbl.add_label_line("", f"{team.name} (Team)")
