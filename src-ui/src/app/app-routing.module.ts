import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { AppFrameComponent } from './components/app-frame/app-frame.component'
import { DashboardComponent } from './components/dashboard/dashboard.component'
import { DocumentDetailComponent } from './components/document-detail/document-detail.component'
import { DocumentListComponent } from './components/document-list/document-list.component'
import { CorrespondentListComponent } from './components/manage/correspondent-list/correspondent-list.component'
import { DocumentTypeListComponent } from './components/manage/document-type-list/document-type-list.component'
import { LogsComponent } from './components/admin/logs/logs.component'
import { SettingsComponent } from './components/admin/settings/settings.component'
import { TagListComponent } from './components/manage/tag-list/tag-list.component'

import { NotFoundComponent } from './components/not-found/not-found.component'
import { DocumentAsnComponent } from './components/document-asn/document-asn.component'
import { DirtyFormGuard } from './guards/dirty-form.guard'
import { StoragePathListComponent } from './components/manage/storage-path-list/storage-path-list.component'
import { TasksComponent } from './components/admin/tasks/tasks.component'
import { PermissionsGuard } from './guards/permissions.guard'
import { DirtyDocGuard } from './guards/dirty-doc.guard'
import { DirtySavedViewGuard } from './guards/dirty-saved-view.guard'
import {
  PermissionAction,
  PermissionType,
} from './services/permissions.service'
import { WorkflowsComponent } from './components/manage/workflows/workflows.component'
import { MailComponent } from './components/manage/mail/mail.component'
import { UsersAndGroupsComponent } from './components/admin/users-groups/users-groups.component'
import { ConfigComponent } from './components/admin/config/config.component'
import { ApprovalsComponent } from './components/admin/approval/approvals.component'

import { WarehouseListComponent } from './components/manage/warehouse-list/warehouse-list.component'
import { BoxFieldsComponent } from './components/manage/box-fields/box-fields.component'


//import { CustomFieldsComponent } from './components/manage/custom-fields/custom-fields.component'
import { CustomShelfComponent } from './components/manage/custom-shelf/custom-shelf.component'
import { CustomFieldsComponent } from './components/manage/custom-fields/custom-fields.component'
import { FoldersComponent } from './components/manage/folder-list/folder-list.component'
import { SubFoldersComponent } from './components/manage/subfolder-list/subfolder-list.component'
import { DossiersComponent } from './components/manage/dossier-list/dossier-list.component'
import { DossiersFormComponent } from './components/manage/dossier-form-list/dossier-form-list.component'










export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    component: AppFrameComponent,
    canDeactivate: [DirtyDocGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },

      {
        path: 'documents',
        component: DocumentListComponent,
        canDeactivate: [DirtySavedViewGuard],
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Document,
          },
        },
      },

      {
        path: 'view/:id',
        component: DocumentListComponent,
        canDeactivate: [DirtySavedViewGuard],
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.SavedView,
          },
        },
      },
      {
        path: 'documents/:id',
        component: DocumentDetailComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Document,
          },
        },
      },
      {
        path: 'documents/:id/:section',
        component: DocumentDetailComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Document,
          },
        },
      },
      {
        path: 'asn/:id',
        component: DocumentAsnComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Document,
          },
        },
      },
      {
        path: 'tags',
        component: TagListComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Tag,
          },
        },
      },
      {
        path: 'folders',
        component: FoldersComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Folder,
          },
        },
      },
      {
        path: 'subfolders/:id',
        component: FoldersComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Folder,
          },
        },
      },
      {
        path: 'dossiers',
        component: DossiersComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Dossier,
          },
        },
      },
      {
        path: 'dossiers/:id',
        component: DossiersComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Dossier,
          },
        },
      },
      {
        path: 'box/:id',
        component: BoxFieldsComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Warehouse,
          },
        },
      },
      {
        path: 'shelf/:id',
        component: CustomShelfComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Warehouse,
          },
        },
      },
      {
        path: 'warehouses',
        component: WarehouseListComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Warehouse,
          },
        },
      },
      {
        path: 'customfields',
        component: CustomFieldsComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.CustomField,
          },
        },
      },
      {
        //   path: 'warehouses/:id',
        //   component: WarehouseListComponent,
        //   canActivate: [PermissionsGuard],
        //   data: {
        //     requiredPermission: {
        //       action: PermissionAction.View,
        //       type: PermissionType.Warehouse,
        //     },
        //   },
        // },
        // {
        //   path: 'khovatly',
        //   component: KhoVatLyComponent,
        //   canActivate: [PermissionsGuard],
        //   data: {
        //     requiredPermission: {
        //       action: PermissionAction.View,
        //       type: PermissionType.KhoVatLy,
        //     },
        //   },
        // },
        // {
        //   path: 'khovatly',
        //   component: KhoVatLyComponent,
        //   canActivate: [PermissionsGuard],
        //   data: {
        //     requiredPermission: {
        //       action: PermissionAction.View,
        //       type: PermissionType.KhoVatLy,
        //     },
        //   },
        //   children: [
        //     {
        //       path: 'warehouses',
        //       component: WarehouseListComponent,
        //       canActivate: [PermissionsGuard],
        //       data: {
        //         requiredPermission: {
        //           action: PermissionAction.View,
        //           type: PermissionType.Warehouse,
        //         },
        //       },
        //     },
        //   ],
        // },


        path: 'documenttypes',
        component: DocumentTypeListComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.DocumentType,
          },
        },
      },
      {
        path: 'correspondents',
        component: CorrespondentListComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Correspondent,
          },
        },
      },
      {
        path: 'storagepaths',
        component: StoragePathListComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.StoragePath,
          },
        },
      },
      {
        path: 'logs',
        component: LogsComponent,
        canActivate: [PermissionsGuard],
        data: {
          requireAdmin: true,
        },
      },
      // redirect old paths
      {
        path: 'settings/mail',
        redirectTo: '/mail',
      },
      {
        path: 'settings/usersgroups',
        redirectTo: '/usersgroups',
      },
      {
        path: 'settings',
        component: SettingsComponent,
        canDeactivate: [DirtyFormGuard],
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.Change,
            type: PermissionType.UISettings,
          },
        },
      },
      {
        path: 'settings/:section',
        component: SettingsComponent,
        canDeactivate: [DirtyFormGuard],
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.UISettings,
          },
        },
      },
      {
        path: 'config',
        component: ConfigComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.Change,
            type: PermissionType.AppConfig,
          },
        },
      },
      {
        path: 'dossier-form',
        component: DossiersFormComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.Change,
            type: PermissionType.DossierForm,
          },
        },
      },
      {
        path: 'dossier-form/:id',
        component: DossiersFormComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.Change,
            type: PermissionType.DossierForm,
          },
        },
      },
      {
        path: 'tasks',
        component: TasksComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.PaperlessTask,
          },
        },
      },
      {
        path: 'approvals',
        component: ApprovalsComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Approval,
          },
        },
      },
      {
        path: 'customfields',
        component: CustomFieldsComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.CustomField,
          },
        },
      },
      {
        path: 'workflows',
        component: WorkflowsComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.Workflow,
          },
        },
      },
      {
        path: 'mail',
        component: MailComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.MailAccount,
          },
        },
      },
      {
        path: 'usersgroups',
        component: UsersAndGroupsComponent,
        canActivate: [PermissionsGuard],
        data: {
          requiredPermission: {
            action: PermissionAction.View,
            type: PermissionType.User,
          },
        },
      },
    ],
  },

  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '/404', pathMatch: 'full' },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
