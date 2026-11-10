import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-cropper',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzIconModule,
    NzSliderModule,
    NzToolTipModule,
    NzUploadModule,
    FormsModule,
  ],
  templateUrl: './image-cropper.component.html',
  styleUrls: ['./image-cropper.component.scss'],
})
export class ImageCropperComponent implements OnInit {
  @Input() containerWidth = 400;
  @Input() containerHeight = 400;
  @Input() cropWidth = 200;
  @Input() cropHeight = 200;
  @Input() controls = {
    zoom: true,
    rotate: true,
  };
  @Output() croppedImage = new EventEmitter<string>();

  @ViewChild('imageElement') imageElement!: ElementRef<HTMLImageElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cropArea') cropArea!: ElementRef<HTMLDivElement>;

  selectedFile: File | null = null;
  imageUrl: string | null = null;
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;

  imagePosition = { x: 0, y: 0 };
  imageScale = 1;
  imageRotation = 0;

  constructor(private message: NzMessageService) {}

  ngOnInit(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleFileSelect(file: File): boolean {
    if (file.type.indexOf('image/') !== 0) {
      this.message.error('请选择图片文件!');
      return false;
    }

    this.selectedFile = file;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      this.imageUrl = e.target.result;
      this.imagePosition = { x: 0, y: 0 };
      this.imageScale = 1;
      this.imageRotation = 0;

      setTimeout(() => this.centerImage(), 100);
    };

    reader.readAsDataURL(file);
    return false;
  }

  startDrag(event: MouseEvent): void {
    if (!this.imageUrl) return;

    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;

    this.imagePosition.x += deltaX;
    this.imagePosition.y += deltaY;

    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
  }

  @HostListener('document:mouseup')
  stopDrag(): void {
    this.isDragging = false;
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (!this.imageUrl) return;

    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    this.adjustScale(delta);
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this.imageUrl) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.adjustScale(0.05);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.adjustScale(-0.05);
        break;
      case 'ArrowLeft':
        if (!this.controls.rotate) return;
        event.preventDefault();
        this.imageRotation = (this.imageRotation - 90) % 360;
        break;
      case 'ArrowRight':
        if (!this.controls.rotate) return;
        event.preventDefault();
        this.imageRotation = (this.imageRotation + 90) % 360;
        break;
      case 'w':
        event.preventDefault();
        this.imagePosition.y -= 10;
        break;
      case 's':
        event.preventDefault();
        this.imagePosition.y += 10;
        break;
      case 'a':
        event.preventDefault();
        this.imagePosition.x -= 10;
        break;
      case 'd':
        event.preventDefault();
        this.imagePosition.x += 10;
        break;
    }
  }

  adjustScale(delta: number): void {
    if (!this.controls.zoom) return;
    const newScale = this.imageScale + delta;
    if (newScale >= 0.1 && newScale <= 5) {
      this.imageScale = newScale;
    }
  }

  centerImage(): void {
    if (!this.imageElement?.nativeElement) return;

    const img = this.imageElement.nativeElement;
    const containerCenterX = this.containerWidth / 2;
    const containerCenterY = this.containerHeight / 2;

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // 计算初始缩放比例，使图片填满裁剪区域
    // const scaleX = this.cropWidth / imgWidth;
    // const scaleY = this.cropHeight / imgHeight;
    // this.imageScale = Math.max(scaleX, scaleY);

    this.imagePosition.x = containerCenterX - (imgWidth * this.imageScale) / 2;
    this.imagePosition.y = containerCenterY - (imgHeight * this.imageScale) / 2;
  }

  resetImage(): void {
    if (!this.imageUrl) return;
    this.imageScale = 1;
    this.imageRotation = 0;
    this.centerImage();
  }

  cropImage(): void {
    if (
      !this.imageUrl ||
      !this.imageElement?.nativeElement ||
      !this.canvas?.nativeElement
    )
      return;

    const img = this.imageElement.nativeElement;
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = this.cropWidth;
    canvas.height = this.cropHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cropAreaLeft = (this.containerWidth - this.cropWidth) / 2;
    const cropAreaTop = (this.containerHeight - this.cropHeight) / 2;

    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);

    ctx.rotate((this.imageRotation * Math.PI) / 180);

    const sourceWidth = this.cropWidth / this.imageScale;
    const sourceHeight = this.cropHeight / this.imageScale;

    // TODO 大图缩放计算裁剪还有问题 @downey
    const sourceX =
      (cropAreaLeft - this.imagePosition.x) / this.imageScale +
      (sourceWidth * (this.imageScale - 1)) / 2;
    const sourceY =
      (cropAreaTop - this.imagePosition.y) / this.imageScale +
      (sourceHeight * (this.imageScale - 1)) / 2;

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height,
    );

    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png');
    this.croppedImage.emit(dataUrl);
    this.message.success('图片裁剪成功!');
  }
}
