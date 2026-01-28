features/            # <--- THE CORE: Matches our Backend Modules
│   ├── auth/            # Login, Register, Forgot Password
│   │   ├── components/  # (LoginForm.tsx)
│   │   ├── services/    # (authService.ts - API calls)
│   │   └── types/       # (userTypes.ts)
│   │
│   ├── properties/      # Listings, Search, Details
│   │   ├── components/  # (PropertyCard.tsx, PropertyList.tsx)
│   │   ├── services/    # (propertyService.ts)
│   │   └── hooks/       # (useProperties.ts)
│   │
│   ├── maintenance/     # Maintenance requests
│   └── contracts/       # Digital contracts