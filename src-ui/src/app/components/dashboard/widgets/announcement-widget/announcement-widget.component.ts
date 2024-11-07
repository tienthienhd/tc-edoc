import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewContainerRef,
  HostListener,

  Renderer2, OnInit, OnDestroy,
} from '@angular/core'
import { Folder, ChooseFolder } from '../../../../data/folder'
import { Document } from '../../../../data/document'

import { HttpClient } from '@angular/common/http'
import { FolderService } from '../../../../services/rest/folder.service'
import { DocumentService } from '../../../../services/rest/document.service'

import { DocumentListViewService } from '../../../../services/document-list-view.service'
import { ComponentWithPermissions } from '../../../with-permissions/with-permissions.component'
import { ConsumerStatusService } from '../../../../services/consumer-status.service'
import { Observable, Subscription } from 'rxjs'
import { environment } from '../../../../../environments/environment'
import { FILTER_HAS_TAGS_ALL } from '../../../../data/filter-rule-type'
import { Statistics } from '../statistics-widget/statistics-widget.component'
import { Announcement } from 'src/app/data/announcement'
import { AnnouncementsService } from '../../../../services/rest/announcement.service'


import { ConfirmDialogComponent } from '../../../common/confirm-dialog/confirm-dialog.component'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Router } from '@angular/router'
import { first } from 'rxjs'
import { Results } from 'src/app/data/results'
import { ContentType } from 'src/app/data/content-type'

@Component({
  selector: 'pngx-announcement-widget',
  templateUrl: './announcement-widget.component.html',
  styleUrls: ['./announcement-widget.component.scss'],
})
export class AnnouncementWidgetComponent
  extends ComponentWithPermissions
  implements OnInit, OnDestroy {


  public activeTab: string = 'all'
  public selectedAnnouncements: Set<number> = new Set()
  public togggleAll: boolean = false
  public expandedAnnouncement: number

  public pageSize: number = 25
  public page: number = 1


  public autoRefreshInterval: any
  public announcements: Announcement[] = [];

  // public visibleCounts: { all: number; unread: number; read: number } = { all: 5, unread: 5, read: 5 };
  public visibleCounts: { all: number } = { all: 5 };


  get dismissButtonText(): string {
    return this.selectedAnnouncements.size > 0
      ? $localize`Dismiss selected`
      : $localize`Dismiss all`
  }


  // Các danh sách được phân loại
  get readAnnouncements(): Announcement[] {
    return this.announcements.filter(announcement => announcement.is_read);
  }

  get unreadAnnouncements(): Announcement[] {
    return this.announcements.filter(announcement => !announcement.is_read);
  }

  get showMore(): boolean {
    return this.announcements.length > this.visibleCounts.all;
  }

  constructor(
    public announcementsService: AnnouncementsService,

    private modalService: NgbModal,
    private readonly router: Router
  ) {
    super()
  }

  loadMore() {
    this.visibleCounts.all += 5; // Tăng số lượng hiển thị thông báo mỗi lần nhấn nút
  }


  // Phương thức để tải thêm thông báo cho từng danh sách
  // loadMore(type: 'all' | 'unread' | 'read') {
  //   this.visibleCounts.all += 5; // Tăng số lượng hiển thị thông báo
  // }


  // Phương thức kiểm tra xem có nên hiển thị nút "Show More" hay không
  // showMoreAnnouncements(announcements: Announcement[], type: 'all' | 'unread' | 'read'): boolean {
  //   return announcements.length > this.visibleCounts[type]; // So sánh với số lượng hiện tại
  // }

  ngOnInit() {


    this.loadAnnouncements(); // Gọi phương thức để tải thông báo
    this.toggleAutoRefresh();
  }

  ngOnDestroy() {

    clearInterval(this.autoRefreshInterval)
  }



  loadAnnouncements() {
    this.announcementsService.listAll().subscribe(
      (data) => {
        this.announcements = data.results; // Lưu dữ liệu vào biến announcements
        console.log('announcements', this.announcements);

      },
      (error) => {
        console.error('Error fetching announcements', error);
      }
    );
  }


  patchAnnouncementWidget(announcement: Announcement) {
    if (announcement) {
      this.announcementsService.patchAnnouncement(announcement).pipe(first()).subscribe(
        () => {
          // Cập nhật danh sách thông báo với thông tin đã patch
          const index = this.announcements.findIndex(a => a.id === announcement.id);
          if (index !== -1) {
            // Cập nhật trường is_read trong danh sách thông báo
            this.announcements[index] = {
              ...this.announcements[index],
              is_read: true // Cập nhật trường is_read
            };
          }
        },
        (error) => {
          console.error('Error patching announcement', error);
        }
      );
    } else {
      console.warn('Announcement is not provided');
    }
  }


  navigateToDetails(announcement: Announcement) {
    this.router.navigate(['/documents', announcement.object_pk, 'details']);
  }

  // navigateToFolder(announcement: Announcement) {
  //   this.router.navigate(['/folders', announcement.object_pk,]);
  // }

  navigateToFolder(announcement: Announcement) {
    // Điều hướng đến thư mục
    this.router.navigate(['/folders', announcement.object_pk]).then(() => {
      // Reload trang sau khi điều hướng
      location.reload();
    });
  }

  handleAnnouncementClick(announcement: Announcement) {
    // Gọi hàm patch
    this.patchAnnouncementWidget(announcement);

    // Điều hướng dựa trên ctype
    if (announcement.ctype === 'document') {
      this.navigateToDetails(announcement);
    } else if (announcement.ctype === 'folder') {
      this.navigateToFolder(announcement);

    }
  }


  dismissAnnouncement(announcement: Announcement) {
    if (announcement) {
      const modal = this.modalService.open(ConfirmDialogComponent, {
        backdrop: 'static',
      });
      modal.componentInstance.title = $localize`Confirm Dismiss`;
      modal.componentInstance.messageBold = $localize`Do you really want to delete the announcement "${announcement.name}"?`;
      modal.componentInstance.btnClass = 'btn-danger';
      modal.componentInstance.btnCaption = $localize`Dismiss`;

      modal.componentInstance.confirmClicked.pipe(first()).subscribe(() => {
        modal.componentInstance.buttonsEnabled = false;
        modal.close();

        this.announcementsService.deleteAnnouncement(announcement).pipe(first()).subscribe(
          () => {
            this.announcements = this.announcements.filter(a => a.id !== announcement.id);
            this.selectedAnnouncements.delete(announcement.id); // Xóa ID khỏi danh sách đã chọn

            this.checkClearSelectionVisibility(); // Gọi hàm kiểm tra
          },
          (error) => {
            console.error('Error dismissing announcement', error);
          }
        );
      });

    } else {
      console.warn('Announcement is not selected');
    }
  }



  checkClearSelectionVisibility() {
    if (this.selectedAnnouncements.size === 0) {
      // Thực hiện logic ẩn nút ở đây nếu cần.
    }
  }



  dismissAnnouncements() {
    const tasks = this.selectedAnnouncements.size > 0
      ? Array.from(this.selectedAnnouncements)
      : this.announcements.map(a => a.id); // Lấy tất cả ID nếu không có thông báo đã chọn

    if (tasks.length > 1) {
      const modal = this.modalService.open(ConfirmDialogComponent, {
        backdrop: 'static',
      });
      modal.componentInstance.title = $localize`Confirm Dismiss All`;
      modal.componentInstance.messageBold = $localize`Dismiss all ${tasks.length} announcements?`;
      modal.componentInstance.btnClass = 'btn-warning';
      modal.componentInstance.btnCaption = $localize`Dismiss`;

      modal.componentInstance.confirmClicked.pipe(first()).subscribe(() => {
        modal.componentInstance.buttonsEnabled = false;
        modal.close();

        tasks.forEach(id => {
          this.announcementsService.deleteAnnouncement({ id } as Announcement).pipe(first()).subscribe(
            () => {
              this.announcements = this.announcements.filter(a => a.id !== id);
              this.selectedAnnouncements.delete(id); // Xóa ID khỏi danh sách đã chọn
            },
            (error) => {
              console.error('Error dismissing announcement', error);
            }
          );
        });
      });
    } else {
      // Nếu chỉ có một thông báo được chọn, gọi dismissAnnouncement
      const announcement = this.announcements.find(a => a.id === tasks[0]);
      if (announcement) {
        this.dismissAnnouncement(announcement);
      }
    }
  }



  expandAnnouncement(announcement: Announcement) {
    this.expandedAnnouncement = this.expandedAnnouncement === announcement.id ? undefined : announcement.id
  }




  toggleSelected(announcement: Announcement) {
    this.selectedAnnouncements.has(announcement.id)
      ? this.selectedAnnouncements.delete(announcement.id)
      : this.selectedAnnouncements.add(announcement.id)
  }

  get currentAnouncement(): Announcement[] {
    return this.announcements; // Trả về danh sách thông báo đã lấy
  }

  toggleAll(event: PointerEvent) {
    if ((event.target as HTMLInputElement).checked) {
      this.selectedAnnouncements = new Set(this.currentAnouncement.map((t) => t.id))
    } else {
      this.clearSelection()
    }
  }

  clearSelection() {
    this.togggleAll = false
    this.selectedAnnouncements.clear()
  }

  duringTabChange(navID: number) {
    this.page = 1
  }



  toggleAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval)
      this.autoRefreshInterval = null
    } else {
      this.autoRefreshInterval = setInterval(() => {
        this.loadAnnouncements();
      }, 5000)
    }
  }
}
