# Generated by Django 4.2.11 on 2024-07-26 04:08

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '1100_dossierform_url_refresh'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='dossierform',
            name='url_login',
        ),
        migrations.RemoveField(
            model_name='dossierform',
            name='url_refresh',
        ),
    ]
