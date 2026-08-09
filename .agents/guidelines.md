# Development Guidelines

## Testing & Configuration
- **No Test Fallbacks**: NEVER change the code or add inline fallbacks (e.g. `?? default_value`) just so that tests have something to test instead of the actual code. Tests should ALWAYS test the actual code with explicit configurations. 
- **Explicit Test State**: Tests being explicit about what configurations are needed to run a module is a positive pattern (classic dependency injection).
- **Fail Fast over Wrong State**: Fallbacks are an anti-pattern as they hide missing configurations. Errors and crashes are preferred over silent wrong state due to missing configuration values.
