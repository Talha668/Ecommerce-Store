from django.shortcuts import render
from django.views.generic import TemplateView





class HomeView(TemplateView):
    template_name = 'home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'E-commerce Home'
        return context
    # def get(self, request, *args, **kwargs):
    #     print("="*50)
    #     print("Homeview was accessed.")
    #     print(f"Looking for tempalets:{self.template_name}")
    #     print(f"template loaders: {self.get_template_names()}")
    #     print("="*50)
    #     return super().get(request, *args, **kwargs)