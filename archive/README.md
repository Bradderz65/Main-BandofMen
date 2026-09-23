# Disabled account system

The original site already disabled login/signup and redirected account URLs to the home page. Its server functions were still deployable, including unauthenticated database maintenance endpoints.

The old implementation is retained here for reference only. It is excluded from the static build and Netlify's functions directory. Do not deploy it without a separate authentication and authorization review. No live database or customer accounts have been changed.
