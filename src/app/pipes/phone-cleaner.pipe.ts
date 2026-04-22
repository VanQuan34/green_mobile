import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneCleaner',
  standalone: true
})
export class PhoneCleanerPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '';
    // Xóa hậu tố _ex_... nếu có
    return value.split('_ex_')[0];
  }
}
