# coding: utf-8
# 😇
import datetime

from django.conf import settings
from django.db import models
from markdownx.models import MarkdownxField

from kobo.apps.markdownx_uploader.models import MarkdownxUploaderFile
from kpi.fields import KpiUidField
from kpi.utils.markdown import markdownify


EPOCH_BEGINNING = datetime.datetime.utcfromtimestamp(0)


class InAppMessage(models.Model):
    """
    A message, composed in the Django admin interface, displayed to regular
    users within the application
    """
    uid = KpiUidField(uid_prefix="iam")
    title = models.CharField(max_length=255)
    snippet = MarkdownxField()
    body = MarkdownxField()
    # Could change to `django.contrib.auth.get_user_model()` in Django 1.11+
    published = models.BooleanField(
        default=False,
        help_text='When published, this message appears to all users. '
                  'It otherwise appears only to the last editor'
    )
    always_display_as_new = models.BooleanField(
        default=False,
        help_text='When enabled, this message reappears each time the '
                  'application loads, even if it has already been '
                  'acknowledged.'
    )
    # Make the author deliberately set these dates to something valid
    valid_from = models.DateTimeField(default=EPOCH_BEGINNING)
    valid_until = models.DateTimeField(default=EPOCH_BEGINNING)
    last_editor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return '{} ({})'.format(self.title, self.uid)

    @property
    def html(self):
        # TODO: Djangerz template processing...
        # Make `request.user.extra_detail` available in the context as `user`
        MARKDOWN_FIELDS_TO_CONVERT = ('snippet', 'body')
        result = {}
        for field in MARKDOWN_FIELDS_TO_CONVERT:
            result[field] = markdownify(getattr(self, field))
        return result


class InAppMessageFile(MarkdownxUploaderFile):
    class Meta:
        proxy = True


class InAppMessageUserInteractions(models.Model):
    message = models.ForeignKey(InAppMessage, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    interactions = models.JSONField(default=dict)

    class Meta:
        unique_together = ('message', 'user')

    def __str__(self):
        return '{} with {} ({}): {}'.format(
            self.user.username,
            self.message.title,
            self.message.uid,
            self.interactions,
        )
