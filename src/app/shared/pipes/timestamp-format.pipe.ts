import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timestampFormat',
  standalone: true,
})
export class TimestampFormatPipe implements PipeTransform {
  private readonly formatter = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  transform(value: Date | string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return this.formatter.format(date);
  }
}