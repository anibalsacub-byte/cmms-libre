from django.contrib import admin
from .models import Sintoma, ModoFalla, MecanismoFalla, CausaFalla

admin.site.register(Sintoma)
admin.site.register(ModoFalla)
admin.site.register(MecanismoFalla)
admin.site.register(CausaFalla)
