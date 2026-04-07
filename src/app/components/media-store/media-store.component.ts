import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { MediaItem } from '../../models/data.models';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

@Component({
  selector: 'app-media-store',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-store.component.html',
  styleUrls: ['./media-store.component.css']
})
export class MediaStoreComponent implements OnInit {
  private dataService = inject(DataService);

  @Output() select = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  mediaList: MediaItem[] = [];
  loading = false;
  uploading = false;
  viewMode: 'grid' | 'list' = 'grid';
  
  // Filters
  searchQuery = '';
  orderBy: 'DESC' | 'ASC' = 'DESC';
  currentPage = 1;
  pageSize = 24;
  totalItems = 0;

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.loadMedia();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.mediaList = []; // Xóa danh sách cũ khi search mới
      this.loadMedia();
    });
  }

  loadMedia() {
    if (this.loading || (this.totalItems > 0 && this.mediaList.length >= this.totalItems)) return;

    this.loading = true;
    this.dataService.getMedia(this.currentPage, this.pageSize, this.searchQuery, this.orderBy)
      .pipe(finalize(() => this.loading = false))
      .subscribe(res => {
        if (this.currentPage === 1) {
          this.mediaList = res.media;
        } else {
          this.mediaList = [...this.mediaList, ...res.media];
        }
        this.totalItems = res.total;
      });
  }

  onScroll(event: any) {
    const target = event.target;
    const threshold = 100; // Cách đáy 100px thì load thêm
    const position = target.scrollTop + target.offsetHeight;
    const height = target.scrollHeight;

    if (position > height - threshold && !this.loading) {
      if (this.mediaList.length < this.totalItems) {
        this.currentPage++;
        this.loadMedia();
      }
    }
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  onOrderChange(event: any) {
    this.orderBy = event.target.value;
    this.currentPage = 1;
    this.mediaList = [];
    this.loadMedia();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploading = true;
    this.dataService.uploadMedia(file)
      .pipe(finalize(() => {
        this.uploading = false;
        event.target.value = '';
      }))
      .subscribe(() => {
        this.currentPage = 1;
        this.mediaList = [];
        this.loadMedia();
      });
  }

  selectImage(url: string) {
    this.select.emit(url);
  }

  closeModal() {
    this.close.emit();
  }
}
