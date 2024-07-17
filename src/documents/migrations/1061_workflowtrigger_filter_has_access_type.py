# Generated by Django 4.2.11 on 2024-06-02 16:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '1060_alter_workflowaction_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='workflowtrigger',
            name='filter_has_access_type',
            field=models.CharField(blank=True, choices=[('EDIT', 'Edit'), ('VIEW', 'View'), ('OWNER', 'Owner')], max_length=30, null=True, verbose_name='approval access'),
        ),
    ]
