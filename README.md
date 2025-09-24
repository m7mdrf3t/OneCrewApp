# One Crew - Film Production Platform

A React Native Expo app that mimics the One Crew film production platform, providing a comprehensive solution for managing film crews, projects, and talent.

## Features

- **Home Page**: Browse different service categories (Talents, Studios & Agencies, Crew, Technicians, Special Services, Academy, Legal)
- **Projects Management**: Create and manage film projects with tasks and team assignments
- **Profile System**: Detailed profiles for crew members with skills, stats, and contact information
- **Team Management**: Add/remove team members and assign them to projects
- **Search & Filter**: Search through services and profiles with filtering options
- **Tab Navigation**: Easy navigation between different sections
- **Dark/Light Theme**: Toggle between themes

## App Structure

### Main Sections
1. **Talents** - Actors, Singers, Dancers
2. **Studios & Agencies** - Production houses, agencies, locations, casting studios
3. **Crew** - Directors, producers, writers, DOPs, editors, etc.
4. **Technicians** - Camera operators, grips, gaffers, production assistants
5. **Special Services** - Printing, costume, transportation, props, makeup
6. **Academy** - Training courses and workshops
7. **Legal** - Legal services for film production

### Key Components
- **SearchBar**: Universal search component with filter options
- **SectionCard**: Displays service categories with icons
- **ServiceCard**: Shows individual services with user counts
- **ProfileCard**: Displays crew member profiles
- **TabBar**: Bottom navigation between main sections

### Pages
- **HomePage**: Main landing page with service categories
- **SectionServicesPage**: Lists services within a category
- **ProjectsPage**: Project management interface
- **ProfileDetailPage**: Detailed profile view with actions
- **SplashScreen**: App loading screen

## Technical Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for navigation
- **Expo Vector Icons** for icons
- **Safe Area Context** for proper screen handling

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on your preferred platform:
   ```bash
   npm run ios     # iOS simulator
   npm run android # Android emulator
   npm run web     # Web browser
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── SearchBar.tsx
│   ├── SectionCard.tsx
│   ├── ServiceCard.tsx
│   ├── TabBar.tsx
│   └── SplashScreen.tsx
├── pages/              # Main app pages
│   ├── HomePage.tsx
│   ├── SectionServicesPage.tsx
│   ├── ProjectsPage.tsx
│   └── ProfileDetailPage.tsx
├── data/               # Mock data and constants
│   └── mockData.ts
└── types/              # TypeScript type definitions
    └── index.ts
```

## Features Implemented

✅ **Navigation System**: Tab-based navigation with back button support
✅ **Service Categories**: All major film production service categories
✅ **Profile Management**: Detailed crew member profiles with stats and skills
✅ **Project Management**: Create and manage film projects
✅ **Team Building**: Add/remove team members and assign to projects
✅ **Search Functionality**: Search through services and profiles
✅ **Responsive Design**: Mobile-first design with proper spacing
✅ **Theme Support**: Light/dark theme toggle
✅ **Splash Screen**: Professional loading screen

## Mock Data

The app includes comprehensive mock data for:
- **Profiles**: 3 sample crew members with detailed information
- **Projects**: Sample film project with tasks and assignments
- **Services**: Complete service categories with user counts
- **Companies**: Production houses, agencies, and studios

## Future Enhancements

- Real-time messaging system
- File sharing and media gallery
- Advanced filtering and sorting
- User authentication
- Push notifications
- Offline support
- Project collaboration tools

## Development

The app is built with modern React Native practices:
- Functional components with hooks
- TypeScript for type safety
- Component-based architecture
- Responsive design principles
- Clean code organization

## License

This project is created as a demonstration of the One Crew platform functionality.
