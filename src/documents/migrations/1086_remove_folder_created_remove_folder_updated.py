# Generated by Django 4.2.11 on 2024-07-04 01:55

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '1085_folder_created_folder_updated'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='folder',
            name='created',
        ),
        migrations.RemoveField(
            model_name='folder',
            name='updated',
        ),
    ]
