# Generated by Django 4.2.11 on 2024-06-02 09:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '1059_workflowtrigger_filter_has_content_type_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='workflowaction',
            name='type',
            field=models.PositiveIntegerField(choices=[(1, 'Assignment'), (2, 'Removal'), (3, 'Assignment For Approval'), (4, 'Removal For Approval')], default=1, verbose_name='Workflow Action Type'),
        ),
    ]
