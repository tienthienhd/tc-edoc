# Generated by Django 4.2.11 on 2024-07-31 23:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '1101_remove_dossierform_url_login_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customfieldinstance',
            name='value_text',
            field=models.TextField(null=True),
        ),
    ]
