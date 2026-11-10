import { Component, OnInit, inject } from '@angular/core';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-compatible-dialog',
  imports: [NzButtonModule, NzTagModule, CommonModule, TranslateModule],
  templateUrl: './compatible-dialog.component.html',
  styleUrl: './compatible-dialog.component.scss'
})
export class CompatibleDialogComponent {

  readonly modal = inject(NzModalRef);
  readonly data: { libCompatibility: string[]; boardCore: string } = inject(NZ_MODAL_DATA);

  get libCompatibility(): string[] {
    return this.data.libCompatibility;
  }

  get boardCore(): string {
    return this.data.boardCore;
  }

  constructor(
  ) {
  }

  ngOnInit(): void {
  }

  cancel(): void {
    this.modal.close({ result: 'cancel' });
  }

  continue(): void {
    this.modal.close({ result: 'continue' });
  }
}
