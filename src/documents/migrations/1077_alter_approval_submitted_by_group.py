# Generated by Django 4.2.11 on 2024-06-03 07:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('documents', '1076_alter_approval_access_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='approval',
            name='submitted_by_group',
            field=models.ManyToManyField(blank=True, to='auth.group', verbose_name='submitted_by_group'),
        ),
    ]
