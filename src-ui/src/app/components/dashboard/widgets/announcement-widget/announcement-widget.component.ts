import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewContainerRef,
  Renderer2, OnInit, OnDestroy,
} from '@angular/core'
import { Folder } from '../../../../data/folder'
import { HttpClient } from '@angular/common/http'
import { FolderService } from '../../../../services/rest/folder.service'
import { DocumentListViewService } from '../../../../services/document-list-view.service'
import { ComponentWithPermissions } from '../../../with-permissions/with-permissions.component'
import { ConsumerStatusService } from '../../../../services/consumer-status.service'
import { Observable, Subscription } from 'rxjs'
import { environment } from '../../../../../environments/environment'
import { FILTER_HAS_TAGS_ALL } from '../../../../data/filter-rule-type'
import { Statistics } from '../statistics-widget/statistics-widget.component'
import { AnnouncementService } from '../../../../services/rest/announcement.service'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Router } from '@angular/router'

@Component({
  selector: 'pngx-announcement-widget',
  templateUrl: './announcement-widget.component.html',
  styleUrls: ['./announcement-widget.component.scss'],
})
export class AnnouncementWidgetComponent
  extends ComponentWithPermissions
  implements OnInit, OnDestroy {
  public activeTab: string
  public selectedTasks: Set<number> = new Set()
  public togggleAll: boolean = false
  public expandedTask: number

  public pageSize: number = 25
  public page: number = 1

  public autoRefreshInterval: any

  get dismissButtonText(): string {
    return this.selectedTasks.size > 0
      ? $localize`Dismiss selected`
      : $localize`Dismiss all`
  }

  constructor(
    public announcementService: AnnouncementService,
    private modalService: NgbModal,
    private readonly router: Router
  ) {
    super()
  }
  //
  ngOnInit() {
    // this.announcementService.reload()
    this.toggleAutoRefresh()
  }

  ngOnDestroy() {
    // this.announcementService.cancelPending()
    clearInterval(this.autoRefreshInterval)
  }
  //
  // dismissTask(task: PaperlessTask) {
  //   this.dismissTasks(task)
  // }

  // dismissTasks(task: PaperlessTask = undefined) {
  //   let tasks = task ? new Set([task.id]) : new Set(this.selectedTasks.values())
  //   if (!task && tasks.size == 0)
  //     tasks = new Set(this.tasksService.allFileTasks.map((t) => t.id))
  //   if (tasks.size > 1) {
  //     let modal = this.modalService.open(ConfirmDialogComponent, {
  //       backdrop: 'static',
  //     })
  //     modal.componentInstance.title = $localize`Confirm Dismiss All`
  //     modal.componentInstance.messageBold = $localize`Dismiss all ${tasks.size} tasks?`
  //     modal.componentInstance.btnClass = 'btn-warning'
  //     modal.componentInstance.btnCaption = $localize`Dismiss`
  //     modal.componentInstance.confirmClicked.pipe(first()).subscribe(() => {
  //       modal.componentInstance.buttonsEnabled = false
  //       modal.close()
  //       this.tasksService.dismissTasks(tasks)
  //       this.selectedTasks.clear()
  //     })
  //   } else {
  //     this.tasksService.dismissTasks(tasks)
  //     this.selectedTasks.clear()
  //   }
  // }
  //
  // dismissAndGo(task: PaperlessTask) {
  //   this.dismissTask(task)
  //   this.router.navigate(['documents', task.related_document])
  // }
  //
  // expandTask(task: PaperlessTask) {
  //   this.expandedTask = this.expandedTask == task.id ? undefined : task.id
  // }
  //
  // toggleSelected(task: PaperlessTask) {
  //   this.selectedTasks.has(task.id)
  //     ? this.selectedTasks.delete(task.id)
  //     : this.selectedTasks.add(task.id)
  // }
  //
  // get currentTasks(): PaperlessTask[] {
  //   let tasks: PaperlessTask[] = []
  //   switch (this.activeTab) {
  //     case 'queued':
  //       tasks = this.tasksService.queuedFileTasks
  //       break
  //     case 'started':
  //       tasks = this.tasksService.startedFileTasks
  //       break
  //     case 'completed':
  //       tasks = this.tasksService.completedFileTasks
  //       break
  //     case 'failed':
  //       tasks = this.tasksService.failedFileTasks
  //       break
  //   }
  //   return tasks
  // }
  //
  // toggleAll(event: PointerEvent) {
  //   if ((event.target as HTMLInputElement).checked) {
  //     this.selectedTasks = new Set(this.currentTasks.map((t) => t.id))
  //   } else {
  //     this.clearSelection()
  //   }
  // }
  //
  // clearSelection() {
  //   this.togggleAll = false
  //   this.selectedTasks.clear()
  // }
  //
  // duringTabChange(navID: number) {
  //   this.page = 1
  // }
  //
  // get activeTabLocalized(): string {
  //   switch (this.activeTab) {
  //     case 'queued':
  //       return $localize`queued`
  //     case 'started':
  //       return $localize`started`
  //     case 'completed':
  //       return $localize`completed`
  //     case 'failed':
  //       return $localize`failed`
  //   }
  // }
  //
  toggleAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval)
      this.autoRefreshInterval = null
    } else {
      this.autoRefreshInterval = setInterval(() => {
        // this.tasksService.reload()
      }, 5000)
    }
  }
}
