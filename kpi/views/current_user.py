# coding: utf-8
from constance import config
from django.contrib.auth.models import User
from django.db import transaction
from django.utils.timezone import now
from django.utils.translation import gettext as t
from rest_framework import status, viewsets
from rest_framework.response import Response

from kobo.apps.trash_bin.utils import move_to_trash
from kpi.serializers import CurrentUserSerializer


class CurrentUserViewSet(viewsets.ModelViewSet):
    """
    <pre class="prettyprint">
    <b>GET<b> /me/
    </pre>

    > Example
    >
    >       curl -X GET https://[kpi]/me/
    >
    >       {
    >           "username": string,
    >           "first_name": string,
    >           "last_name": string,
    >           "email": string,
    >           "server_time": "YYYY-MM-DDTHH:MM:SSZ",
    >           "date_joined": "YYYY-MM-DDTHH:MM:SSZ",
    >           "projects_url": "https://[kpi]/{username}",
    >           "is_superuser": boolean,
    >           "gravatar": url,
    >           "is_staff": boolean,
    >           "last_login": "YYYY-MM-DDTHH:MM:SSZ",
    >           "extra_details": {
    >               "bio": string,
    >               "city": string,
    >               "name": string,
    >               "gender": string,
    >               "sector": string,
    >               "country": string,
    >               "twitter": string,
    >               "linkedin": string,
    >               "instagram": string,
    >               "organization": string,
    >               "require_auth": boolean,
    >               "last_ui_language": string,
    >               "organization_website": sting,
    >           },
    >           "git_rev": {
    >               "short": boolean,
    >               "long": boolean,
    >               "branch": boolean,
    >               "tag": boolean,
    >           },
    >           "social_accounts": [],
    >       }

    Update account details
    <pre class="prettyprint">
    <b>PATCH<b> /me/
    </pre>

    > Example
    >
    >       curl -X PATCH https://[kpi]/me/

    > Payload Example
    >
    >       {
    >           "first_name": "Bob",
    >           "social_accounts": [],
    >       }

    Delete the entire account
    <pre class="prettyprint">
    <b>DELETE<b> /me/
    </pre>

    >   Example
    >
    >       curl -X DELETE https://[kpi]/me/

    > Payload Example
    >
    >       {
    >           "conifrm": {user__extra_details__uid},
    >       }


    ### Current User Endpoint
    """
    queryset = User.objects.none()
    serializer_class = CurrentUserSerializer

    # TODO: Fix `social_accounts` so it's not required in PATCH request KPI#4397

    def get_object(self):
        return self.request.user

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        confirm = request.data.get('confirm')
        if confirm != user.extra_details.uid:
            return Response(
                {'detail': t('Invalid confirmation')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = {'pk': user.pk, 'username': user.username}
        # If user is already in trash, it should raise a `TrashIntegrityError`
        # but it should never happen since no non-active/trashed users should be
        # able to call this endpoint. A 403 should occur before.
        move_to_trash(
            request.user, [user], config.ACCOUNT_TRASH_GRACE_PERIOD, 'user'
        )

        with transaction.atomic():
            request.user.is_active = False
            request.user.save(update_fields=['is_active'])
            request.user.extra_details.date_removal_request = now()
            request.user.extra_details.save(
                update_fields=['date_removal_request']
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
