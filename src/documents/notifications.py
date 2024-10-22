from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType

from documents.models import Announcement


def alert_users_of_permission_changes(action, object, users_to_add, groups_to_add,
                                  users_to_remove, groups_to_remove, **kwargs):
    """
    Send notifications for permission changes.
    """
    user_submit = kwargs.get('user_submit')
    announcements_list = []
    for u in users_to_add:
        announcements_list.append(Announcement(access_type=action.upper(),
                                               object_pk=object.pk,
                                               ctype=ContentType.objects.get_for_model(
                                                   object),
                                               received_by=u,
                                               submitted_by=user_submit
                                               ))
    for u in users_to_remove:
        announcements_list.append(Announcement(access_type=action.upper(),
                                               object_pk=object.pk,
                                               ctype=ContentType.objects.get_for_model(
                                                   object),
                                               received_by=u,
                                               submitted_by=user_submit
                                               ))
    group_to_add_ids = [group.id for group in groups_to_add]
    group_to_remove_ids = [group.id for group in groups_to_remove]

    groups_to_add = Group.objects.prefetch_related('user_set').filter(
        id__in=group_to_add_ids)
    groups_to_remove = Group.objects.prefetch_related('user_set').filter(
        id__in=group_to_remove_ids)
    for g in groups_to_add:
        users = g.user_set.all()
        for user in users:
            announcements_list.append(Announcement(access_type=action.upper(),
                                                   object_pk=object.pk,
                                                   ctype=ContentType.objects.get_for_model(
                                                       object),
                                                   received_by=user,
                                                   received_by_group=g,
                                                   submitted_by=user_submit,
                                                   )
                                      )
    for g in groups_to_remove:
        users = g.user_set.all()  # Không tạo thêm truy vấn
        for user in users:
            announcements_list.append(Announcement(access_type=action.upper(),
                                                   object_pk=object.pk,
                                                   ctype=ContentType.objects.get_for_model(
                                                       object),
                                                   received_by=user,
                                                   received_by_group=g,
                                                   submitted_by=user_submit,
                                                   )
                                      )
    # create notification
    announcements_list=Announcement.objects.bulk_create(announcements_list)

