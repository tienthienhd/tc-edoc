# Generated by Django 4.2.11 on 2024-08-23 08:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '1089_merge_20240712_0342'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='file_id',
            field=models.CharField(default='', editable=False, max_length=100, verbose_name='file_id'),
        ),
        migrations.AddField(
            model_name='document',
            name='request_id',
            field=models.CharField(default='', editable=False, max_length=100, verbose_name='request_id'),
        ),
    ]
