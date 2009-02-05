from mysites.geneapro.models import *
from django.contrib import admin

class PlacePartInLine(admin.TabularInline):
    model = Place_Part
    extra = 3

class PlaceAdmin(admin.ModelAdmin):
	# Choose an order for fields on the admin page
	#fields = ['parent_place', 'date']
	fieldsets = [
		(None, {'fields': ['parent_place']}),
		('Date information', {'fields': ['date'], 'classes':['collapse']})]
	inlines = [PlacePartInLine]

class Surety_Scheme_Part_Inline (admin.TabularInline):
    model = Surety_Scheme_Part
    extra = 5
class Surety_Scheme_Admin (admin.ModelAdmin):
    inlines = [Surety_Scheme_Part_Inline]

admin.site.register (Config)
admin.site.register (Researcher)
admin.site.register (Surety_Scheme, Surety_Scheme_Admin)
#admin.site.register (Surety_Scheme_Part)
admin.site.register (Project)
admin.site.register (Researcher_Project)
admin.site.register (Research_Objective)
admin.site.register (Activity)
admin.site.register (Source_Medium)
admin.site.register (Part_Type)
admin.site.register (Place, PlaceAdmin)
admin.site.register (Place_Part_Type)
admin.site.register (Place_Part)
admin.site.register (Repository_Type)
admin.site.register (Repository)
admin.site.register (Source)
admin.site.register (Repository_Source)
admin.site.register (Search)
admin.site.register (Source_Group)
admin.site.register (Representation)
admin.site.register (Citation_Part_Type)
admin.site.register (Citation_Part)
admin.site.register (Persona)
admin.site.register (Event_Type)
admin.site.register (Event_Type_Role)
admin.site.register (Event)
admin.site.register (Characteristic_Part_Type)
admin.site.register (Characteristic)
admin.site.register (Characteristic_Part)
admin.site.register (Group_Type)
admin.site.register (Group_Type_Role)
admin.site.register (Group)
admin.site.register (P2E_Assertion)
admin.site.register (P2C_Assertion)
admin.site.register (Assertion_Assertion)
