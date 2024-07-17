# Generated by Django 4.2.11 on 2024-06-01 00:00

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('documents', '1056_alter_approval_submitted_by'),
    ]

    operations = [
        migrations.AlterField(
            model_name='approval',
            name='access_type',
            field=models.CharField(choices=[(1, 'View'), (2, 'Edit'), (3, 'Owner')], editable=False, max_length=50, verbose_name='access_type'),
        ),
        migrations.AlterField(
            model_name='approval',
            name='status',
            field=models.CharField(choices=[(1, 'Pending'), (2, 'Approved'), (3, 'Revoked'), (4, 'Rejected')], editable=False, max_length=50, verbose_name='status'),
        ),
        migrations.AlterField(
            model_name='approval',
            name='submitted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='submitted_by'),
        ),
    ]
