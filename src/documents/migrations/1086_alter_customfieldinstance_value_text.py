# Generated by Django 4.2.11 on 2024-07-12 02:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '1085_alter_customfieldinstance_value_text'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customfieldinstance',
            name='value_text',
            field=models.TextField(null=True),
        ),
    ]
