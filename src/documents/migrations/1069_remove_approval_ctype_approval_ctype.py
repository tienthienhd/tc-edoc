# Generated by Django 4.2.11 on 2024-06-03 01:03

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('documents', '1068_alter_approval_object_pk'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='approval',
            name='ctype',
        ),
        migrations.AddField(
            model_name='approval',
            name='ctype',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='contenttypes.contenttype', verbose_name='content type'),
        ),
    ]
