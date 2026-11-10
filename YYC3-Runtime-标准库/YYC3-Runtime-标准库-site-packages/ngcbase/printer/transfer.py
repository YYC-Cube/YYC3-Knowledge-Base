#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from contextlib import contextmanager
import datetime
import json
import os

from ngcbase.printer.nvPrettyPrint import format_date, NVPrettyPrint
from ngcbase.util.datetime_utils import human_time
from ngcbase.util.file_utils import human_size


class TransferPrinter(NVPrettyPrint):
    """The printer is responsible for printing transfer ouput."""

    # pylint: disable=protected-access
    def print_download_final_status(  # noqa: D102
        self,
        storage_id,
        status,
        download_path,
        files_downloaded,
        downloaded_size,
        start_time,
        completion_time,
        failed_files=None,
        files_not_found=None,
    ):
        formatted_start_time = format_date(start_time)
        formatted_completion_time = format_date(completion_time)
        download_time = ""
        # TypeError and ValueError handle None and empty values incase an async call sets incorrect values.
        failed_files = failed_files or []
        files_not_found = files_not_found or []
        try:
            download_time = human_time((completion_time - start_time).seconds)
        except (TypeError, ValueError):
            download_time = None
        if self.format_type == "json":
            summary = {
                "transfer_id": storage_id,
                "status": status,
                "local_path": download_path,
                "files_downloaded": files_downloaded,
                "size_downloaded": human_size(downloaded_size),
                "download_start": formatted_start_time,
                "download_end": formatted_completion_time,
                "download_time": download_time,
                "files_not_found": files_not_found,
                "failed_files": failed_files,
            }
            self.print_data(summary)
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.add_label_line("Transfer id", storage_id)
        tbl.add_label_line("Download status", status)
        tbl.add_label_line("Downloaded local path", download_path)
        tbl.add_label_line("Total files downloaded", files_downloaded)
        tbl.add_label_line("Total downloaded size", human_size(downloaded_size))
        tbl.add_label_line("Total files not found", len(files_not_found))
        tbl.add_label_line("Total failed downloads", len(failed_files))
        tbl.add_label_line("Started at", formatted_start_time)
        tbl.add_label_line("Completed at", formatted_completion_time)
        tbl.add_label_line("Duration taken", download_time)
        if files_not_found:
            tbl.add_separator_line()
            nf_tbl = self.add_sub_table(outline=True, detail_style=False)
            nf_tbl.set_min_width(24)
            nf_tbl.set_title("Files Not Found")
            for nf in files_not_found:
                nf_tbl.add_line(nf, level=1, ignore_rich_indent=True)
        if failed_files:
            tbl.add_separator_line()
            fail_tbl = self.add_sub_table(outline=True, detail_style=False)
            fail_tbl.set_min_width(24)
            fail_tbl.set_title("Files Failed to Download")
            for fail in failed_files:
                fail_tbl.add_line(fail)
                fail_tbl.add_line(fail, level=1, ignore_rich_indent=True)
        tbl.add_separator_line()
        tbl.print()

    def print_download_transfer_summary(self, mgr):  # noqa: D102
        shared_meta = mgr.transfer_coordinator.shared_meta
        if mgr._client.config.format_type == "json":
            summary = {
                "transfer_id": mgr._transfer_id,
                "status": mgr.transfer_coordinator.status,
                "local_path": os.path.realpath(mgr._transfer_path),
                "files_downloaded": shared_meta.transferred_files,
                "size_downloaded": human_size(shared_meta.transferred_size),
                "download_start": str(shared_meta.started_at),
                "download_end": str(datetime.datetime.now()),
                "download_time": human_time(shared_meta.passed_time),
            }
            if mgr.dataset_service_enabled and mgr.transfer_config.transfer_type:
                field_name = f"{mgr.transfer_config.transfer_type.lower()}_id"
                summary[field_name] = mgr.display_id
            self.print_json(summary)
        else:
            self.print_ok("")
            tbl = self.create_output()
            tbl.add_separator_line()
            if mgr.dataset_service_enabled and mgr.transfer_config.transfer_type:
                tbl.add_label_line(f"{mgr.transfer_config.transfer_type.title()} ID", mgr.display_id)
            tbl.add_label_line("Transfer id", mgr._transfer_id)
            tbl.add_label_line("Download status", mgr.transfer_coordinator.status)
            tbl.add_label_line("Downloaded local path", os.path.realpath(mgr._transfer_path))
            tbl.add_label_line("Total files downloaded", shared_meta.transferred_files)
            tbl.add_label_line("Total downloaded size", human_size(shared_meta.transferred_size))
            tbl.add_label_line("Started at", shared_meta.started_at)
            tbl.add_label_line("Completed at", datetime.datetime.now())
            tbl.add_label_line("Duration taken", human_time(shared_meta.passed_time))
            tbl.add_separator_line()
            tbl.print()

    def print_upload_transfer_summary(self, mgr, shared_meta, transfer_type, start_time, end_time):  # noqa: D102
        self.print_ok("")
        tbl = self.create_output()
        tbl.add_separator_line()
        if mgr.dataset_service_enabled:
            tbl.add_label_line(f"{transfer_type.title()} ID", mgr.display_id)
            tbl.add_label_line("Transfer ID", mgr._transfer_id)
        else:
            tbl.add_label_line(f"{transfer_type.title()} ID", mgr._transfer_id)
        tbl.add_label_line("Upload status", mgr.transfer_coordinator.status)
        tbl.add_label_line(f"Uploaded local path {transfer_type}", os.path.realpath(mgr._transfer_path))
        tbl.add_label_line("Total files uploaded", shared_meta.processed_files)
        tbl.add_label_line("Total transferred", human_size(shared_meta.transferred_size))
        tbl.add_label_line("Started at", start_time)
        tbl.add_label_line("Completed at", end_time)
        tbl.add_label_line("Duration taken", human_time(shared_meta.passed_time))
        tbl.add_separator_line()
        tbl.print()

    def print_upload_dry_run(self, transfer_size, file_count):  # noqa: D102
        if self.format_type == "json":
            print(json.dumps({"transfer_size": transfer_size, "file_count": file_count}))
            return
        print(f"Total Size: {human_size(transfer_size)}")
        print(f"Number of Files: {file_count}")

    def print_async_upload_transfer_summary(  # noqa: D102
        self,
        transfer_type,
        transfer_id,
        status,
        transfer_path,
        elapsed,
        upload_count,
        upload_size,
        started_at,
        ended_at,
        version_status=None,
    ):
        if self.format_type == "json":
            summary = {
                "transfer_id": transfer_id,
                "status": status,
                "local_path": os.path.realpath(transfer_path),
                "files_uploaded": upload_count,
                "size_uploaded": human_size(upload_size),
                "upload_start": format_date(started_at),
                "upload_end": format_date(ended_at),
                "upload_time": human_time(elapsed),
            }
            self.print_json(summary)
            return
        self.print_ok("")
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.add_label_line(f"{transfer_type.title()} ID", transfer_id)
        tbl.add_label_line("Upload status", status)
        tbl.add_label_line(f"Uploaded local path {transfer_type}", os.path.realpath(transfer_path))
        tbl.add_label_line("Total files uploaded", upload_count)
        tbl.add_label_line("Total transferred", human_size(upload_size))
        tbl.add_label_line("Started at", format_date(started_at))
        tbl.add_label_line("Completed at", format_date(ended_at))
        tbl.add_label_line("Duration taken", human_time(elapsed))
        if version_status:
            tbl.add_label_line("Version Status", version_status)
        tbl.add_separator_line()
        tbl.print()

    def print_async_download_transfer_summary(  # noqa: D102
        self,
        transfer_type,
        transfer_id,
        status,
        transfer_path,
        elapsed,
        download_count,
        download_size,
        started_at,
        ended_at,
    ):
        if self.format_type == "json":
            summary = {
                "transfer_id": transfer_id,
                "status": status,
                "local_path": os.path.realpath(transfer_path),
                "files_downloaded": download_count,
                "size_downloaded": human_size(download_size),
                "download_start": format_date(started_at),
                "download_end": format_date(ended_at),
                "download_time": human_time(elapsed),
            }
            self.print_json(summary)
            return
        self.print_ok("")
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.add_label_line(f"{transfer_type.title()} ID", transfer_id)
        tbl.add_label_line("Download status", status)
        tbl.add_label_line(f"Downloaded local path {transfer_type}", os.path.realpath(transfer_path))
        tbl.add_label_line("Total files downloaded", download_count)
        tbl.add_label_line("Total transferred", human_size(download_size))
        tbl.add_label_line("Started at", format_date(started_at))
        tbl.add_label_line("Completed at", format_date(ended_at))
        tbl.add_label_line("Duration taken", human_time(elapsed))
        tbl.add_separator_line()
        tbl.print()

    # pylint: disable=protected-access
    def print_single_file_download_status(  # noqa: D102
        self,
        status,
        download_path,
    ):
        if self.format_type == "json":
            summary = {
                "status": status,
                "local_path": download_path,
            }
            self.print_data(summary)
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.add_label_line("Download status", status)
        tbl.add_label_line("Downloaded local path", download_path)
        tbl.add_separator_line()
        tbl.print()

    @contextmanager
    def progress_task(self, description: str):
        """Context-manager that spins up a Progress bar.

        Includes adding a single task, and yields a callback you can hand to your transfer function.
        """
        bar = self.create_transfer_progress_bar()
        task_id = bar.add_task(description, start=True, total=0, completed=0)

        # Define the callback as a closure over bar & task_id
        def _cb(
            completed_bytes: int,
            _unused_failed_bytes: int,
            total_bytes: int,
            completed_count: int,
            failed_count: int,
            total_count: int,
        ):
            bar.file_column.text_format = (
                f"[blue]Total: {total_count}  Completed: {completed_count}  Failed: {failed_count}"
            )
            bar.update(task_id, total=total_bytes, completed=completed_bytes)

        try:
            # enter the rich.Progress context
            with bar:
                yield _cb
        finally:
            # any cleanup if you need it
            pass
