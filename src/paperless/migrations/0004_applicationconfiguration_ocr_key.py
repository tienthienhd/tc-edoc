# Generated by Django 4.2.11 on 2024-05-22 02:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('paperless', '0003_alter_applicationconfiguration_max_image_pixels'),
    ]

    operations = [
        migrations.AddField(
            model_name='applicationconfiguration',
            name='ocr_key',
            field=models.CharField(blank=True, max_length=48, null=True, verbose_name='Sets key for advanced version'),
        ),
    ]
