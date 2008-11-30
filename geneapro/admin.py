from mysites.geneapro.models import Place, Place_Part, Place_Part_Type
from django.contrib import admin

class PlacePartInLine(admin.TabularInline):
    model = Place_Part
    extra = 3

class PlaceAdmin(admin.ModelAdmin):
	# Choose an order for fields on the admin page
	#fields = ['parentPlace', 'date']
	fieldsets = [
		(None, {'fields': ['parentPlace']}),
		('Date information', {'fields': ['date'], 'classes':['collapse']})]
	inlines = [PlacePartInLine]

admin.site.register (Place, PlaceAdmin)
admin.site.register (Place_Part_Type)
