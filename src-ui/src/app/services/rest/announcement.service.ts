import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'
import { first, takeUntil } from 'rxjs/operators'
import {
  PaperlessTask,
  PaperlessTaskStatus,
  PaperlessTaskType,
} from 'src/app/data/paperless-task'
import { environment } from 'src/environments/environment'
// import { Announcement, Status } from '../../data/announcement'

@Injectable({
  providedIn: 'root',
})
export class AnnouncementService {
  // private baseUrl: string = environment.apiBaseUrl
  //
  // public loading: boolean
  //
  // private announcements: Announcement[] = []
  //
  // private unsubscribeNotifer: Subject<any> = new Subject()
  //
  // public get total(): number {
  //   return this.announcements.length
  // }
  //
  // public get allAnnouncement(): Announcement[] {
  //   return this.announcements.slice(0)
  // }
  //
  // public get readNotices(): Announcement[] {
  //   return this.announcements.filter((t) => t.is_read == Status.READ)
  // }
  //
  // public get completedFileTasks(): PaperlessTask[] {
  //   return this.fileTasks.filter(
  //     (t) => t.status == PaperlessTaskStatus.Complete
  //   )
  // }
  //
  // public get failedFileTasks(): PaperlessTask[] {
  //   return this.fileTasks.filter((t) => t.status == PaperlessTaskStatus.Failed)
  // }
  //
  // constructor(private http: HttpClient) {}
  //
  // public reload() {
  //   this.loading = true
  //
  //   this.http
  //     .get<PaperlessTask[]>(`${this.baseUrl}tasks/`)
  //     .pipe(takeUntil(this.unsubscribeNotifer), first())
  //     .subscribe((r) => {
  //       this.fileTasks = r.filter((t) => t.type == PaperlessTaskType.File) // they're all File tasks, for now
  //       this.loading = false
  //     })
  // }
  //
  // public dismissTasks(task_ids: Set<number>) {
  //   this.http
  //     .post(`${this.baseUrl}acknowledge_tasks/`, {
  //       tasks: [...task_ids],
  //     })
  //     .pipe(takeUntil(this.unsubscribeNotifer), first())
  //     .subscribe((r) => {
  //       this.reload()
  //     })
  // }
  //
  // public cancelPending(): void {
  //   this.unsubscribeNotifer.next(true)
  // }
}
