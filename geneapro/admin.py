"""
Customizes the admin pages for geneapro
"""

from mysites.geneapro import models
from django.contrib import admin

class PlacePartInLine(admin.TabularInline):
   """Customizes the edition of places"""
   model = models.Place_Part
   extra = 3
class PlaceAdmin(admin.ModelAdmin):
   """Customizes the edition of places"""
   # Choose an order for fields on the admin page
   #fields = ['parent_place', 'date']
   fieldsets = [
                (None, {'fields': ['parent_place']}),
                ('Date information', {'fields': ['date'], 'classes':['collapse']})]
   inlines = [PlacePartInLine]

class SuretySchemePartInline (admin.TabularInline):
   """Customizes the editiong of surety schemes"""
   model = models.Surety_Scheme_Part
   extra = 5
class SuretySchemeAdmin (admin.ModelAdmin):
   """Customizes the editiong of surety schemes"""
   inlines = [SuretySchemePartInline]

admin.site.register (models.Config)
admin.site.register (models.Researcher)
admin.site.register (models.Surety_Scheme, SuretySchemeAdmin)
admin.site.register (models.Project)
admin.site.register (models.Researcher_Project)
admin.site.register (models.Research_Objective)
admin.site.register (models.Activity)
admin.site.register (models.Source_Medium)
admin.site.register (models.Part_Type)
admin.site.register (models.Place, PlaceAdmin)
admin.site.register (models.Place_Part_Type)
admin.site.register (models.Place_Part)
admin.site.register (models.Repository_Type)
admin.site.register (models.Repository)
admin.site.register (models.Source)
admin.site.register (models.Repository_Source)
admin.site.register (models.Search)
admin.site.register (models.Source_Group)
admin.site.register (models.Representation)
admin.site.register (models.Citation_Part_Type)
admin.site.register (models.Citation_Part)
admin.site.register (models.Persona)
admin.site.register (models.Event_Type)
admin.site.register (models.Event_Type_Role)
admin.site.register (models.Event)
admin.site.register (models.Characteristic_Part_Type)
admin.site.register (models.Characteristic)
admin.site.register (models.Characteristic_Part)
admin.site.register (models.Group_Type)
admin.site.register (models.Group_Type_Role)
admin.site.register (models.Group)
admin.site.register (models.P2E)
admin.site.register (models.P2C)
admin.site.register (models.Assertion_Assertion)
