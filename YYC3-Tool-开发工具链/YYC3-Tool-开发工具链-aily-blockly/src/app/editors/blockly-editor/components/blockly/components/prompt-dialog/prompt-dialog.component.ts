import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { BlocklyService } from '../../../../services/blockly.service';
import * as Blockly from 'blockly';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-prompt-dialog',
  imports: [FormsModule, CommonModule, NzButtonModule, NzInputModule],
  templateUrl: './prompt-dialog.component.html',
  styleUrl: './prompt-dialog.component.scss'
})
export class PromptDialogComponent {
  @Input() title = 'Title';

  value = '';

  constructor(
    private modal: NzModalRef,
    @Inject(NZ_MODAL_DATA) public data: any,
    private blocklyService: BlocklyService,
    private message: NzMessageService
  ) {
  }

  ngOnInit(): void {
    this.title = this.data.title
  }

  onConfirm() {
    const isNameUsed = Blockly.Variables.nameUsedWithAnyType(this.value, this.blocklyService.workspace);
    const cVariableFormatRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    const isValidFormat = cVariableFormatRegex.test(this.value);
    if (!isValidFormat) {
      this.message.error('变量名格式不正确，请重新输入', { nzDuration: 3000 });
      return
    }
    if (isNameUsed) {
      console.log('Name already used');
      this.message.error('变量名已被使用，请重新输入', { nzDuration: 3000 });
      return
    }
    this.modal.triggerOk()
  }

  onClose() {
    this.modal.triggerCancel()
  }
}
