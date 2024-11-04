import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { first, takeUntil } from 'rxjs/operators'

import { environment } from 'src/environments/environment'
import { Announcement } from '../../data/announcement'
import { AbstractPaperlessService } from './abstract-paperless-service'

@Injectable({
  providedIn: 'root',
})
export class AnnouncementsService extends AbstractPaperlessService<Announcement> {
  constructor(http: HttpClient) {
    super(http, 'announcements')
  }

  patchAnnouncement(announcement: Announcement): Observable<Announcement> {
    // Tạo một đối tượng chỉ chứa trường is_read
    const updatedData = { is_read: true };

    // Gọi phương thức patch từ lớp cha với id của announcement
    return this.patch({ id: announcement.id, ...updatedData } as Announcement);
  }

  // Gọi phương thức delete từ AbstractPaperlessService
  deleteAnnouncement(announcement: Announcement): Observable<any> {
    return this.delete(announcement); // Gọi phương thức delete của lớp cha
  }

}



