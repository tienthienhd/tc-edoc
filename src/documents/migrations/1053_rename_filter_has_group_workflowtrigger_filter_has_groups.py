# Generated by Django 4.2.11 on 2024-05-29 17:58

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '1052_workflowtrigger_filter_has_group'),
    ]

    operations = [
        migrations.RenameField(
            model_name='workflowtrigger',
            old_name='filter_has_group',
            new_name='filter_has_groups',
        ),
    ]
