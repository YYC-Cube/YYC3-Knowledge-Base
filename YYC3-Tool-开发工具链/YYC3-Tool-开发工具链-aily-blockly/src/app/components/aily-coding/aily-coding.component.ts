import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { AilyBlocklyComponent } from '../aily-blockly/aily-blockly.component';

@Component({
  selector: 'app-aily-coding',
  imports: [NgIf, NzIconDirective, AilyBlocklyComponent],
  templateUrl: './aily-coding.component.html',
  styleUrl: './aily-coding.component.scss',
})
export class AilyCodingComponent {
  @Input() data: any = {};

  protected readonly JSON = JSON;
  type: number = 1; // 0 code 1 blockly

  constructor() {}

  toggleType() {
    this.type = this.type === 0 ? 1 : 0;
  }
}
