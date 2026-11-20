from rest_framework import serializers
from .models import RegistroAuditoria


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroAuditoria
        fields = "__all__"
