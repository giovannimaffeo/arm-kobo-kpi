# Generated by Django 3.2.15 on 2023-06-07 17:26

from django.db import migrations
import markdownx.models


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0010_do_nothing'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='sitewidemessage',
            name='_body_rendered',
        ),
        migrations.AlterField(
            model_name='sitewidemessage',
            name='body',
            field=markdownx.models.MarkdownxField(),
        ),
    ]
