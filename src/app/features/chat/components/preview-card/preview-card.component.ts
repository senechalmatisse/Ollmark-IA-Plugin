import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { PreviewStatus } from '../../../../core/models';

@Component({
  selector: 'app-preview-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preview-card.component.html',
  styleUrls: ['./preview-card.component.scss'],
})
export class PreviewCardComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) pngDataUrl!: string;
  @Input() status: PreviewStatus = 'pending';
  @Input() hasImage = true;
  @Input() isAiLoading = false;
  @Output() accepted = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<void>();

  @ViewChild('viewport') private readonly _viewport!: ElementRef<HTMLDivElement>;
  @ViewChild('content') private readonly _content!: ElementRef<HTMLDivElement>;

  private readonly _cdr = inject(ChangeDetectorRef);

  finalImageUrl = '';
  isProcessing = false;

  private _scale = 1;
  private _tx = 0;
  private _ty = 0;
  private _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _dragStartTx = 0;
  private _dragStartTy = 0;
  private _fitted = false;

  /** Status explicitement 'accepted' */
  get isAccepted(): boolean {
    return this.status === 'accepted';
  }

  /** Status explicitement 'rejected' */
  get isRejected(): boolean {
    return this.status === 'rejected';
  }

  /**
   * Pending = tout ce qui n'est pas explicitement accepted/rejected.
   * Couvre : 'pending', undefined, null, valeur inattendue.
   */
  get isPending(): boolean {
    return !this.isAccepted && !this.isRejected;
  }

  get isLoading(): boolean {
    return this.isPending && !this.finalImageUrl;
  }

  get showImage(): boolean {
    return !!this.finalImageUrl;
  }

  onAccept(): void {
    if (this.isPending && !this.isProcessing) {
      this.isProcessing = true;
      this._cdr.markForCheck();
      this.accepted.emit();
    }
  }

  onReject(): void {
    if (this.isPending && !this.isProcessing) {
      this.isProcessing = true;
      this._cdr.markForCheck();
      this.rejected.emit();
    }
  }

  ngAfterViewInit(): void {
    if (this.pngDataUrl) {
      this._processImage(this.pngDataUrl);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pngDataUrl'] && this.pngDataUrl) {
      this._fitted = false;
      this._processImage(this.pngDataUrl);
    }
    if (changes['status']) {
      // Reset processing quand le status change (accept/reject confirmé par le plugin)
      if (this.isAccepted || this.isRejected) {
        this.isProcessing = false;
        this._cdr.markForCheck();
      }
    }
  }

  private _processImage(dataUrl: string): void {
    if (!dataUrl) return;

    if (dataUrl.startsWith('data:image/svg+xml')) {
      this._svgToPng(dataUrl)
        .then((pngUrl) => {
          this.finalImageUrl = pngUrl;
          this._cdr.markForCheck();
          setTimeout(() => this._scheduleFit(), 50);
        })
        .catch(() => {
          this.finalImageUrl = dataUrl;
          this._cdr.markForCheck();
          setTimeout(() => this._scheduleFit(), 50);
        });
    } else if (dataUrl.startsWith('data:image/png') || dataUrl.length > 0) {
      this.finalImageUrl = dataUrl;
      this._cdr.markForCheck();
      setTimeout(() => this._scheduleFit(), 50);
    }
  }

  private _svgToPng(svgDataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = Math.max(img.naturalWidth || img.width, 400);
          const h = Math.max(img.naturalHeight || img.height, 300);

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No canvas 2d context'));
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = svgDataUrl;
    });
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const vp = this._viewport?.nativeElement;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(10, Math.max(0.05, this._scale * factor));
    const ratio = newScale / this._scale;
    this._tx = mx - ratio * (mx - this._tx);
    this._ty = my - ratio * (my - this._ty);
    this._scale = newScale;
    this._applyTransform();
  }

  onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    this._isDragging = true;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._dragStartTx = this._tx;
    this._dragStartTy = this._ty;
  }

  onMouseMove(e: MouseEvent): void {
    if (!this._isDragging) return;
    e.preventDefault();
    this._tx = this._dragStartTx + (e.clientX - this._dragStartX);
    this._ty = this._dragStartTy + (e.clientY - this._dragStartY);
    this._applyTransform();
  }

  onMouseUp(): void {
    this._isDragging = false;
  }

  onDblClick(): void {
    this._fitted = false;
    this._scheduleFit();
  }

  private _scheduleFit(): void {
    if (this._fitted) return;
    const tryFit = (attempt: number): void => {
      const vp = this._viewport?.nativeElement;
      const ct = this._content?.nativeElement;
      if (!vp || !ct) {
        if (attempt < 15) setTimeout(() => tryFit(attempt + 1), 100);
        return;
      }
      const img = ct.querySelector<HTMLImageElement>('img');
      if (!img) {
        if (attempt < 15) setTimeout(() => tryFit(attempt + 1), 100);
        return;
      }
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        this._doFit(vp, img);
      } else {
        img.addEventListener('load', () => this._doFit(vp, img), { once: true });
        if (attempt < 15) setTimeout(() => tryFit(attempt + 1), 200);
      }
    };
    tryFit(0);
  }

  private _doFit(vp: HTMLElement, img: HTMLImageElement): void {
    if (this._fitted) return;
    this._fitted = true;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (iw === 0 || ih === 0) return;
    this._scale = Math.min(vw / iw, vh / ih);
    this._tx = (vw - iw * this._scale) / 2;
    this._ty = (vh - ih * this._scale) / 2;
    this._applyTransform();
  }

  private _applyTransform(): void {
    const ct = this._content?.nativeElement;
    if (!ct) return;
    ct.style.transform = `translate(${this._tx}px, ${this._ty}px) scale(${this._scale})`;
  }
}
