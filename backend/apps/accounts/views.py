from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import MeSerializer, CambiarPasswordSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["password_actual"]):
            return Response(
                {"detail": "La contraseña actual no es correcta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nueva = serializer.validated_data["password_nueva"]
        try:
            validate_password(nueva, user=request.user)
        except ValidationError as exc:
            return Response({"detail": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(nueva)
        request.user.save(update_fields=["password"])

        perfil = request.user.perfil
        perfil.debe_cambiar_password = False
        perfil.save(update_fields=["debe_cambiar_password"])

        return Response(MeSerializer(request.user).data)
